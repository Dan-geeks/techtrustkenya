
ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS sub_county text;

UPDATE public.vendor_profiles
  SET county = city
  WHERE county IS NULL AND city IS NOT NULL;
