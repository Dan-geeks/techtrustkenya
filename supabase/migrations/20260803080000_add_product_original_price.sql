-- ProductDetail displayed a struck-through "was" price computed as
-- price_ksh * 1.2, so every product appeared discounted by exactly 20% whether
-- or not the vendor had discounted anything (KES 106,999 showed a fake
-- KES 128,398.8 beside it). Give vendors a real field instead.
--
-- NULL means "no discount" and the struck-through price is simply not rendered.
alter table public.products
  add column if not exists original_price_ksh integer;

comment on column public.products.original_price_ksh is
  'Optional pre-discount price. Only shown when greater than price_ksh; NULL means no discount.';

-- Guard against a "discount" that is not one.
alter table public.products drop constraint if exists products_original_price_above_price;
alter table public.products
  add constraint products_original_price_above_price
  check (original_price_ksh is null or original_price_ksh > price_ksh);
