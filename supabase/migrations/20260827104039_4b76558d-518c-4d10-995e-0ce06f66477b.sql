CREATE OR REPLACE FUNCTION public.admin_pending_payments(_limit integer DEFAULT 100)
RETURNS TABLE(
  subscription_id uuid,
  user_id uuid,
  name text,
  surname text,
  email text,
  student_number text,
  plan_name text,
  plan_price_cents integer,
  amount_cents integer,
  offer_discount_cents integer,
  wallet_discount_cents integer,
  offer_codes text[],
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    COALESCE((SELECT array_agg(off.code) FROM public.offer_redemptions o2 JOIN public.offers off ON off.id = o2.offer_id WHERE o2.subscription_id = s.id), '{}'::text[]),
    s.created_at
  FROM public.subscriptions s
  JOIN public.meal_plans mp ON mp.id = s.plan_id
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  WHERE s.status = 'pending'
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY s.created_at DESC
  LIMIT COALESCE(_limit, 100);
$$;

REVOKE ALL ON FUNCTION public.admin_pending_payments(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_pending_payments(integer) TO authenticated;