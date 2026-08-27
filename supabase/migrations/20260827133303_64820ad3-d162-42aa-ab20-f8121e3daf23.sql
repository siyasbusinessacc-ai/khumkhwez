ALTER TABLE public.broadcasts
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.list_my_broadcasts();

CREATE FUNCTION public.list_my_broadcasts()
RETURNS TABLE(id uuid, title text, body text, created_at timestamp with time zone, expires_at timestamp with time zone, is_pinned boolean, is_read boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT b.id, b.title, b.body, b.created_at, b.expires_at, b.is_pinned,
    EXISTS(SELECT 1 FROM public.broadcast_reads r WHERE r.user_id = auth.uid() AND r.broadcast_id = b.id) AS is_read
  FROM public.broadcasts b
  WHERE (b.expires_at IS NULL OR b.expires_at > now())
    AND (
      b.target = 'all'
      OR (b.target = 'tier' AND b.target_tier = (SELECT tier FROM public.profiles WHERE user_id = auth.uid()))
    )
  ORDER BY b.is_pinned DESC, b.created_at DESC
  LIMIT 50;
$function$;