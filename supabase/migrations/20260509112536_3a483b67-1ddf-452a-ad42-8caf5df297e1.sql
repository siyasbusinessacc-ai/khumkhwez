
-- 1. Make referral attribution stick via signup metadata (works even if email is opened on another device/browser)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref_code text;
  _referrer uuid;
BEGIN
  INSERT INTO public.profiles (user_id, email, primary_phone)
  VALUES (NEW.id, NEW.email, NEW.phone);

  -- Attempt to attach a referral if the signup metadata included one
  _ref_code := upper(coalesce(NEW.raw_user_meta_data->>'referral_code', ''));
  IF _ref_code <> '' THEN
    SELECT user_id INTO _referrer FROM public.referral_codes WHERE upper(code) = _ref_code;
    IF _referrer IS NOT NULL AND _referrer <> NEW.id THEN
      INSERT INTO public.referrals (referrer_user_id, referred_user_id, code_used, status, signed_up_at)
      VALUES (_referrer, NEW.id, _ref_code, 'signed_up', now())
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Walk-in offer redemptions (kitchen applies a discount code to a one-off cash sale, not tied to a subscription)
CREATE TABLE IF NOT EXISTS public.walkin_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL,
  offer_code text NOT NULL,
  served_by uuid,
  customer_label text,
  original_cents integer NOT NULL,
  discount_cents integer NOT NULL,
  final_cents integer NOT NULL,
  served_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.walkin_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kitchen and admin can record walkins"
ON public.walkin_redemptions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'kitchen') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Kitchen and admin can view walkins"
ON public.walkin_redemptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'kitchen') OR public.has_role(auth.uid(),'admin'));

-- 3. Quote + apply offer for a walk-in (no subscription needed)
CREATE OR REPLACE FUNCTION public.apply_walkin_offer(
  _code text,
  _price_cents integer,
  _customer_label text DEFAULT NULL,
  _commit boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offer public.offers%ROWTYPE;
  _raw int;
  _apply int;
BEGIN
  IF NOT (public.has_role(auth.uid(),'kitchen') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Forbidden: kitchen or admin only';
  END IF;
  IF _price_cents IS NULL OR _price_cents <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_price');
  END IF;

  SELECT * INTO _offer FROM public.offers
   WHERE upper(code) = upper(trim(_code)) AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;
  IF _offer.starts_at > now() OR (_offer.ends_at IS NOT NULL AND _offer.ends_at < now()) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_in_window');
  END IF;
  IF _offer.max_redemptions IS NOT NULL AND _offer.current_redemptions >= _offer.max_redemptions THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'sold_out');
  END IF;
  IF _price_cents < _offer.min_subtotal_cents THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'below_minimum');
  END IF;

  IF _offer.discount_type = 'percent' THEN
    _raw := (_price_cents * _offer.discount_value) / 100;
  ELSE
    _raw := _offer.discount_value;
  END IF;
  _apply := LEAST(_raw, _price_cents);

  IF _commit THEN
    INSERT INTO public.walkin_redemptions(offer_id, offer_code, served_by, customer_label, original_cents, discount_cents, final_cents)
    VALUES (_offer.id, _offer.code, auth.uid(), _customer_label, _price_cents, _apply, _price_cents - _apply);

    UPDATE public.offers SET current_redemptions = current_redemptions + 1 WHERE id = _offer.id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'offer_name', _offer.name,
    'offer_code', _offer.code,
    'discount_type', _offer.discount_type,
    'discount_value', _offer.discount_value,
    'original_cents', _price_cents,
    'discount_cents', _apply,
    'final_cents', _price_cents - _apply,
    'committed', _commit
  );
END $$;
