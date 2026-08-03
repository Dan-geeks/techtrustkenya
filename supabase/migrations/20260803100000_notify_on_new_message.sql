-- Chat notifications were flaky because nothing was ever recorded for them.
-- Both NotificationsBell and /notifications SYNTHESISED "New Message" entries
-- from messages still marked is_read = false. ChatWidget marks a thread read as
-- soon as it opens, so any message the recipient had already glanced at vanished
-- from notifications completely — "sometimes it comes, sometimes it doesn't".
--
-- Record a real notification per message instead. It survives the message being
-- read, so it shows consistently in the bell AND on the notifications page, on
-- both sides of a conversation. SECURITY DEFINER because the notifications
-- INSERT policy is WITH CHECK (auth.uid() = user_id) and the sender is never
-- the recipient.
create or replace function public.notify_on_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  _sender text;
begin
  select coalesce(nullif(trim(full_name), ''), 'Someone')
    into _sender
    from profiles where id = NEW.sender_id;

  insert into notifications (user_id, title, message, type, reference_id)
  values (
    NEW.receiver_id,
    'New message from ' || coalesce(_sender, 'Someone'),
    left(NEW.content, 140),
    'message',
    NEW.sender_id          -- clicking opens the chat with this person
  );

  return NEW;
end
$fn$;

drop trigger if exists trg_messages_notify on public.messages;
create trigger trg_messages_notify
after insert on public.messages
for each row execute function public.notify_on_new_message();
