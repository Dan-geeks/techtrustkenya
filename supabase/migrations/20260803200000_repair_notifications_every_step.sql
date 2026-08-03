-- A notification at every step of the repair flow, with wording that says what
-- actually happened and what to do next.
--
-- Two problems with what was there:
--
-- 1. notify_customer_repair_status fired only when `status` changed, and always
--    with the title "Repair update" and the body "Your repair is now: <status>".
--    So a quote arriving read as "Your repair is now: quotation sent" — the
--    customer was not told the price or that they had to do anything.
--
-- 2. Approving a quote produced a notification only because RepairDetail called
--    notify_counterparty afterwards. Any other path that set
--    customer_approved_quote — the vendor dashboard, a script, a future screen —
--    told the technician nothing. Deriving it from the row change instead means
--    it cannot be forgotten.

create or replace function public.notify_customer_repair_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  vendor_user uuid;
  shop text;
  device text := coalesce(NEW.device_description, 'your device');
begin
  select vp.user_id, vp.business_name into vendor_user, shop
  from public.vendor_profiles vp where vp.id = NEW.vendor_id;

  -- ---- status changes -----------------------------------------------------
  if NEW.status is distinct from OLD.status then
    if NEW.status = 'quotation_sent' then
      insert into public.notifications (user_id, type, title, message, reference_id)
      values (NEW.customer_id, 'repair_update',
        'Quote received for ' || device,
        coalesce(shop, 'The technician') || ' quoted ' ||
          coalesce('KES ' || to_char(NEW.quoted_price_ksh, 'FM999,999,999'), 'a price') ||
          ' to repair ' || device || '. Approve it to go ahead.',
        NEW.id);

    elsif NEW.status = 'diagnosing' then
      insert into public.notifications (user_id, type, title, message, reference_id)
      values (NEW.customer_id, 'repair_update', 'Diagnosis started',
        coalesce(shop, 'The technician') || ' has started diagnosing ' || device || '.', NEW.id);

    elsif NEW.status in ('in_repair', 'repair_in_progress') then
      insert into public.notifications (user_id, type, title, message, reference_id)
      values (NEW.customer_id, 'repair_update', 'Repair under way',
        device || ' is now being repaired.', NEW.id);

    elsif NEW.status = 'ready_for_collection' then
      insert into public.notifications (user_id, type, title, message, reference_id)
      values (NEW.customer_id, 'repair_update', 'Ready for collection',
        device || ' is ready. Collect it, check the fault is fixed, then confirm to release the payment.',
        NEW.id);

    elsif NEW.status = 'cancelled' then
      -- Tell whichever side did not do the cancelling.
      if auth.uid() is distinct from NEW.customer_id then
        insert into public.notifications (user_id, type, title, message, reference_id)
        values (NEW.customer_id, 'repair_update', 'Repair cancelled',
          'Your repair request for ' || device || ' was cancelled.', NEW.id);
      elsif vendor_user is not null then
        insert into public.notifications (user_id, type, title, message, reference_id)
        values (vendor_user, 'repair_update', 'Repair cancelled',
          'The customer cancelled the repair request for ' || device || '.', NEW.id);
      end if;

    elsif NEW.status = 'received' then
      -- Only reachable outside mark_repair_paid, which sends its own pair.
      if NEW.payment_status = 'unpaid' then
        insert into public.notifications (user_id, type, title, message, reference_id)
        values (NEW.customer_id, 'repair_update', 'Device received',
          coalesce(shop, 'The technician') || ' has received ' || device || '.', NEW.id);
      end if;
    end if;
  end if;

  -- ---- quote approved -----------------------------------------------------
  -- Derived from the row, not from whichever screen happened to do it.
  if NEW.customer_approved_quote and not coalesce(OLD.customer_approved_quote, false)
     and vendor_user is not null then
    insert into public.notifications (user_id, type, title, message, reference_id)
    values (vendor_user, 'repair_update', 'Quote approved',
      'The customer approved your quote of ' ||
        coalesce('KES ' || to_char(NEW.quoted_price_ksh, 'FM999,999,999'), 'the repair') ||
        ' for ' || device || '. They can now pay it into Float.',
      NEW.id);
  end if;

  return NEW;
end;
$$;
