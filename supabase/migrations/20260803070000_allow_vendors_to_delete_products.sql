-- Vendors could not delete their own listings: orders.product_id (and
-- spare_part_orders.product_id) reference products(id) with no ON DELETE
-- action, so any product that had ever been ordered failed with
--   "update or delete on table products violates foreign key constraint
--    orders_product_id_fkey on table orders"
--
-- Cascading is not an option — that would delete paid orders. Instead we do
-- what order systems normally do: snapshot what was bought onto the order, then
-- let the product link go null when the listing is removed. Order history stays
-- readable forever and the vendor regains control of their catalogue.

-- 1. Snapshot columns -------------------------------------------------------
alter table public.orders
  add column if not exists product_name  text,
  add column if not exists product_brand text,
  add column if not exists product_image_url text;

-- Backfill every existing order from its still-present product.
update public.orders o
   set product_name      = coalesce(o.product_name, p.model_name),
       product_brand     = coalesce(o.product_brand, p.brand),
       product_image_url = coalesce(o.product_image_url, p.image_urls[1])
  from public.products p
 where p.id = o.product_id
   and (o.product_name is null or o.product_brand is null);

-- 2. Keep the snapshot filled for every future order ------------------------
create or replace function public.snapshot_order_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if NEW.product_id is not null then
    select coalesce(NEW.product_name,  p.model_name),
           coalesce(NEW.product_brand, p.brand),
           coalesce(NEW.product_image_url, p.image_urls[1])
      into NEW.product_name, NEW.product_brand, NEW.product_image_url
      from products p
     where p.id = NEW.product_id;
  end if;
  return NEW;
end
$fn$;

drop trigger if exists trg_orders_snapshot_product on public.orders;
create trigger trg_orders_snapshot_product
before insert on public.orders
for each row execute function public.snapshot_order_product();

-- 3. Let the link go null when the listing is deleted -----------------------
alter table public.orders alter column product_id drop not null;
alter table public.orders drop constraint if exists orders_product_id_fkey;
alter table public.orders
  add constraint orders_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

alter table public.spare_part_orders alter column product_id drop not null;
alter table public.spare_part_orders drop constraint if exists spare_part_orders_product_id_fkey;
alter table public.spare_part_orders
  add constraint spare_part_orders_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;
