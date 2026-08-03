-- ProductDetail rendered a "Technical Specifications" table reading
-- data.specifications.processor / .ram / .storage, data.condition_notes and
-- data.serial_number — none of which existed as columns, so every row showed
-- "N/A". Add them for real so vendors can fill them in on the product form.
alter table public.products
  add column if not exists specifications jsonb,
  add column if not exists condition_notes text,
  add column if not exists serial_number text;

comment on column public.products.specifications is
  'Free-form technical specs, e.g. {"processor":"Intel i7-8650U","ram":"16GB","storage":"512GB SSD","display":"14\" FHD"}. Keys with empty values are not displayed.';
comment on column public.products.condition_notes is
  'Vendor''s notes on cosmetic/functional condition. Shown on the product page when set.';
comment on column public.products.serial_number is
  'Device ID / serial. Shown on the product page when set.';
