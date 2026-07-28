-- ============= VENDOR PROFILES =============
DROP POLICY IF EXISTS "Users can insert own vendor profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Users can view own vendor profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Users can update own vendor profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Vendor manages own profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Verified vendors public" ON public.vendor_profiles;

CREATE POLICY "Users can insert own vendor profile"
  ON public.vendor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own vendor profile"
  ON public.vendor_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own vendor profile"
  ON public.vendor_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Approved vendors public"
  ON public.vendor_profiles FOR SELECT
  TO anon, authenticated
  USING (verification_status IN ('verified', 'approved'));

-- ============= USER ROLES =============
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;

CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Avoid unique-violation crashes on duplicate (user_id, role) inserts
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- ============= CARTS / CART ITEMS =============
DROP POLICY IF EXISTS "Customers manage own cart" ON public.carts;
DROP POLICY IF EXISTS "Users can manage own cart" ON public.carts;
CREATE POLICY "Users can manage own cart"
  ON public.carts FOR ALL
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Customers manage own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
CREATE POLICY "Users can manage own cart items"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (cart_id IN (SELECT id FROM public.carts WHERE customer_id = auth.uid()))
  WITH CHECK (cart_id IN (SELECT id FROM public.carts WHERE customer_id = auth.uid()));

-- ============= VENDOR DUAL ROLE FLAGS =============
ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS offers_products boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS offers_repairs boolean NOT NULL DEFAULT false;

-- ============= handle_new_user safe upsert =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;