-- ============ GOOGLE SIGN-IN ONBOARDING GATE ============
-- Email/password sign-ups (customer form and /vendor/register) already make an
-- explicit role choice before an account exists. Google sign-in does not, so a
-- brand-new Google user needs one extra step (/welcome) to pick customer vs
-- vendor. onboarding_complete defaults to true so every existing flow is
-- unaffected, and is only forced false for accounts created via Google.
ALTER TABLE public.profiles ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT true;

-- Vendor payout destination, collected during onboarding.
ALTER TABLE public.vendor_profiles ADD COLUMN till_number TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone_number, onboarding_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email') <> 'google'
  );
  -- Default role: customer (vendor role is added once onboarding — /welcome for
  -- Google sign-ins, /vendor/register for email sign-ups — is completed).
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;
