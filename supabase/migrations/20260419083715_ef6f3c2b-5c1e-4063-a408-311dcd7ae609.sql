
-- ============ vendor_profiles RLS additions ============
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
USING (auth.uid() = user_id);

-- ============ user_roles RLS additions ============
CREATE POLICY "Users can insert own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- (SELECT own role policy already exists as "Users view own roles")

-- ============ Storage policies ============
-- shop-photos: authenticated upload, public read (bucket already public)
CREATE POLICY "Authenticated can upload shop photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shop-photos');

CREATE POLICY "Authenticated can update own shop photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shop-photos' AND owner = auth.uid());

-- product-images: authenticated upload
CREATE POLICY "Authenticated can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated can update own product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND owner = auth.uid());

CREATE POLICY "Authenticated can delete own product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND owner = auth.uid());

-- vendor-documents: private bucket, authenticated upload only
CREATE POLICY "Authenticated can upload vendor documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-documents');

CREATE POLICY "Vendors can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vendor-documents' AND owner = auth.uid());

CREATE POLICY "Admins can read all vendor documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vendor-documents' AND public.has_role(auth.uid(), 'admin'));

-- avatars
CREATE POLICY "Authenticated can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND owner = auth.uid());

-- ============ Carts ============
CREATE TABLE public.carts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own cart"
ON public.carts FOR ALL
TO authenticated
USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers manage own cart items"
ON public.cart_items FOR ALL
TO authenticated
USING (cart_id IN (SELECT id FROM public.carts WHERE customer_id = auth.uid()))
WITH CHECK (cart_id IN (SELECT id FROM public.carts WHERE customer_id = auth.uid()));

CREATE TRIGGER update_carts_updated_at
BEFORE UPDATE ON public.carts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON public.cart_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX idx_cart_items_product_id ON public.cart_items(product_id);
