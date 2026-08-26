ALTER FUNCTION public.referral_reward_for_count(integer) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.payment_window_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.plan_availability() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_pending_subscription(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_payment_window(boolean, text, integer[], time, time) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_plan_cap(uuid, integer, boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_all_plan_caps(integer, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_promote_planned_caps() FROM anon;