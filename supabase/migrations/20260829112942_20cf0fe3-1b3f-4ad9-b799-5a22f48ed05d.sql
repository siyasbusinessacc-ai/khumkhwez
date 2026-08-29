ALTER FUNCTION public.holiday_quote(uuid, date) SECURITY INVOKER;
ALTER FUNCTION public.plan_holiday_quotes() SECURITY INVOKER;
ALTER FUNCTION public.upcoming_holidays(int) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.holiday_quote(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.plan_holiday_quotes() FROM anon;
REVOKE EXECUTE ON FUNCTION public.upcoming_holidays(int) FROM anon;