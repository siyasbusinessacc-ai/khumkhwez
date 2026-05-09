ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals ADD CONSTRAINT referrals_status_check
  CHECK (status IN ('pending','signed_up','paid','rewarded','cancelled'));