-- ============ REFERRAL PROGRAM ============
-- Every user gets a shareable referral_code. A new signup can enter someone
-- else's code (referred_by). The first time that new customer's order is
-- confirmed (Float released — proof of a genuine completed purchase, not
-- just a signup), both the new customer and their referrer are credited
-- KES 500 into a simple wallet ledger. referral_reward_granted makes this
-- idempotent so it can never fire twice for the same referred user.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS referral_reward_granted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_balance_ksh integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_ksh integer NOT NULL,
  reason text NOT NULL,
  related_order_id uuid REFERENCES public.orders(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users view own wallet transactions" ON public.wallet_transactions
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
-- No INSERT/UPDATE/DELETE policy for regular users on purpose — only
-- SECURITY DEFINER functions (grant_referral_reward) can write to it.

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);

-- Short, human-friendly referral code derived from the signup name
-- (e.g. "JOHN4F2A1"), retried on the rare collision.
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_full_name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
  candidate text;
  tries int := 0;
BEGIN
  prefix := upper(substr(regexp_replace(coalesce(NULLIF(trim(p_full_name), ''), 'USER'), '[^A-Za-z]', '', 'g') || 'USER', 1, 4));
  LOOP
    candidate := prefix || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = candidate);
    tries := tries + 1;
    EXIT WHEN tries > 10;
  END LOOP;
  RETURN candidate;
END;
$$;

-- Extend handle_new_user: assign every new profile its own referral_code,
-- and if a referral code was entered at signup (passed through
-- raw_user_meta_data, same pattern as full_name/phone_number), link
-- referred_by to that referrer.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_entered_code text;
BEGIN
  v_entered_code := NULLIF(trim(NEW.raw_user_meta_data->>'referral_code'), '');
  IF v_entered_code IS NOT NULL THEN
    SELECT id INTO v_referrer_id FROM public.profiles WHERE referral_code = upper(v_entered_code);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone_number, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    public.generate_referral_code(NEW.raw_user_meta_data->>'full_name'),
    v_referrer_id
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Called from server/index.ts right after an order's status flips to
-- 'confirmed' (Float released). Awards KES 500 to both parties exactly once.
CREATE OR REPLACE FUNCTION public.grant_referral_reward(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_id uuid;
  v_referrer_id uuid;
  v_already boolean;
  v_reward_ksh constant integer := 500;
BEGIN
  SELECT customer_id INTO v_customer_id FROM public.orders WHERE id = p_order_id;
  IF v_customer_id IS NULL THEN RETURN; END IF;

  SELECT referred_by, referral_reward_granted INTO v_referrer_id, v_already
  FROM public.profiles WHERE id = v_customer_id;

  IF v_referrer_id IS NULL OR v_already THEN RETURN; END IF;

  UPDATE public.profiles SET referral_reward_granted = true WHERE id = v_customer_id;

  UPDATE public.profiles SET wallet_balance_ksh = wallet_balance_ksh + v_reward_ksh WHERE id = v_customer_id;
  INSERT INTO public.wallet_transactions (user_id, amount_ksh, reason, related_order_id)
  VALUES (v_customer_id, v_reward_ksh, 'referral_signup_bonus', p_order_id);

  UPDATE public.profiles SET wallet_balance_ksh = wallet_balance_ksh + v_reward_ksh WHERE id = v_referrer_id;
  INSERT INTO public.wallet_transactions (user_id, amount_ksh, reason, related_order_id)
  VALUES (v_referrer_id, v_reward_ksh, 'referral_bonus', p_order_id);

  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES
    (v_customer_id, 'Referral bonus credited', 'KES 500 was added to your TechTrust wallet as a thank-you for using a referral code.', 'payment', p_order_id),
    (v_referrer_id, 'Referral bonus credited', 'KES 500 was added to your TechTrust wallet because someone you referred completed their first order.', 'payment', p_order_id);
END;
$$;

-- This function does not itself check that the order is actually confirmed —
-- it trusts the caller (server/index.ts, using the service role, right after
-- flipping an order to 'confirmed'). PostgREST exposes every function to
-- authenticated/anon by default, which would let any logged-in customer call
-- this directly with an arbitrary order_id and fraudulently claim a reward.
-- Lock it down to service_role only.
REVOKE EXECUTE ON FUNCTION public.grant_referral_reward(uuid) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.grant_referral_reward(uuid) TO service_role;

-- Backfill referral codes for accounts created before this migration.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, full_name FROM public.profiles WHERE referral_code IS NULL LOOP
    UPDATE public.profiles SET referral_code = public.generate_referral_code(r.full_name) WHERE id = r.id;
  END LOOP;
END $$;
