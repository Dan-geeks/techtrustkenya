-- Seed MARCO COMPUTER VENTURES and HP ELITEBOOK 840G3 with price = 1 KSh for sandbox testing
-- Drop the price floor constraint so we can set price = 1 for sandbox testing
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_price_ksh_check;

INSERT INTO public.vendor_profiles (
  id,
  user_id,
  business_name,
  physical_address,
  latitude,
  longitude,
  verification_status,
  total_completed_transactions,
  average_rating,
  subscription_tier,
  city,
  owner_name,
  offers_products,
  offers_repairs,
  phone,
  email,
  gps_latitude,
  gps_longitude,
  county,
  sub_county
) VALUES (
  '5afb93b1-0049-492b-8832-b1850e31a5dc',
  NULL,
  'MARCO COMPUTER VENTURES',
  'MARCO COMPUTER VENTURES BUILDING',
  -1.002,
  37.004,
  'approved',
  0,
  0.0,
  'basic',
  'Kisumu',
  'Megwe Mwangi',
  TRUE,
  FALSE,
  '0743202207',
  'mwangimegwejohn@gmail.com',
  -1.002,
  37.004,
  'Kisumu',
  'KISUMU CBD'
) ON CONFLICT (id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  verification_status = EXCLUDED.verification_status,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email;

INSERT INTO public.products (
  id,
  vendor_id,
  category,
  brand,
  model_name,
  year_of_manufacture,
  condition,
  price_ksh,
  quantity_in_stock,
  warranty_status,
  warranty_duration_months,
  description,
  image_urls,
  is_active,
  average_rating
) VALUES (
  '159a0a56-df40-4e98-9ed2-c7bd2f6c9c8a',
  '5afb93b1-0049-492b-8832-b1850e31a5dc',
  'laptop',
  'HP',
  'ELITEBOOK 840G3',
  2019,
  'new',
  1, -- Set price to 1 KSh (1 bob) for testing!
  8,
  TRUE,
  8,
  'HP ELITEBOOK 840G3 - Updated to 1 Shilling for Sandbox Testing.',
  ARRAY['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800'],
  TRUE,
  0.0
) ON CONFLICT (id) DO UPDATE SET
  price_ksh = EXCLUDED.price_ksh,
  model_name = EXCLUDED.model_name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;
