-- Cross-side notifications have been failing silently.
--
-- notifications has exactly one INSERT policy:
--     WITH CHECK (auth.uid() = user_id)
--
-- so you may only ever notify YOURSELF. Every place the app notifies the other
-- side of a transaction from the browser was therefore a no-op that nobody
-- noticed, because the insert is fire-and-forget and its error was discarded:
--
--   * vendor sends a repair quote      -> customer never told (RepairsTab)
--   * customer approves/declines quote -> vendor never told
--   * vendor advances an order         -> customer never told
--
-- Some of these were accidentally covered by SECURITY DEFINER table triggers,
-- which is why notifications appeared to work "sometimes" — the ones with a
-- trigger behind them landed, the rest vanished.
--
-- Widening the INSERT policy would let any signed-in user push a notification
-- to any other, so instead this is a narrow, checked RPC: you may notify
-- someone only if you and they are the two sides of the order or repair you
-- are referencing.

create or replace function public.notify_counterparty(
  _user_id uuid,
  _title text,
  _message text,
  _type text,
  _reference_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  party_a uuid;
  party_b uuid;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  -- Notifying yourself needs no relationship check.
  if caller = _user_id then
    insert into public.notifications (user_id, title, message, type, reference_id)
    values (_user_id, _title, _message, _type::notification_type, _reference_id);
    return;
  end if;

  if _reference_id is null then
    raise exception 'a reference_id is required to notify another user';
  end if;

  -- Which two people are allowed to talk about this reference?
  select o.customer_id, vp.user_id into party_a, party_b
  from public.orders o
  join public.vendor_profiles vp on vp.id = o.vendor_id
  where o.id = _reference_id;

  if party_a is null then
    select r.customer_id, vp.user_id into party_a, party_b
    from public.repair_requests r
    join public.vendor_profiles vp on vp.id = r.vendor_id
    where r.id = _reference_id;
  end if;

  if party_a is null then
    raise exception 'reference % is not an order or repair you are party to', _reference_id;
  end if;

  if not (
    (caller = party_a and _user_id = party_b) or
    (caller = party_b and _user_id = party_a)
  ) then
    raise exception 'you are not a counterparty on this transaction';
  end if;

  insert into public.notifications (user_id, title, message, type, reference_id)
  values (_user_id, _title, _message, _type::notification_type, _reference_id);
end;
$$;

grant execute on function public.notify_counterparty(uuid, text, text, text, uuid) to authenticated;
