-- =========================================================
-- Permanent QR Code System
-- =========================================================

-- Add qr_code_pass column to profiles (unique, indexed for fast lookup)
ALTER TABLE public.profiles
ADD COLUMN qr_code_pass text UNIQUE NOT NULL DEFAULT '';

-- Create index for fast pass code lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_qr_code_pass ON public.profiles(qr_code_pass) WHERE qr_code_pass != '';

-- Function to generate a random pass code
CREATE OR REPLACE FUNCTION public.generate_qr_pass()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'pass_' || encode(gen_random_bytes(12), 'hex');
$$;

-- Populate existing profiles with pass codes (only if empty)
UPDATE public.profiles
SET qr_code_pass = public.generate_qr_pass()
WHERE qr_code_pass = '';

-- =========================================================
-- verify_pass: Kitchen lookup (read-only, no side effects)
-- =========================================================
CREATE OR REPLACE FUNCTION public.verify_pass(_pass_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _name text;
  _surname text;
  _subscription_id uuid;
  _end_date date;
  _allowed_weekdays int[];
  _plan_name text;
  _today date;
  _isoweekday int;
  _plan_covers_today boolean;
  _is_paid boolean;
  _already_served boolean;
BEGIN
  _today := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
  _isoweekday := ((EXTRACT(DOW FROM _today)::int + 6) % 7) + 1; -- 1=Mon..7=Sun

  -- Lookup profile by pass code
  SELECT user_id, name, surname INTO _user_id, _name, _surname
  FROM public.profiles
  WHERE qr_code_pass = _pass_code
  LIMIT 1;

  IF _user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'status', 'invalid',
      'message', 'QR code not found'
    );
  END IF;

  -- Lookup active subscription
  SELECT s.id, s.end_date, mp.name, mp.allowed_weekdays
  INTO _subscription_id, _end_date, _plan_name, _allowed_weekdays
  FROM public.subscriptions s
  LEFT JOIN public.meal_plans mp ON mp.id = s.plan_id
  WHERE s.user_id = _user_id AND s.status = 'active'
  LIMIT 1;

  _is_paid := _subscription_id IS NOT NULL;
  _plan_covers_today := _allowed_weekdays IS NOT NULL AND _isoweekday = ANY(_allowed_weekdays);
  _is_paid := _is_paid AND _end_date >= _today;

  -- Check if already redeemed today
  SELECT id INTO _already_served
  FROM public.meal_redemptions
  WHERE subscription_id = _subscription_id AND redeemed_on = _today
  LIMIT 1;

  RETURN jsonb_build_object(
    'ok', _is_paid AND _plan_covers_today AND _already_served IS NULL,
    'status', CASE
      WHEN _already_served IS NOT NULL THEN 'already_served'
      WHEN NOT _is_paid THEN 'unpaid'
      WHEN NOT _plan_covers_today THEN 'not_eligible'
      ELSE 'eligible'
    END,
    'name', _name,
    'surname', _surname,
    'plan_name', _plan_name,
    'valid_until', _end_date,
    'subscription_id', _subscription_id,
    'user_id', _user_id
  );
END;
$$;

-- =========================================================
-- serve_meal_by_pass: Kitchen service (atomic write)
-- =========================================================
CREATE OR REPLACE FUNCTION public.serve_meal_by_pass(_pass_code text, _kitchen_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _verify_result jsonb;
  _subscription_id uuid;
  _user_id uuid;
  _name text;
  _surname text;
  _today date;
  _redemption_id uuid;
BEGIN
  -- Verify kitchen role
  IF NOT public.has_role(_kitchen_user_id, 'kitchen') THEN
    RAISE EXCEPTION 'Forbidden: kitchen role required';
  END IF;

  -- Verify pass and get lookup result
  _verify_result := public.verify_pass(_pass_code);

  IF (_verify_result->>'ok')::boolean IS FALSE THEN
    RETURN _verify_result;
  END IF;

  _subscription_id := (_verify_result->>'subscription_id')::uuid;
  _user_id := (_verify_result->>'user_id')::uuid;
  _name := _verify_result->>'name';
  _surname := _verify_result->>'surname';
  _today := (now() AT TIME ZONE 'Africa/Johannesburg')::date;

  -- Atomic: insert meal redemption
  INSERT INTO public.meal_redemptions (subscription_id, user_id, redeemed_on, redeemed_by)
  VALUES (_subscription_id, _user_id, _today, _kitchen_user_id)
  RETURNING id INTO _redemption_id;

  RETURN jsonb_build_object(
    'ok', true,
    'status', 'served',
    'message', 'Meal recorded successfully',
    'name', _name,
    'surname', _surname,
    'redemption_id', _redemption_id
  );
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'ok', false,
    'status', 'already_served',
    'message', 'This student already redeemed their meal today'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'ok', false,
    'status', 'error',
    'message', SQLERRM
  );
END;
$$;
