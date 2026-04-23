-- ============ REFERRAL CODES ============
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referral code"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Anyone signed in can look up a code by string (needed at signup) but only by code, not by browsing
CREATE POLICY "Authenticated users can lookup codes"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (true);

-- ============ REFERRALS ============
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  code_used TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  reward_cents INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they're part of"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- No INSERT/UPDATE/DELETE policies — only the SECURITY DEFINER function below can write.

-- ============ HELPER: get or create referral code ============
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _code TEXT;
  _attempts INT := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT code INTO _code FROM public.referral_codes WHERE user_id = _uid;
  IF _code IS NOT NULL THEN
    RETURN _code;
  END IF;

  LOOP
    _attempts := _attempts + 1;
    -- 6-char base32-ish code, no ambiguous chars
    _code := upper(substring(translate(encode(gen_random_bytes(6), 'base64'), '+/=OIl01', 'XYZABCDE'), 1, 6));

    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (_uid, _code);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      IF _attempts > 5 THEN
        RAISE EXCEPTION 'Could not generate referral code';
      END IF;
    END;
  END LOOP;
END;
$$;

-- ============ HELPER: redeem a referral code at signup ============
CREATE OR REPLACE FUNCTION public.redeem_referral_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _referrer UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id INTO _referrer FROM public.referral_codes WHERE upper(code) = upper(_code);

  IF _referrer IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  IF _referrer = _uid THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_user_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  INSERT INTO public.referrals (referrer_user_id, referred_user_id, code_used, status)
  VALUES (_referrer, _uid, upper(_code), 'pending');

  RETURN jsonb_build_object('ok', true);
END;
$$;