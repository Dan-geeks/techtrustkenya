-- routeForNotification() sends every `repair_update` notification to
-- /repairs/<reference_id>, which is a REPAIR REQUEST id.
--
-- The vetting notifications added in 20260803120000 set reference_id to the
-- vendor_profiles id instead, so approving a technician would have sent them to
-- /repairs/<vendor_profile_id> — a repair request that does not exist. That is
-- the same class of bug as the missing /repairs/:id route itself: a link built
-- from an id of the wrong type.
--
-- These two messages have no repair request to point at, so they carry no
-- reference and land on /repairs — where a newly approved technician can see
-- their own listing, which is the useful destination anyway.

create or replace function public.notify_repair_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
begin
  if new.repair_application_status = 'pending'
     and coalesce(old.repair_application_status, 'none') <> 'pending' then
    -- vendor_application routes to /vendor/dashboard and ignores reference_id,
    -- so carrying the vendor row here is safe and useful for lookups.
    for admin_id in select user_id from public.user_roles where role = 'admin' loop
      insert into public.notifications (user_id, type, title, message, reference_id)
      values (
        admin_id,
        'vendor_application',
        'New repair technician application',
        coalesce(new.business_name, 'A vendor') || ' wants to offer repair services. Review their vetting steps.',
        new.id
      );
    end loop;

  elsif new.repair_application_status = 'approved'
        and coalesce(old.repair_application_status, 'none') <> 'approved' then
    insert into public.notifications (user_id, type, title, message, reference_id)
    values (
      new.user_id,
      'repair_update',
      'You are now a listed repair technician',
      'Your repair vetting is complete. Your shop now appears on the Repairs page and customers can book you.',
      null
    );

  elsif new.repair_application_status = 'rejected'
        and coalesce(old.repair_application_status, 'none') <> 'rejected' then
    insert into public.notifications (user_id, type, title, message, reference_id)
    values (
      new.user_id,
      'repair_update',
      'Repair application not approved',
      coalesce(new.repair_rejection_reason, 'Your repair technician application was not approved at this time.'),
      null
    );
  end if;

  return new;
end;
$$;
