
-- 1) Expire subscriptions whose end date has passed
CREATE OR REPLACE FUNCTION public.expire_due_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
  _n int;
BEGIN
  UPDATE public.subscriptions
     SET status = 'expired', updated_at = now()
   WHERE status = 'active'
     AND end_date IS NOT NULL
     AND end_date < _today;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.expire_due_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_due_subscriptions() TO authenticated, service_role;

-- 2) Availability ignores finished plans
CREATE OR REPLACE FUNCTION public.plan_availability()
RETURNS TABLE(plan_id uuid, capacity integer, taken integer, remaining integer, sold_out boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
BEGIN
  RETURN QUERY
  WITH counts AS (
    SELECT mp.id AS pid,
           mp.capacity AS cap,
           COALESCE((SELECT count(*)::int FROM public.subscriptions s
              WHERE s.plan_id = mp.id
                AND ((s.status = 'active' AND (s.end_date IS NULL OR s.end_date >= _today))
                     OR (mp.count_pending AND s.status = 'pending'))),0) AS taken
    FROM public.meal_plans mp
  )
  SELECT c.pid, c.cap, c.taken,
         CASE WHEN c.cap IS NULL THEN NULL ELSE GREATEST(0, c.cap - c.taken) END,
         CASE WHEN c.cap IS NULL THEN false ELSE c.taken >= c.cap END
  FROM counts c;
END $$;

REVOKE ALL ON FUNCTION public.plan_availability() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plan_availability() TO authenticated, service_role;

-- 3) Reservation: expire first, and don't block users whose plan already ended
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
               AND (status = 'pending'
                    OR (status = 'active' AND (end_date IS NULL OR end_date >= _today)))) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_subscribed');
  END IF;

  IF _plan.capacity IS NOT NULL THEN
    SELECT count(*)::int INTO _taken FROM public.subscriptions s
      WHERE s.plan_id = _plan.id
        AND ((s.status = 'active' AND (s.end_date IS NULL OR s.end_date >= _today))
             OR (_plan.count_pending AND s.status = 'pending'));
    IF _taken >= _plan.capacity THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'plan_full');
    END IF;
  END IF;

  INSERT INTO public.subscriptions (user_id, plan_id, amount_cents, status)
  VALUES (_uid, _plan.id, _plan.price_cents, 'pending')
  RETURNING id INTO _id;

  RETURN jsonb_build_object('ok', true, 'subscription_id', _id);
END $$;

-- 4) Admin stats ignore finished plans
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
  _week_start date := _today - 6;
  _meals_today int;
  _meals_week int;
  _active_subs int;
  _pending_subs int;
  _total_students int;
  _revenue_cents bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT count(*) INTO _meals_today FROM public.meal_redemptions WHERE redeemed_on = _today;
  SELECT count(*) INTO _meals_week  FROM public.meal_redemptions WHERE redeemed_on >= _week_start;
  SELECT count(*) INTO _active_subs FROM public.subscriptions
    WHERE status = 'active' AND (end_date IS NULL OR end_date >= _today);
  SELECT count(*) INTO _pending_subs FROM public.subscriptions WHERE status = 'pending';
  SELECT count(*) INTO _total_students FROM public.profiles;
  SELECT COALESCE(sum(amount_cents), 0) INTO _revenue_cents
    FROM public.subscriptions
    WHERE status = 'active' AND activated_at >= (date_trunc('month', now()));

  RETURN jsonb_build_object(
    'meals_today', _meals_today,
    'meals_week', _meals_week,
    'active_subscriptions', _active_subs,
    'pending_subscriptions', _pending_subs,
    'total_students', _total_students,
    'month_revenue_cents', _revenue_cents
  );
END $$;
