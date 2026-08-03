-- Finish the repair flow.
--
-- repair_requests already had `payment_status` (unpaid | held | released) — the
-- Float model was designed for repairs from the start and then never wired up.
-- Nothing ever took a payment, nothing ever inspected the device, and nothing
-- ever confirmed collection, so a repair could reach `ready_for_collection` and
-- then simply stop. `completed` was set by the vendor alone, with no customer
-- involvement and no money ever moving.
--
-- The flow is now the same escrow shape as a product order:
--
--   submitted → quotation_sent → [customer approves + PAYS into Float]
--     → received → diagnosing → in_repair → ready_for_collection
--     → [customer INSPECTS and CONFIRMS] → completed, funds released

alter table public.repair_requests
  add column if not exists mpesa_receipt_number   text,
  add column if not exists paid_amount_ksh        integer,
  add column if not exists paid_at                timestamptz,
  add column if not exists payment_provider       text,
  add column if not exists payment_gateway_response jsonb,
  add column if not exists inspection_passed      boolean,
  add column if not exists inspection_notes       text,
  add column if not exists customer_confirmed_at  timestamptz,
  add column if not exists released_at            timestamptz;

-- The gateway links Response 1 to Response 2 by CheckoutRequestID, which lands
-- in mpesa_transaction_id. Looking a repair up by it must be fast and unique.
create unique index if not exists repair_requests_mpesa_tx_idx
  on public.repair_requests (mpesa_transaction_id)
  where mpesa_transaction_id is not null;

-- ---------------------------------------------------------------------------
-- Mark a repair paid into Float. Mirrors mark_order_paid.
-- ---------------------------------------------------------------------------
create or replace function public.mark_repair_paid(
  _repair_id uuid,
  _receipt text,
  _mpesa_tx text,
  _paid_amount_ksh integer default null,
  _payment_provider text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.repair_requests%rowtype;
begin
  select * into r from public.repair_requests where id = _repair_id for update;
  if not found then
    raise exception 'repair request % not found', _repair_id;
  end if;

  -- Idempotent: the gateway can deliver the same confirmation more than once,
  -- and /repair-payment-status polls concurrently with it.
  if r.payment_status <> 'unpaid' then
    return;
  end if;

  update public.repair_requests
  set payment_status        = 'held',
      mpesa_receipt_number  = _receipt,
      mpesa_transaction_id  = coalesce(_mpesa_tx, mpesa_transaction_id),
      paid_amount_ksh       = coalesce(_paid_amount_ksh, quoted_price_ksh),
      paid_at               = now(),
      payment_provider      = coalesce(_payment_provider, payment_provider),
      -- Paying is the customer's commitment; the device can now be handed over.
      status                = case when status = 'quotation_sent' then 'received'::repair_status else status end,
      updated_at            = now()
  where id = _repair_id;

  insert into public.notifications (user_id, type, title, message, reference_id)
  values (
    r.customer_id,
    'repair_update',
    'Repair payment held in Float',
    'We received your payment for ' || coalesce(r.device_description, 'your device') ||
      '. It stays in Float until you collect the device and confirm the repair.',
    r.id
  );

  insert into public.notifications (user_id, type, title, message, reference_id)
  select vp.user_id, 'repair_update', 'Repair paid — start work',
         'The customer has paid for ' || coalesce(r.device_description, 'a device') ||
         '. The money is held in Float and released to you once they confirm the repair.',
         r.id
  from public.vendor_profiles vp
  where vp.id = r.vendor_id and vp.user_id is not null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer inspects the repaired device and confirms collection.
-- This is what releases the money — nothing else may set 'released'.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_repair_collection(
  _repair_id uuid,
  _inspection_passed boolean,
  _inspection_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.repair_requests%rowtype;
begin
  select * into r from public.repair_requests where id = _repair_id for update;
  if not found then
    raise exception 'repair request % not found', _repair_id;
  end if;

  -- Only the customer may confirm. SECURITY DEFINER bypasses RLS, so this
  -- check is the access control, not a convenience.
  if auth.uid() is not null and auth.uid() <> r.customer_id then
    raise exception 'only the customer can confirm this repair';
  end if;

  if r.status not in ('ready_for_collection', 'completed') then
    raise exception 'this repair is not ready for collection yet';
  end if;

  if not _inspection_passed then
    -- A failed inspection must NOT release the money. Send it back to the
    -- bench and leave the funds in Float.
    update public.repair_requests
    set status           = 'in_repair',
        inspection_passed = false,
        inspection_notes = _inspection_notes,
        updated_at       = now()
    where id = _repair_id;

    insert into public.notifications (user_id, type, title, message, reference_id)
    select vp.user_id, 'repair_update', 'Customer rejected the repair',
           coalesce(nullif(_inspection_notes, ''), 'The customer inspected the device and it did not pass.') ||
           ' The payment stays in Float until this is resolved.',
           r.id
    from public.vendor_profiles vp
    where vp.id = r.vendor_id and vp.user_id is not null;
    return;
  end if;

  update public.repair_requests
  set status                = 'completed',
      inspection_passed     = true,
      inspection_notes      = coalesce(_inspection_notes, inspection_notes),
      customer_confirmed_at = now(),
      -- Only release what was actually collected. An unpaid repair (a vendor
      -- who took no deposit) simply completes without a payout.
      payment_status        = case when payment_status = 'held' then 'released'::repair_payment_status else payment_status end,
      released_at           = case when payment_status = 'held' then now() else released_at end,
      updated_at            = now()
  where id = _repair_id;

  insert into public.notifications (user_id, type, title, message, reference_id)
  select vp.user_id, 'repair_update', 'Repair confirmed — payment released',
         'The customer confirmed ' || coalesce(r.device_description, 'the device') ||
         ' and your payment has been released from Float.',
         r.id
  from public.vendor_profiles vp
  where vp.id = r.vendor_id and vp.user_id is not null;
end;
$$;

grant execute on function public.confirm_repair_collection(uuid, boolean, text) to authenticated;
grant execute on function public.mark_repair_paid(uuid, text, text, integer, text) to service_role;

-- ---------------------------------------------------------------------------
-- A vendor must not be able to move money or fake the customer's confirmation.
-- "Vendor update assigned repair" is a broad policy on vendor_id, exactly like
-- the vendor_profiles hole fixed in 20260803120000.
-- ---------------------------------------------------------------------------
create or replace function public.protect_repair_settlement_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for the service role and for the SECURITY DEFINER
  -- functions above, which are the only things allowed to settle a repair.
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() <> old.customer_id then
    -- Not the customer: cannot inspect or confirm on their behalf.
    new.inspection_passed     := old.inspection_passed;
    new.inspection_notes      := old.inspection_notes;
    new.customer_confirmed_at := old.customer_confirmed_at;
  end if;

  -- Nobody acting through the browser may touch the money, whichever side
  -- they are on. Only mark_repair_paid / confirm_repair_collection may.
  new.payment_status       := old.payment_status;
  new.paid_amount_ksh      := old.paid_amount_ksh;
  new.paid_at              := old.paid_at;
  new.released_at          := old.released_at;
  new.mpesa_receipt_number := old.mpesa_receipt_number;

  return new;
end;
$$;

drop trigger if exists protect_repair_settlement_columns_trg on public.repair_requests;
create trigger protect_repair_settlement_columns_trg
  before update on public.repair_requests
  for each row execute function public.protect_repair_settlement_columns();
