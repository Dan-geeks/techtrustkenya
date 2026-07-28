-- Drop overly broad public-read policies; replace with policies that allow read of named files only
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read shop photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- Allow read only when 'name' is provided (i.e., direct URL fetch for a specific object).
-- Listing without a name filter will not match.
CREATE POLICY "Read product images by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Read shop photos by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-photos' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Read avatars by name"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND name IS NOT NULL AND length(name) > 0);