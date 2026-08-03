-- A repair request reached no one. BookRepair never inserted a row (its submit
-- was a setTimeout), and even once it does, nothing told the technician.
-- Mirror the order flow: notify the vendor's owner account on insert.
-- SECURITY DEFINER because notifications INSERT is WITH CHECK (auth.uid() =
-- user_id) and the customer is never the recipient.
create or replace function public.notify_vendor_new_repair_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  _vendor_user uuid;
begin
  select user_id into _vendor_user from vendor_profiles where id = NEW.vendor_id;

  if _vendor_user is not null then
    insert into notifications (user_id, title, message, type, reference_id)
    values (
      _vendor_user,
      'New repair request',
      'A customer has requested a repair for ' || coalesce(NEW.device_description, 'a device') || '.',
      'repair_update',
      NEW.id
    );
  end if;

  return NEW;
end
$fn$;

drop trigger if exists trg_repair_requests_notify_vendor on public.repair_requests;
create trigger trg_repair_requests_notify_vendor
after insert on public.repair_requests
for each row execute function public.notify_vendor_new_repair_request();

-- The customer must see status changes (quote sent, in repair, ready).
create or replace function public.notify_customer_repair_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if NEW.status is distinct from OLD.status then
    insert into notifications (user_id, title, message, type, reference_id)
    values (
      NEW.customer_id,
      'Repair update',
      'Your repair is now: ' || replace(NEW.status::text, '_', ' ') ||
        case when NEW.quoted_price_ksh is not null and NEW.status::text = 'quotation_sent'
             then ' (KES ' || NEW.quoted_price_ksh || ')' else '' end,
      'repair_update',
      NEW.id
    );
  end if;
  return NEW;
end
$fn$;

drop trigger if exists trg_repair_requests_notify_customer on public.repair_requests;
create trigger trg_repair_requests_notify_customer
after update on public.repair_requests
for each row execute function public.notify_customer_repair_status();
