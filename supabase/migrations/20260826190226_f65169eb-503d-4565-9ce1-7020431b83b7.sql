-- 1. Payment window (single row)
CREATE TABLE public.payment_windows (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  is_enabled boolean NOT NULL DEFAULT true,
  mode text NOT NULL DEFAULT 'scheduled' CHECK (mode IN ('scheduled','always_open','always_closed')),
  open_days integer[] NOT NULL DEFAULT '{25,26,27,28,29,30,31,1}',
  open_time time NOT NULL DEFAULT '08:00',
  close_time time NOT NULL DEFAULT '22:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_windows TO authenticated;
GRANT ALL ON public.payment_windows TO service_role;

ALTER TABLE public.payment_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Window readable" ON public.payment_windows
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage window" ON public.payment_windows
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_payment_windows_updated
  BEFORE UPDATE ON public.payment_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_windows (id) VALUES (true) ON CONFLICT DO NOTHING;

-- 2. Plan caps
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS count_pending boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS planned_capacity integer;

-- 3. Window status
CREATE OR REPLACE FUNCTION public.payment_window_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  w public.payment_windows%ROWTYPE;
  tz text := 'Africa/Johannesburg';
  now_local timestamp := (now() AT TIME ZONE tz);
  d date;
  i int;
  is_open boolean := false;
  opens_at timestamp;
  closes_at timestamp;
  eff_day int;
  last_day int;
  matched boolean;
BEGIN
  SELECT * INTO w FROM public.payment_windows LIMIT 1;
  IF NOT FOUND OR NOT w.is_enabled OR w.mode = 'always_open' THEN
    RETURN jsonb_build_object('is_open', true, 'mode', COALESCE(w.mode,'always_open'),
      'reason','always_open','opens_at',null,'closes_at',null,'now_local', now_local);
  END IF;
  IF w.mode = 'always_closed' THEN
    RETURN jsonb_build_object('is_open', false, 'mode','always_closed',
      'reason','always_closed','opens_at',null,'closes_at',null,'now_local', now_local);
  END IF;

  -- scan today + next 400 days for open/close boundaries
  FOR i IN 0..400 LOOP
    d := (now_local::date) + i;
    last_day := EXTRACT(DAY FROM (date_trunc('month', d) + interval '1 month - 1 day'))::int;
    matched := false;
    FOREACH eff_day IN ARRAY w.open_days LOOP
      IF eff_day = EXTRACT(DAY FROM d)::int
         OR (eff_day > last_day AND EXTRACT(DAY FROM d)::int = last_day) THEN
        matched := true;
      END IF;
    END LOOP;

    IF matched THEN
      IF i = 0 AND now_local >= (d + w.open_time) AND now_local < (d + w.close_time) THEN
        is_open := true;
        closes_at := d + w.close_time;
        EXIT;
      END IF;
      IF (d + w.open_time) > now_local THEN
        opens_at := d + w.open_time;
        closes_at := d + w.close_time;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'is_open', is_open,
    'mode', w.mode,
    'reason', CASE WHEN is_open THEN 'in_window' ELSE 'out_of_window' END,
    'opens_at', opens_at,
    'closes_at', closes_at,
    'now_local', now_local,
    'open_days', w.open_days,
    'open_time', w.open_time,
    'close_time', w.close_time
  );
END $$;

-- 4. Plan availability
CREATE OR REPLACE FUNCTION public.plan_availability()
RETURNS TABLE(plan_id uuid, capacity integer, taken integer, remaining integer, sold_out boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT mp.id,
         mp.capacity,
         COALESCE((SELECT count(*)::int FROM public.subscriptions s
            WHERE s.plan_id = mp.id
              AND (s.status = 'active' OR (mp.count_pending AND s.status = 'pending'))),0),
         CASE WHEN mp.capacity IS NULL THEN NULL
              ELSE GREATEST(0, mp.capacity - COALESCE((SELECT count(*)::int FROM public.subscriptions s
                WHERE s.plan_id = mp.id
                  AND (s.status = 'active' OR (mp.count_pending AND s.status = 'pending'))),0)) END,
         CASE WHEN mp.capacity IS NULL THEN false
              ELSE COALESCE((SELECT count(*)::int FROM public.subscriptions s
                WHERE s.plan_id = mp.id
                  AND (s.status = 'active' OR (mp.count_pending AND s.status = 'pending'))),0) >= mp.capacity END
  FROM public.meal_plans mp;
$$;

-- 5. Guarded pending subscription creation
CREATE OR REPLACE FUNCTION public.create_pending_subscription(_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan public.meal_plans%ROWTYPE;
  _taken int;
  _status jsonb;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  _status := public.payment_window_status();
  IF (_status->>'is_open')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'window_closed', 'opens_at', _status->>'opens_at');
  END IF;

  SELECT * INTO _plan FROM public.meal_plans WHERE id = _plan_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_plan');
  END IF;

  IF EXISTS (SELECT 1 FROM public.subscriptions
             WHERE user_id = _uid AND status IN ('pending','active')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_subscribed');
  END IF;

  IF _plan.capacity IS NOT NULL THEN
    SELECT count(*)::int INTO _taken FROM public.subscriptions s
      WHERE s.plan_id = _plan.id
        AND (s.status = 'active' OR (_plan.count_pending AND s.status = 'pending'));
    IF _taken >= _plan.capacity THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'plan_full');
    END IF;
  END IF;

  INSERT INTO public.subscriptions (user_id, plan_id, amount_cents, status)
  VALUES (_uid, _plan.id, _plan.price_cents, 'pending')
  RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'subscription_id', _id);
END $$;

-- 6. Admin setters
CREATE OR REPLACE FUNCTION public.admin_set_payment_window(
  _is_enabled boolean, _mode text, _open_days integer[], _open_time time, _close_time time)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden: admin only'; END IF;
  IF _mode NOT IN ('scheduled','always_open','always_closed') THEN
    RETURN jsonb_build_object('ok', false, 'reason','invalid_mode');
  END IF;
  UPDATE public.payment_windows
    SET is_enabled = _is_enabled, mode = _mode,
        open_days = COALESCE(_open_days, open_days),
        open_time = COALESCE(_open_time, open_time),
        close_time = COALESCE(_close_time, close_time);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_plan_cap(
  _plan_id uuid, _capacity integer, _count_pending boolean DEFAULT NULL, _planned_capacity integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden: admin only'; END IF;
  UPDATE public.meal_plans
    SET capacity = _capacity,
        count_pending = COALESCE(_count_pending, count_pending),
        planned_capacity = COALESCE(_planned_capacity, planned_capacity)
    WHERE id = _plan_id;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_all_plan_caps(_capacity integer, _planned boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden: admin only'; END IF;
  IF _planned THEN
    UPDATE public.meal_plans SET planned_capacity = _capacity WHERE is_active = true;
  ELSE
    UPDATE public.meal_plans SET capacity = _capacity WHERE is_active = true;
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_promote_planned_caps()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden: admin only'; END IF;
  UPDATE public.meal_plans SET capacity = planned_capacity WHERE planned_capacity IS NOT NULL;
  RETURN jsonb_build_object('ok', true);
END $$;

-- 7. Force purchases through the RPC
DROP POLICY IF EXISTS "Users can insert their own pending subscriptions" ON public.subscriptions;
