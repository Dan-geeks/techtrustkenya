-- ============ REFERRAL CODE FOR OAUTH SIGN-INS ============
-- handle_new_user() links referred_by from raw_user_meta_data->>'referral_code',
-- which only email/password signUp() can populate — Google OAuth's metadata
-- comes entirely from the Google profile, so referred_by was never set for
-- anyone who signed up with Google. This RPC lets an already-authenticated
-- user attach a referral code after the fact (called from the client right
-- after the OAuth redirect lands, using a code stashed in localStorage before
-- the redirect). Restricted to setting only the caller's own row, only once,
-- only to a real code, and never to themselves.
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_referrer_id uuid;
  v_current_referred_by uuid;
BEGIN
  SELECT referred_by INTO v_current_referred_by FROM public.profiles WHERE id = auth.uid();
  IF v_current_referred_by IS NOT NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = upper(trim(p_code));
  IF v_referrer_id IS NULL OR v_referrer_id = auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE public.profiles SET referred_by = v_referrer_id WHERE id = auth.uid();
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_referral_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;
