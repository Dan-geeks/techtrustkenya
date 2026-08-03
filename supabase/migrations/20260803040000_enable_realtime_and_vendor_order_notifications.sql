-- ---------------------------------------------------------------------------
-- 1. Enable Realtime.
--
-- The `supabase_realtime` publication was EMPTY, so every postgres_changes
-- subscription in the app silently never fired:
--   * ChatWidget            -> new chat messages never arrived live
--   * NotificationsBell     -> the bell never updated until a page reload
--   * OrderDetail           -> the order tracker never advanced without a refresh
-- Subscribing to a table that is not in the publication is not an error, it
-- just delivers nothing, which is why this looked like "notifications don't work"
-- rather than a hard failure.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.orders;

-- Realtime filters on UPDATE/DELETE only match columns carried by the replica
-- identity. Both of these are subscribed with event:"*" and filtered on a
-- NON-primary-key column (messages.receiver_id, notifications.user_id), so
-- without FULL the "mark as read" updates would not match the filter and unread
-- badges would never clear live.
alter table public.messages replica identity full;
alter table public.notifications replica identity full;

-- ---------------------------------------------------------------------------
-- 2. Vendor "new order" notification.
--
-- notifications has: INSERT WITH CHECK (auth.uid() = user_id).
-- The checkout flow ran as the CUSTOMER but addressed the row to the VENDOR,
-- so RLS rejected it every time and the vendor was never notified of an order.
-- A SECURITY DEFINER trigger is the correct place for this: it runs regardless
-- of who inserted the order, and it cannot be spoofed by a client.
-- ---------------------------------------------------------------------------
create or replace function public.notify_vendor_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user uuid;
  v_product text;
begin
  select user_id into v_user from vendor_profiles where id = NEW.vendor_id;
  select model_name into v_product from products where id = NEW.product_id;

  if v_user is not null then
    insert into notifications (user_id, title, message, type, reference_id)
    values (
      v_user,
      'New Order Received',
      'A customer has placed an order for ' || coalesce(v_product, 'your product') || '.',
      'order_update',   -- must be a notification_type enum value; "new_order" is not one
      NEW.id
    );
  end if;

  return NEW;
end
$fn$;

drop trigger if exists trg_orders_notify_vendor on public.orders;
create trigger trg_orders_notify_vendor
after insert on public.orders
for each row execute function public.notify_vendor_new_order();
