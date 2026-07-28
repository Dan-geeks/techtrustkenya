ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS gps_latitude double precision,
  ADD COLUMN IF NOT EXISTS gps_longitude double precision;

UPDATE public.vendor_profiles
SET gps_latitude = COALESCE(gps_latitude, latitude),
    gps_longitude = COALESCE(gps_longitude, longitude)
WHERE gps_latitude IS NULL OR gps_longitude IS NULL;

CREATE OR REPLACE FUNCTION public.sync_vendor_profile_coordinates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.gps_latitude IS NULL THEN
    NEW.gps_latitude := NEW.latitude;
  END IF;
  IF NEW.latitude IS NULL THEN
    NEW.latitude := NEW.gps_latitude;
  END IF;
  IF NEW.gps_longitude IS NULL THEN
    NEW.gps_longitude := NEW.longitude;
  END IF;
  IF NEW.longitude IS NULL THEN
    NEW.longitude := NEW.gps_longitude;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_vendor_profile_coordinates_trigger ON public.vendor_profiles;
CREATE TRIGGER sync_vendor_profile_coordinates_trigger
BEFORE INSERT OR UPDATE ON public.vendor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_vendor_profile_coordinates();

DROP POLICY IF EXISTS "Users can insert own vendor profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Users can view own vendor profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Users can update own vendor profile" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendor_profiles;
DROP POLICY IF EXISTS "Approved vendors public" ON public.vendor_profiles;

CREATE POLICY "Users can insert own vendor profile"
ON public.vendor_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own vendor profile"
ON public.vendor_profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own vendor profile"
ON public.vendor_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view approved vendors"
ON public.vendor_profiles FOR SELECT TO anon, authenticated
USING (verification_status = 'approved');

DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;

CREATE POLICY "Users can insert own role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);