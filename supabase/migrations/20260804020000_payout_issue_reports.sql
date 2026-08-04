-- "Didn't receive the money?" for vendors, after a payout is released.
--
-- open_dispute deliberately refuses this case: it requires payment_status =
-- 'paid_float' and rejects an order that is already 'confirmed'. That guard is
-- right — flipping a completed order back to 'disputed' would reverse the
-- buyer's confirmation, undo their side of the escrow, and corrupt the vendor
-- stats that now derive from confirmed orders.
--
-- A missing payout is not a quarrel with the buyer; it is between the vendor
-- and TechTrust. So it gets its own lightweight report that raises a flag with
-- the admins and leaves the order alone.

create table if not exists public.payout_issue_reports (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  vendor_id    uuid not null references public.vendor_profiles(id) on delete cascade,
  reported_by  uuid not null,
  message      text not null,
  status       text not null default 'open' check (status in ('open','resolved')),
  resolution   text,
  resolved_at  timestamptz,
  resolved_by  uuid,
  created_at   timestamptz not null default now()
);

create index if not exists payout_issue_reports_open_idx
  on public.payout_issue_reports (status, created_at desc);

alter table public.payout_issue_reports enable row level security;

drop policy if exists "Vendor sees own payout reports" on public.payout_issue_reports;
create policy "Vendor sees own payout reports"
  on public.payout_issue_reports for select
  using (
    vendor_id in (select id from public.vendor_profiles where user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin')
  );

drop policy if exists "Admin manages payout reports" on public.payout_issue_reports;
create policy "Admin manages payout reports"
  on public.payout_issue_reports for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Inserts go through the RPC below, never directly.

create or replace function public.report_payout_issue(_order_id uuid, _message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders%rowtype;
  vendor_user uuid;
  vname text;
  admin_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(btrim(_message), '') = '' then
    raise exception 'please describe the problem';
  end if;

  select * into o from public.orders where id = _order_id;
  if not found then raise exception 'order not found'; end if;

  select vp.user_id, vp.business_name into vendor_user, vname
  from public.vendor_profiles vp where vp.id = o.vendor_id;

  -- Only the seller can report a missing payout; the buyer's route is a dispute.
  if auth.uid() is distinct from vendor_user then
    raise exception 'only the seller can report a payout problem on this order';
  end if;

  if exists (
    select 1 from public.payout_issue_reports
    where order_id = _order_id and status = 'open'
  ) then
    raise exception 'you already have an open payout report for this order';
  end if;

  insert into public.payout_issue_reports (order_id, vendor_id, reported_by, message)
  values (_order_id, o.vendor_id, auth.uid(), btrim(_message));

  for admin_id in select user_id from public.user_roles where role = 'admin' loop
    insert into public.notifications (user_id, type, title, message, reference_id)
    values (
      admin_id,
      'dispute',
      'Vendor reports a missing payout',
      coalesce(vname, 'A vendor') || ' says they have not received the payout for order #' ||
        upper(left(o.id::text, 8)) || ': ' || btrim(_message),
      o.id
    );
  end loop;

  -- Acknowledge to the vendor so the promise on screen is kept.
  insert into public.notifications (user_id, type, title, message, reference_id)
  values (
    auth.uid(),
    'payment',
    'Payout report received',
    'We have your report for order #' || upper(left(o.id::text, 8)) ||
      ' and will respond within 24 hours.',
    o.id
  );
end;
$$;

grant execute on function public.report_payout_issue(uuid, text) to authenticated;

-- Admin closes it out and tells the vendor.
create or replace function public.resolve_payout_issue(_report_id uuid, _resolution text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rep public.payout_issue_reports%rowtype;
  vendor_user uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'only an admin can resolve a payout report';
  end if;

  select * into rep from public.payout_issue_reports where id = _report_id for update;
  if not found then raise exception 'report not found'; end if;

  update public.payout_issue_reports
  set status = 'resolved',
      resolution = _resolution,
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = _report_id;

  select user_id into vendor_user from public.vendor_profiles where id = rep.vendor_id;
  if vendor_user is not null then
    insert into public.notifications (user_id, type, title, message, reference_id)
    values (vendor_user, 'payment', 'Payout report resolved',
            coalesce(_resolution, 'Your payout report has been resolved.'), rep.order_id);
  end if;
end;
$$;

grant execute on function public.resolve_payout_issue(uuid, text) to authenticated;
