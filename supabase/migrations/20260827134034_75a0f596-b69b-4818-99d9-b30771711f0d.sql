-- Release a pending subscription and refund any credits/offers applied to it
CREATE OR REPLACE FUNCTION public.release_pending_subscription(_subscription_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub public.subscriptions%ROWTYPE;
  _wallet_used int;
  _o record;
BEGIN
  SELECT * INTO _sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;
  IF _sub.user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF _sub.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_pending');
  END IF;

  -- Refund wallet credit that was applied at checkout (net of any prior refunds)
  SELECT COALESCE(SUM(-delta_cents), 0) INTO _wallet_used
  FROM public.wallet_transactions
  WHERE reference_id = _subscription_id AND reason IN ('checkout_redeem', 'checkout_refund');

  IF _wallet_used > 0 THEN
    PERFORM public.credit_wallet(_sub.user_id, _wallet_used, 'checkout_refund', _subscription_id,
      'Refund on released reservation');
  END IF;

  -- Reverse offer redemptions tied to this reservation
  FOR _o IN SELECT * FROM public.offer_redemptions WHERE subscription_id = _subscription_id LOOP
    UPDATE public.offers
       SET current_redemptions = GREATEST(0, current_redemptions - 1)
     WHERE id = _o.offer_id;
  END LOOP;
  DELETE FROM public.offer_redemptions WHERE subscription_id = _subscription_id;

  UPDATE public.subscriptions
     SET status = 'cancelled', updated_at = now()
   WHERE id = _subscription_id;

  RETURN jsonb_build_object('ok', true, 'refunded_cents', _wallet_used);
END $$;

GRANT EXECUTE ON FUNCTION public.release_pending_subscription(uuid) TO authenticated;

-- Recreate reservation flow: replace old pending (with refund) instead of blocking,
-- and automatically re-apply available wallet credit to the new reservation.
CREATE OR REPLACE FUNCTION public.create_pending_subscription(_plan_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _plan public.meal_plans%ROWTYPE;
  _taken int;
  _status jsonb;
  _id uuid;
  _old uuid;
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

  -- Release every existing pending reservation (refunds credits back to wallet)
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

  INSERT INTO public.subscriptions (user_id, plan_id, amount_cents, status)
  VALUES (_uid, _plan.id, _plan.price_cents, 'pending')
  RETURNING id INTO _id;

  -- Carry the student's wallet credit over to the new reservation
  PERFORM public.apply_wallet_credit_to_subscription(_id);

  RETURN jsonb_build_object('ok', true, 'subscription_id', _id);
END $$;
