-- Fix: the settlement guard was blocking the settlement functions themselves.
--
-- protect_repair_settlement_columns skips its lockdown when `auth.uid() is
-- null`, on the assumption that SECURITY DEFINER functions run without a user.
-- They do not. SECURITY DEFINER changes the ROLE; it does not clear
-- `request.jwt.claims`, and auth.uid() reads that GUC. So when the customer
-- called confirm_repair_collection from the browser, auth.uid() was still the
-- customer, the trigger fired, and it forced payment_status straight back to
-- its old value — the repair completed but the money was never released.
--
-- mark_repair_paid was only saved by luck: the server calls it with the service
-- role, which usually carries no `sub` claim. Any path that did have one would
-- have silently failed to record the payment too.
--
-- The guard now keys off an explicit transaction-local flag that only these two
-- functions set. set_config(..., is_local => true) is scoped to the current
-- transaction, so it cannot leak to another request over a pooled connection,
-- and PostgREST gives clients no way to set it themselves.

create or replace function public.protect_repair_settlement_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Set only by mark_repair_paid / confirm_repair_collection, for the duration
  -- of their own transaction.
  if coalesce(current_setting('techtrust.settling', true), 'off') = 'on' then
    return new;
  end if;

  -- Service-role / server-side jobs with no end user attached.
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() <> old.customer_id then
    new.inspection_passed     := old.inspection_passed;
    new.inspection_notes      := old.inspection_notes;
    new.customer_confirmed_at := old.customer_confirmed_at;
  end if;

  -- Nobody acting through the browser may move money, whichever side they are
  -- on. Only the two functions above may.
  new.payment_status       := old.payment_status;
  new.paid_amount_ksh      := old.paid_amount_ksh;
  new.paid_at              := old.paid_at;
  new.released_at          := old.released_at;
  new.mpesa_receipt_number := old.mpesa_receipt_number;

  return new;
end;
$$;

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

  -- Idempotent: the gateway can redeliver the same confirmation, and
  -- /repair-payment-status polls concurrently with it.
  if r.payment_status <> 'unpaid' then
    return;
  end if;

  perform set_config('techtrust.settling', 'on', true);

  update public.repair_requests
  set payment_status        = 'held',
      mpesa_receipt_number  = _receipt,
      mpesa_transaction_id  = coalesce(_mpesa_tx, mpesa_transaction_id),
      paid_amount_ksh       = coalesce(_paid_amount_ksh, quoted_price_ksh),
      paid_at               = now(),
      payment_provider      = coalesce(_payment_provider, payment_provider),
      status                = case when status = 'quotation_sent' then 'received'::repair_status else status end,
      updated_at            = now()
  where id = _repair_id;

  perform set_config('techtrust.settling', 'off', true);

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

  -- SECURITY DEFINER bypasses RLS, so this check IS the access control.
  if auth.uid() is not null and auth.uid() <> r.customer_id then
    raise exception 'only the customer can confirm this repair';
  end if;

  if r.status not in ('ready_for_collection', 'completed') then
    raise exception 'this repair is not ready for collection yet';
  end if;

  perform set_config('techtrust.settling', 'on', true);

  if not _inspection_passed then
    -- A failed inspection must NOT release the money. Back to the bench, funds
    -- stay in Float.
    update public.repair_requests
    set status            = 'in_repair',
        inspection_passed = false,
        inspection_notes  = _inspection_notes,
        updated_at        = now()
    where id = _repair_id;

    perform set_config('techtrust.settling', 'off', true);

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
      payment_status        = case when payment_status = 'held' then 'released'::repair_payment_status else payment_status end,
      released_at           = case when payment_status = 'held' then now() else released_at end,
      updated_at            = now()
  where id = _repair_id;

  perform set_config('techtrust.settling', 'off', true);

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
