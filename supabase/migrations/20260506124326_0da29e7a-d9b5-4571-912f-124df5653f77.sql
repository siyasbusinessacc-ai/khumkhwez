
-- =====================================================
-- 1. SLOT BOOKINGS (student-side reservations)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.slot_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slot_id UUID NOT NULL,
  booking_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved', -- reserved | served | cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, booking_date)
);

CREATE INDEX IF NOT EXISTS idx_slot_bookings_slot_date ON public.slot_bookings(slot_id, booking_date) WHERE status = 'reserved';

ALTER TABLE public.slot_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own bookings"
  ON public.slot_bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'kitchen') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage bookings"
  ON public.slot_bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Available slots for a given date (returns remaining seats considering reserved bookings)
CREATE OR REPLACE FUNCTION public.list_slots_for_date(_date DATE)
RETURNS TABLE (
  id UUID, label TEXT, start_time TIME, end_time TIME,
  capacity INT, booked INT, remaining INT, weekdays INT[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.label, s.start_time, s.end_time, s.capacity,
    COALESCE((SELECT count(*)::int FROM public.slot_bookings b
      WHERE b.slot_id = s.id AND b.booking_date = _date AND b.status = 'reserved'),0) AS booked,
    s.capacity - COALESCE((SELECT count(*)::int FROM public.slot_bookings b
      WHERE b.slot_id = s.id AND b.booking_date = _date AND b.status = 'reserved'),0) AS remaining,
    s.weekdays
  FROM public.meal_slots s
  WHERE s.is_active = true
    AND EXTRACT(ISODOW FROM _date)::int = ANY(s.weekdays)
  ORDER BY s.start_time;
$$;

-- Book a slot (one per student per day, must have active subscription, capacity-checked)
CREATE OR REPLACE FUNCTION public.book_slot(_slot_id UUID, _date DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _slot public.meal_slots%ROWTYPE;
  _used INT;
  _has_sub BOOL;
  _existing UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.subscriptions
    WHERE user_id = _uid AND status = 'active'
      AND (end_date IS NULL OR end_date >= _date)
      AND (start_date IS NULL OR start_date <= _date))
  INTO _has_sub;
  IF NOT _has_sub THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_active_subscription');
  END IF;

  SELECT * INTO _slot FROM public.meal_slots WHERE id = _slot_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_slot');
  END IF;
  IF NOT (EXTRACT(ISODOW FROM _date)::int = ANY(_slot.weekdays)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_not_on_day');
  END IF;

  SELECT id INTO _existing FROM public.slot_bookings
    WHERE user_id = _uid AND booking_date = _date AND status = 'reserved';
  IF _existing IS NOT NULL THEN
    UPDATE public.slot_bookings SET status = 'cancelled' WHERE id = _existing;
  END IF;

  SELECT count(*) INTO _used FROM public.slot_bookings
    WHERE slot_id = _slot_id AND booking_date = _date AND status = 'reserved';
  IF _used >= _slot.capacity THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'slot_full');
  END IF;

  INSERT INTO public.slot_bookings(user_id, slot_id, booking_date)
  VALUES (_uid, _slot_id, _date);

  RETURN jsonb_build_object('ok', true, 'slot_label', _slot.label);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_my_booking(_date DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.slot_bookings SET status = 'cancelled'
    WHERE user_id = _uid AND booking_date = _date AND status = 'reserved';
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.my_upcoming_bookings()
RETURNS TABLE (id UUID, slot_id UUID, slot_label TEXT, start_time TIME, end_time TIME, booking_date DATE, status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, s.id, s.label, s.start_time, s.end_time, b.booking_date, b.status
  FROM public.slot_bookings b
  JOIN public.meal_slots s ON s.id = b.slot_id
  WHERE b.user_id = auth.uid()
    AND b.booking_date >= (now() AT TIME ZONE 'Africa/Johannesburg')::date
    AND b.status = 'reserved'
  ORDER BY b.booking_date, s.start_time;
$$;

-- Update kitchen scan to mark booking served
CREATE OR REPLACE FUNCTION public.serve_meal_by_pass_with_slot(_pass_code text, _slot_id uuid, _kitchen_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _verdict jsonb;
  _sub_id uuid; _user_id uuid;
  _today date := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
  _today_iso int := EXTRACT(ISODOW FROM _today)::int;
  _slot public.meal_slots%ROWTYPE;
  _used int;
  _booking RECORD;
BEGIN
  IF NOT (public.has_role(auth.uid(),'kitchen') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Forbidden: kitchen or admin only';
  END IF;

  SELECT * INTO _slot FROM public.meal_slots WHERE id = _slot_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'status', 'invalid_slot', 'message', 'Slot not found or inactive');
  END IF;
  IF NOT (_today_iso = ANY(_slot.weekdays)) THEN
    RETURN jsonb_build_object('ok', false, 'status', 'slot_unavailable', 'message', 'Slot not active today');
  END IF;

  SELECT count(*) INTO _used FROM public.meal_redemptions WHERE slot_id = _slot_id AND redeemed_on = _today;
  IF _used >= _slot.capacity THEN
    RETURN jsonb_build_object('ok', false, 'status', 'slot_full',
      'message', 'Slot at capacity (' || _slot.capacity || ')');
  END IF;

  _verdict := public.verify_pass(_pass_code);
  IF (_verdict->>'ok')::boolean IS NOT TRUE THEN RETURN _verdict; END IF;

  _sub_id := (_verdict->>'subscription_id')::uuid;
  _user_id := (_verdict->>'user_id')::uuid;

  -- Check booking (warn but don't block)
  SELECT b.id, b.slot_id INTO _booking FROM public.slot_bookings b
    WHERE b.user_id = _user_id AND b.booking_date = _today AND b.status = 'reserved';

  BEGIN
    INSERT INTO public.meal_redemptions (user_id, subscription_id, redeemed_by, slot_id)
    VALUES (_user_id, _sub_id, COALESCE(_kitchen_user_id, auth.uid()), _slot_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_set(jsonb_set(_verdict,'{ok}','false'::jsonb),'{status}','"already_served"'::jsonb)
      || jsonb_build_object('message','Already served today');
  END;

  IF _booking.id IS NOT NULL THEN
    UPDATE public.slot_bookings SET status = 'served' WHERE id = _booking.id;
  END IF;

  RETURN _verdict || jsonb_build_object(
    'message', CASE WHEN _booking.id IS NULL THEN 'Meal recorded (no booking)'
                    WHEN _booking.slot_id <> _slot_id THEN 'Meal recorded (different slot booked)'
                    ELSE 'Meal recorded' END,
    'slot_label', _slot.label,
    'had_booking', _booking.id IS NOT NULL,
    'booking_matched', _booking.slot_id = _slot_id
  );
END $function$;

-- =====================================================
-- 2. WEEKLY MENU
-- =====================================================
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_date ON public.menu_items(menu_date);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Menus readable by all auth users"
  ON public.menu_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage menus"
  ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for menu images (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Menu images publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');

CREATE POLICY "Admins upload menu images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins update menu images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images' AND public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins delete menu images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images' AND public.has_role(auth.uid(),'admin'));

-- Menu fetch helpers
CREATE OR REPLACE FUNCTION public.menu_for_week(_week_start DATE)
RETURNS TABLE (id UUID, menu_date DATE, title TEXT, description TEXT, image_url TEXT, sort_order INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, menu_date, title, description, image_url, sort_order
  FROM public.menu_items
  WHERE menu_date >= _week_start AND menu_date < _week_start + 7
  ORDER BY menu_date, sort_order, created_at;
$$;

-- =====================================================
-- 3. OFFER NOTIFICATION HELPER
-- =====================================================
CREATE OR REPLACE FUNCTION public.admin_create_offer_broadcast(
  _offer_code TEXT, _title TEXT, _body TEXT,
  _target TEXT DEFAULT 'all', _target_tier user_tier DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  INSERT INTO public.broadcasts(title, body, target, target_tier, created_by)
  VALUES (_title, _body, _target, _target_tier, auth.uid())
  RETURNING id INTO _id;
  RETURN jsonb_build_object('ok', true, 'id', _id);
END $$;
