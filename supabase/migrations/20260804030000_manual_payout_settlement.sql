-- Let an admin settle a payout by hand until Safaricom B2C is activated.
--
-- PAYOUT_PROVIDER is `simulation` and no B2C credentials exist, so
-- /release-float-payment records the intent but no money can leave. Four
-- confirmed orders are sitting on held Float with no way to close them out
-- except editing the database directly.
--
-- B2C activation is a Safaricom application that only the operator can make.
-- Meanwhile the business still has to pay its vendors, and it can: send the
-- M-Pesa manually and record it here. That turns a hard blocker into an
-- operable process, and - crucially - keeps the order state honest, because
-- the alternative people reach for is flipping payment_status by hand with no
-- reference and no audit trail.
--
-- Deliberately a distinct provider value ('manual') rather than pretending a
-- gateway did it, so these are trivially auditable once B2C is live.

create or replace function public.mark_payout_settled(
  _order_id  uuid,
  _reference text,
  _note      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  vendor_user uuid;
  payout_amount numeric;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'only an admin can settle a payout';
  end if;
  if coalesce(btrim(_reference), '') = '' then
    raise exception 'an M-Pesa reference is required so the payment can be traced';
  end if;

  select * into o from public.orders where id = _order_id for update;
  if not found then raise exception 'order not found'; end if;

  if o.payment_status = 'released' then
    return; -- idempotent: already settled
  end if;
  if o.payment_status <> 'paid_float' then
    raise exception 'this order has no Float to release (payment_status=%)', o.payment_status;
  end if;
  if o.status <> 'confirmed' then
    raise exception 'the customer has not confirmed this order yet';
  end if;

  payout_amount := coalesce(o.vendor_payout_ksh,
                            o.total_amount_ksh - coalesce(o.platform_fee_ksh, 0));

  update public.orders
  set payment_status    = 'released',
      payout_status     = 'sent',
      payout_provider   = 'manual',
      payout_reference  = btrim(_reference),
      payout_error      = null,
      float_released_at = now(),
      updated_at        = now()
  where id = _order_id;

  select user_id into vendor_user from public.vendor_profiles where id = o.vendor_id;
  if vendor_user is not null then
    insert into public.notifications (user_id, type, title, message, reference_id)
    values (
      vendor_user,
      'payment',
      'Float released to you',
      'KES ' || to_char(payout_amount, 'FM999,999,999') || ' for order #' ||
        upper(left(o.id::text, 8)) || ' has been sent. M-Pesa reference: ' ||
        btrim(_reference) || coalesce('. ' || nullif(btrim(_note), ''), ''),
      o.id
    );
  end if;

  -- Referral reward is normally granted by the escrow API on release; do it
  -- here too so a manual settlement is not a second-class path.
  begin
    perform public.grant_referral_reward(_order_id);
  exception when others then
    raise notice 'grant_referral_reward skipped: %', sqlerrm;
  end;
end;
$$;

grant execute on function public.mark_payout_settled(uuid, text, text) to authenticated;

-- Everything an admin needs to actually make the payment, in one place:
-- who to pay, how much, and where to send it.
create or replace view public.pending_payouts as
select
  o.id                as order_id,
  o.created_at,
  o.total_amount_ksh,
  o.platform_fee_ksh,
  coalesce(o.vendor_payout_ksh, o.total_amount_ksh - coalesce(o.platform_fee_ksh, 0)) as payout_ksh,
  o.payment_status::text,
  o.status::text      as order_status,
  o.mpesa_receipt_number,
  vp.id               as vendor_id,
  vp.business_name,
  vp.phone            as vendor_phone,
  vp.till_number      as payout_destination,
  p.brand,
  p.model_name
from public.orders o
join public.vendor_profiles vp on vp.id = o.vendor_id
left join public.products p on p.id = o.product_id
where o.status = 'confirmed' and o.payment_status = 'paid_float';

-- CRITICAL: without this the view runs with its OWNER's privileges and bypasses
-- RLS entirely, so any signed-in user could read every vendor's payout
-- destination, phone number and amounts. security_invoker makes it run as the
-- caller, so the existing orders/vendor_profiles policies apply and only an
-- admin (or the vendor themselves) sees a row.
alter view public.pending_payouts set (security_invoker = true);

grant select on public.pending_payouts to authenticated;
