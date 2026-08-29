-- =========================================================
-- Holiday periods
-- =========================================================
CREATE TABLE IF NOT EXISTS public.holiday_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'recess' CHECK (kind IN ('recess','public_holiday','custom')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  discount_percent int NOT NULL DEFAULT 100 CHECK (discount_percent BETWEEN 0 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'sa_school_calendar',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

GRANT SELECT ON public.holiday_periods TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.holiday_periods TO authenticated;
GRANT ALL ON public.holiday_periods TO service_role;

ALTER TABLE public.holiday_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view holiday periods"
  ON public.holiday_periods FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert holiday periods"
  ON public.holiday_periods FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update holiday periods"
  ON public.holiday_periods FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete holiday periods"
  ON public.holiday_periods FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_holiday_periods_updated_at
  BEFORE UPDATE ON public.holiday_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS holiday_periods_range_idx
  ON public.holiday_periods (start_date, end_date) WHERE is_active;

-- Track the holiday reduction on each reservation
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS holiday_discount_cents int NOT NULL DEFAULT 0;

-- =========================================================
-- Seed: SA school-calendar recess periods + public holidays
-- =========================================================
INSERT INTO public.holiday_periods (name, kind, start_date, end_date, discount_percent, is_active, source)
VALUES
  ('Autumn recess (after Term 1)', 'recess', '2026-03-28', '2026-04-12', 100, true, 'sa_school_calendar'),
  ('Winter recess (after Term 2)', 'recess', '2026-06-27', '2026-07-20', 100, true, 'sa_school_calendar'),
  ('Spring recess (after Term 3)', 'recess', '2026-10-03', '2026-10-11', 100, true, 'sa_school_calendar'),
  ('Summer recess (after Term 4)', 'recess', '2026-12-10', '2027-01-13', 100, true, 'sa_school_calendar'),
  ('New Year''s Day', 'public_holiday', '2026-01-01', '2026-01-01', 100, false, 'sa_public_holidays'),
  ('Human Rights Day (observed)', 'public_holiday', '2026-03-23', '2026-03-23', 100, false, 'sa_public_holidays'),
  ('Good Friday', 'public_holiday', '2026-04-03', '2026-04-03', 100, false, 'sa_public_holidays'),
  ('Family Day', 'public_holiday', '2026-04-06', '2026-04-06', 100, false, 'sa_public_holidays'),
  ('Freedom Day', 'public_holiday', '2026-04-27', '2026-04-27', 100, false, 'sa_public_holidays'),
  ('Workers'' Day', 'public_holiday', '2026-05-01', '2026-05-01', 100, false, 'sa_public_holidays'),
  ('Youth Day', 'public_holiday', '2026-06-16', '2026-06-16', 100, false, 'sa_public_holidays'),
  ('National Women''s Day (observed)', 'public_holiday', '2026-08-10', '2026-08-10', 100, false, 'sa_public_holidays'),
  ('Heritage Day', 'public_holiday', '2026-09-24', '2026-09-24', 100, false, 'sa_public_holidays'),
  ('Day of Reconciliation', 'public_holiday', '2026-12-16', '2026-12-16', 100, false, 'sa_public_holidays'),
  ('Christmas Day', 'public_holiday', '2026-12-25', '2026-12-25', 100, false, 'sa_public_holidays'),
  ('Day of Goodwill (observed)', 'public_holiday', '2026-12-28', '2026-12-28', 100, false, 'sa_public_holidays')
ON CONFLICT DO NOTHING;

-- =========================================================
-- Holiday pricing calculator
-- =========================================================
CREATE OR REPLACE FUNCTION public.holiday_quote(_plan_id uuid, _start date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan public.meal_plans%ROWTYPE;
  _s date;
  _e date;
  _total int := 0;
  _off int := 0;
  _weighted numeric := 0;
  _disc int := 0;
  _periods jsonb := '[]'::jsonb;
BEGIN
  SELECT * INTO _plan FROM public.meal_plans WHERE id = _plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_plan');
  END IF;

  _s := COALESCE(_start, (now() AT TIME ZONE 'Africa/Johannesburg')::date);
  _e := _s + (GREATEST(_plan.duration_days, 1) - 1);

  WITH days AS (
    SELECT d::date AS d
    FROM generate_series(_s, _e, interval '1 day') AS g(d)
    WHERE EXTRACT(isodow FROM d)::int = ANY (_plan.allowed_weekdays)
  ), matched AS (
    SELECT days.d,
           MAX(h.discount_percent) AS pct
    FROM days
    LEFT JOIN public.holiday_periods h
      ON h.is_active AND days.d BETWEEN h.start_date AND h.end_date
    GROUP BY days.d
  )
  SELECT COUNT(*)::int,
         COUNT(*) FILTER (WHERE pct IS NOT NULL)::int,
         COALESCE(SUM(COALESCE(pct, 0) / 100.0), 0)
  INTO _total, _off, _weighted
  FROM matched;

  IF _total > 0 AND _weighted > 0 THEN
    _disc := LEAST(_plan.price_cents, ROUND(_plan.price_cents::numeric * _weighted / _total)::int);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', h.id, 'name', h.name, 'kind', h.kind,
           'start_date', h.start_date, 'end_date', h.end_date,
           'discount_percent', h.discount_percent
         ) ORDER BY h.start_date), '[]'::jsonb)
  INTO _periods
  FROM public.holiday_periods h
  WHERE h.is_active AND h.start_date <= _e AND h.end_date >= _s;

  RETURN jsonb_build_object(
    'ok', true,
    'plan_id', _plan.id,
    'cycle_start', _s,
    'cycle_end', _e,
    'service_days', _total,
    'holiday_days', _off,
    'price_cents', _plan.price_cents,
    'discount_cents', _disc,
    'final_cents', GREATEST(_plan.price_cents - _disc, 0),
    'periods', _periods
  );
END $$;

GRANT EXECUTE ON FUNCTION public.holiday_quote(uuid, date) TO authenticated, anon;

-- Quotes for every active plan (used by the plan selector)
CREATE OR REPLACE FUNCTION public.plan_holiday_quotes()
RETURNS TABLE(plan_id uuid, price_cents int, discount_cents int, final_cents int,
              service_days int, holiday_days int)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT mp.id,
         (q->>'price_cents')::int,
         (q->>'discount_cents')::int,
         (q->>'final_cents')::int,
         (q->>'service_days')::int,
         (q->>'holiday_days')::int
  FROM public.meal_plans mp
  CROSS JOIN LATERAL public.holiday_quote(mp.id) AS q
  WHERE mp.is_active;
$$;

GRANT EXECUTE ON FUNCTION public.plan_holiday_quotes() TO authenticated, anon;

-- Current / upcoming holidays for the student banner
CREATE OR REPLACE FUNCTION public.upcoming_holidays(_days_ahead int DEFAULT 60)
RETURNS TABLE(id uuid, name text, kind text, start_date date, end_date date,
              discount_percent int, is_current boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT h.id, h.name, h.kind, h.start_date, h.end_date, h.discount_percent,
         ((now() AT TIME ZONE 'Africa/Johannesburg')::date BETWEEN h.start_date AND h.end_date)
  FROM public.holiday_periods h
  WHERE h.is_active
    AND h.end_date >= (now() AT TIME ZONE 'Africa/Johannesburg')::date
    AND h.start_date <= (now() AT TIME ZONE 'Africa/Johannesburg')::date + COALESCE(_days_ahead, 60)
  ORDER BY h.start_date;
$$;

GRANT EXECUTE ON FUNCTION public.upcoming_holidays(int) TO authenticated, anon;

-- =========================================================
-- Apply holiday pricing when a plan is reserved
-- =========================================================
CREATE OR REPLACE FUNCTION public.create_pending_subscription(_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _plan public.meal_plans%ROWTYPE;
  _taken int;
  _status jsonb;
  _id uuid;
  _old uuid;
  _quote jsonb;
  _hol int := 0;
  _amount int;
  _today date := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  PERFORM public.expire_due_subscriptions();

  _status := public.payment_window_status();
  IF (_status->>'is_open')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'window_closed', 'opens_at', _status->>'opens_at');
  END IF;

  SELECT * INTO _plan FROM public.meal_plans WHERE id = _plan_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_plan');
  END IF;

  IF EXISTS (SELECT 1 FROM public.subscriptions
             WHERE user_id = _uid
               AND status = 'active' AND (end_date IS NULL OR end_date >= _today)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_subscribed');
  END IF;

  FOR _old IN SELECT id FROM public.subscriptions WHERE user_id = _uid AND status = 'pending' LOOP
    PERFORM public.release_pending_subscription(_old);
  END LOOP;

  IF _plan.capacity IS NOT NULL THEN
    SELECT count(*)::int INTO _taken FROM public.subscriptions s
      WHERE s.plan_id = _plan.id
        AND ((s.status = 'active' AND (s.end_date IS NULL OR s.end_date >= _today))
             OR (_plan.count_pending AND s.status = 'pending'));
    IF _taken >= _plan.capacity THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'plan_full');
    END IF;
  END IF;

  _quote := public.holiday_quote(_plan.id, _today);
  _hol := COALESCE((_quote->>'discount_cents')::int, 0);
  _amount := GREATEST(_plan.price_cents - _hol, 0);

  INSERT INTO public.subscriptions (user_id, plan_id, amount_cents, status, holiday_discount_cents)
  VALUES (_uid, _plan.id, _amount, 'pending', _hol)
  RETURNING id INTO _id;

  PERFORM public.apply_wallet_credit_to_subscription(_id);

  RETURN jsonb_build_object('ok', true, 'subscription_id', _id, 'holiday_discount_cents', _hol);
END $function$;

-- =========================================================
-- Pending payments: expose the holiday reduction
-- =========================================================
DROP FUNCTION IF EXISTS public.admin_pending_payments(integer);
CREATE OR REPLACE FUNCTION public.admin_pending_payments(_limit integer DEFAULT 100)
RETURNS TABLE(subscription_id uuid, user_id uuid, name text, surname text, email text,
              student_number text, plan_name text, plan_price_cents integer, amount_cents integer,
              offer_discount_cents integer, wallet_discount_cents integer,
              holiday_discount_cents integer, offer_codes text[], created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    s.id,
    s.user_id,
    p.name,
    p.surname,
    p.email,
    p.student_number,
    mp.name,
    mp.price_cents,
    s.amount_cents,
    COALESCE((SELECT SUM(o.applied_cents)::int FROM public.offer_redemptions o WHERE o.subscription_id = s.id), 0),
    COALESCE((SELECT SUM(-w.delta_cents)::int FROM public.wallet_transactions w WHERE w.reference_id = s.id AND w.delta_cents < 0), 0),
    COALESCE(s.holiday_discount_cents, 0),
    COALESCE((SELECT array_agg(off.code) FROM public.offer_redemptions o2 JOIN public.offers off ON off.id = o2.offer_id WHERE o2.subscription_id = s.id), '{}'::text[]),
    s.created_at
  FROM public.subscriptions s
  JOIN public.meal_plans mp ON mp.id = s.plan_id
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.status = 'pending'
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY s.created_at DESC
  LIMIT COALESCE(_limit, 100);
$function$;