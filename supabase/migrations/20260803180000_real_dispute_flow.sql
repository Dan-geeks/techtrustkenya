-- Make disputes real.
--
-- "Open Dispute / Report Issue" on the order tracker linked to /disputes, which
-- is a static policy page. There was no way for a customer to actually raise a
-- dispute: orders.status could become 'disputed' and dispute_reason could hold
-- text, but nothing in the product ever set either. The admin Disputes tab
-- listed orders that could only be put there by hand in the database.
--
-- Its resolve buttons also notified via a direct insert, which the
-- "auth.uid() = user_id" policy on notifications silently refuses for anyone
-- but yourself — so an admin resolving a dispute told nobody. Same bug as
-- 20260803160000, this time on the admin side, and it also never told the
-- vendor anything at all.

alter table public.orders
  add column if not exists disputed_at          timestamptz,
  add column if not exists dispute_opened_by    uuid,
  add column if not exists dispute_resolution   text,
  add column if not exists dispute_resolved_at  timestamptz,
  add column if not exists dispute_resolved_by  uuid;

-- ---------------------------------------------------------------------------
-- Raise a dispute. Either side of the order may, while the money is still in
-- Float — once it is released there is nothing left to arbitrate.
-- ---------------------------------------------------------------------------
create or replace function public.open_dispute(_order_id uuid, _reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  vendor_user uuid;
  admin_id uuid;
  opener_is_customer boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(btrim(_reason), '') = '' then
    raise exception 'please describe what went wrong';
  end if;

  select * into o from public.orders where id = _order_id for update;
  if not found then
    raise exception 'order not found';
  end if;

  select user_id into vendor_user from public.vendor_profiles where id = o.vendor_id;

  opener_is_customer := auth.uid() = o.customer_id;
  if not opener_is_customer and auth.uid() is distinct from vendor_user then
    raise exception 'only the buyer or the seller can dispute this order';
  end if;

  if o.status = 'disputed' then
    raise exception 'a dispute is already open on this order';
  end if;
  -- Nothing to arbitrate once the vendor has been paid out.
  if o.status in ('confirmed', 'refunded', 'cancelled') then
    raise exception 'this order is already closed';
  end if;
  -- order_payment_status is (pending | paid_float | released | refunded |
  -- failed). 'held' belongs to repair_payment_status, not this enum — comparing
  -- against it here would throw at runtime rather than just being false.
  if o.payment_status <> 'paid_float' then
    raise exception 'you can only dispute an order whose payment is held in Float';
  end if;

  update public.orders
  set status            = 'disputed',
      dispute_reason    = btrim(_reason),
      disputed_at       = now(),
      dispute_opened_by = auth.uid(),
      updated_at        = now()
  where id = _order_id;

  -- Tell the other side.
  insert into public.notifications (user_id, type, title, message, reference_id)
  values (
    case when opener_is_customer then vendor_user else o.customer_id end,
    'dispute',
    'Dispute opened on an order',
    case when opener_is_customer
         then 'The buyer has raised a dispute. The Float payment is frozen until TechTrust reviews it.'
         else 'The seller has raised a dispute on your order. The Float payment is frozen until TechTrust reviews it.'
    end,
    o.id
  );

  -- And every admin, because somebody has to arbitrate it.
  for admin_id in select user_id from public.user_roles where role = 'admin' loop
    insert into public.notifications (user_id, type, title, message, reference_id)
    values (admin_id, 'dispute', 'New dispute needs review',
            'Order #' || upper(left(o.id::text, 8)) || ': ' || btrim(_reason), o.id);
  end loop;
end;
$$;

grant execute on function public.open_dispute(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Resolve it. Admin only, and it tells BOTH sides — the old path told only the
-- customer, and only when the insert happened to be allowed.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_dispute(
  _order_id uuid,
  _outcome text,             -- 'refund_customer' | 'release_to_vendor'
  _note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  vendor_user uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'only an admin can resolve a dispute';
  end if;
  if _outcome not in ('refund_customer', 'release_to_vendor') then
    raise exception 'unknown outcome %', _outcome;
  end if;

  select * into o from public.orders where id = _order_id for update;
  if not found then
    raise exception 'order not found';
  end if;
  if o.status <> 'disputed' then
    raise exception 'this order is not under dispute';
  end if;

  select user_id into vendor_user from public.vendor_profiles where id = o.vendor_id;

  if _outcome = 'refund_customer' then
    update public.orders
    set status              = 'refunded',
        payment_status      = 'refunded',
        dispute_resolution  = coalesce(_note, 'Refunded to the buyer.'),
        dispute_resolved_at = now(),
        dispute_resolved_by = auth.uid(),
        updated_at          = now()
    where id = _order_id;

    insert into public.notifications (user_id, type, title, message, reference_id)
    values (o.customer_id, 'dispute', 'Dispute resolved — refund issued',
            coalesce(_note, 'Your payment is being refunded to your M-Pesa number.'), o.id);

    if vendor_user is not null then
      insert into public.notifications (user_id, type, title, message, reference_id)
      values (vendor_user, 'dispute', 'Dispute resolved — refunded to the buyer',
              coalesce(_note, 'TechTrust reviewed this order and refunded the buyer.'), o.id);
    end if;
  else
    update public.orders
    set status              = 'confirmed',
        payment_status      = 'released',
        float_released_at   = now(),
        dispute_resolution  = coalesce(_note, 'Released to the seller.'),
        dispute_resolved_at = now(),
        dispute_resolved_by = auth.uid(),
        updated_at          = now()
    where id = _order_id;

    insert into public.notifications (user_id, type, title, message, reference_id)
    values (o.customer_id, 'dispute', 'Dispute resolved in the seller''s favour',
            coalesce(_note, 'TechTrust reviewed this order and released the payment to the seller.'), o.id);

    if vendor_user is not null then
      insert into public.notifications (user_id, type, title, message, reference_id)
      values (vendor_user, 'dispute', 'Dispute resolved — payment released',
              coalesce(_note, 'TechTrust reviewed this order and released your payment from Float.'), o.id);
    end if;
  end if;
end;
$$;

grant execute on function public.resolve_dispute(uuid, text, text) to authenticated;
