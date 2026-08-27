CREATE OR REPLACE FUNCTION public.admin_user_detail(_target_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p record;
  _result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'kitchen')) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO _p FROM public.profiles WHERE user_id = _target_user;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  _result := jsonb_build_object(
    'ok', true,
    'profile', jsonb_build_object(
      'user_id', _p.user_id,
      'name', _p.name,
      'surname', _p.surname,
      'email', _p.email,
      'student_number', _p.student_number,
      'primary_phone', _p.primary_phone,
      'secondary_phone', _p.secondary_phone,
      'emergency_contact_name', _p.emergency_contact_name,
      'emergency_contact_phone', _p.emergency_contact_phone,
      'avatar_url', _p.avatar_url,
      'qr_code_pass', _p.qr_code_pass,
      'tier', _p.tier,
      'wallet_balance_cents', _p.discount_wallet_balance_cents,
      'created_at', _p.created_at
    ),
    'roles', COALESCE((
      SELECT jsonb_agg(ur.role ORDER BY ur.role) FROM public.user_roles ur WHERE ur.user_id = _target_user
    ), '[]'::jsonb),
    'subscriptions', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'created_at' DESC) FROM (
        SELECT jsonb_build_object(
          'id', s.id,
          'status', s.status,
          'plan_name', mp.name,
          'plan_code', mp.code,
          'amount_cents', s.amount_cents,
          'start_date', s.start_date,
          'end_date', s.end_date,
          'activated_at', s.activated_at,
          'created_at', s.created_at
        ) AS x
        FROM public.subscriptions s
        JOIN public.meal_plans mp ON mp.id = s.plan_id
        WHERE s.user_id = _target_user
        ORDER BY s.created_at DESC
        LIMIT 20
      ) sub
    ), '[]'::jsonb),
    'recent_redemptions', COALESCE((
      SELECT jsonb_agg(y ORDER BY y->>'redeemed_at' DESC) FROM (
        SELECT jsonb_build_object(
          'id', r.id,
          'redeemed_on', r.redeemed_on,
          'redeemed_at', r.redeemed_at,
          'slot_label', ms.label
        ) AS y
        FROM public.meal_redemptions r
        LEFT JOIN public.meal_slots ms ON ms.id = r.slot_id
        WHERE r.user_id = _target_user
        ORDER BY r.redeemed_at DESC
        LIMIT 10
      ) red
    ), '[]'::jsonb),
    'meals_total', (SELECT count(*) FROM public.meal_redemptions r WHERE r.user_id = _target_user),
    'referrals', jsonb_build_object(
      'paid', (SELECT count(*) FROM public.referrals rf WHERE rf.referrer_user_id = _target_user AND rf.status = 'paid'),
      'pending', (SELECT count(*) FROM public.referrals rf WHERE rf.referrer_user_id = _target_user AND rf.status <> 'paid')
    )
  );

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_detail(uuid) TO authenticated;