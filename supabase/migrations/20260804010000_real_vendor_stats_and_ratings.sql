-- Real vendor stats, and a rating the customer can actually leave.
--
-- Two separate problems that look like one on the landing page.
--
-- 1. FABRICATED STATS. Four seed vendors carry invented numbers:
--      ProFix Repairs and Sales   312 sales, 4.9   (0 real orders)
--      TechZone Westlands         243 sales, 4.8   (0 real orders)
--      ByteHub Nairobi            127 sales, 4.7   (0 real orders)
--      Gadget Palace Moi Avenue    89 sales, 4.5   (0 real orders)
--    Meanwhile the genuine shops read 0 — TechHub Kenya has 3 confirmed orders
--    and MARCO COMPUTER VENTURES has 1, but nothing ever incremented the
--    column. So the numbers on screen were exactly backwards: invented for the
--    fake shops, missing for the real ones.
--
-- 2. NOWHERE TO RATE. `reviews` exists with a correct INSERT policy (customer,
--    own order, confirmed only) but has zero rows and no UI, and nothing ever
--    recomputed vendor_profiles.average_rating from it.

-- ---------------------------------------------------------------------------
-- Repairs need somewhere to put a rating too; reviews is order-shaped.
-- ---------------------------------------------------------------------------
alter table public.repair_requests
  add column if not exists customer_rating  integer,
  add column if not exists customer_review  text,
  add column if not exists rated_at         timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'repair_requests_customer_rating_check') then
    alter table public.repair_requests
      add constraint repair_requests_customer_rating_check
      check (customer_rating is null or customer_rating between 1 and 5);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Recompute a vendor's public stats from what actually happened.
-- Deliberately a full recompute rather than an increment: it is idempotent,
-- self-healing after any manual data fix, and these tables are small.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_vendor_stats(_vendor_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sales_count integer;
  avg_rating numeric;
begin
  select
    (select count(*) from public.orders o
      where o.vendor_id = _vendor_id and o.status = 'confirmed')
    + (select count(*) from public.repair_requests r
        where r.vendor_id = _vendor_id and r.status = 'completed')
  into sales_count;

  -- Order reviews score the product and the service; a repair leaves one
  -- rating. Average across everything the vendor has been rated on.
  select avg(score) into avg_rating from (
    select ((rv.product_rating + rv.service_rating) / 2.0) as score
    from public.reviews rv where rv.vendor_id = _vendor_id
    union all
    select r.customer_rating::numeric
    from public.repair_requests r
    where r.vendor_id = _vendor_id and r.customer_rating is not null
  ) s;

  update public.vendor_profiles
  set total_completed_transactions = coalesce(sales_count, 0),
      completed_transactions_count = coalesce(sales_count, 0),
      -- 0 means "not rated yet"; the UI hides the stars rather than showing 0.
      average_rating = round(coalesce(avg_rating, 0), 2),
      updated_at = now()
  where id = _vendor_id;
end;
$$;

create or replace function public.trg_recompute_vendor_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recompute_vendor_stats(coalesce(new.vendor_id, old.vendor_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists recompute_vendor_stats_on_order on public.orders;
create trigger recompute_vendor_stats_on_order
  after insert or update or delete on public.orders
  for each row execute function public.trg_recompute_vendor_stats();

drop trigger if exists recompute_vendor_stats_on_review on public.reviews;
create trigger recompute_vendor_stats_on_review
  after insert or update or delete on public.reviews
  for each row execute function public.trg_recompute_vendor_stats();

drop trigger if exists recompute_vendor_stats_on_repair on public.repair_requests;
create trigger recompute_vendor_stats_on_repair
  after insert or update or delete on public.repair_requests
  for each row execute function public.trg_recompute_vendor_stats();

-- ---------------------------------------------------------------------------
-- Let a customer rate a completed repair. Mirrors the reviews INSERT policy:
-- your own repair, and only once it is finished.
-- ---------------------------------------------------------------------------
create or replace function public.rate_repair(
  _repair_id uuid,
  _rating integer,
  _review text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.repair_requests%rowtype;
begin
  if _rating is null or _rating < 1 or _rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  select * into r from public.repair_requests where id = _repair_id for update;
  if not found then raise exception 'repair not found'; end if;

  if auth.uid() is null or auth.uid() <> r.customer_id then
    raise exception 'only the customer can rate this repair';
  end if;
  if r.status <> 'completed' then
    raise exception 'you can only rate a completed repair';
  end if;

  -- customer_rating is not in the settlement guard's locked set, so a plain
  -- update is fine here.
  update public.repair_requests
  set customer_rating = _rating,
      customer_review = nullif(btrim(coalesce(_review, '')), ''),
      rated_at = now(),
      updated_at = now()
  where id = _repair_id;
end;
$$;

grant execute on function public.rate_repair(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: wipe the invented numbers and recompute every vendor from reality.
-- ---------------------------------------------------------------------------
do $$
declare v uuid;
begin
  for v in select id from public.vendor_profiles loop
    perform public.recompute_vendor_stats(v);
  end loop;
end $$;
