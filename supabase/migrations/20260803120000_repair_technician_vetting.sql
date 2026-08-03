-- Repair technician vetting.
--
-- Before this, ticking "I offer repairs" in onboarding set vendor_profiles
-- .offers_repairs and nothing else happened: the admin Repairs tab only ever
-- listed repair_requests, so a vendor who volunteered was invisible to the
-- admin, and /repairs listed anyone with the flag set — no vetting at all.
--
-- Now the flag is an APPLICATION. It puts the vendor in front of an admin, who
-- clears three checks before they are listed publicly:
--
--   1. identity  — ID + business certificate seen, business verified
--   2. skills    — repair experience / certification reviewed
--   3. safety    — data-handling and safety briefing acknowledged
--
-- Only when all three are true can the application move to 'approved', and only
-- 'approved' vendors appear on /repairs or in the /book-repair technician list.

alter table public.vendor_profiles
  add column if not exists repair_application_status text not null default 'none',
  add column if not exists repair_step_identity      boolean not null default false,
  add column if not exists repair_step_skills        boolean not null default false,
  add column if not exists repair_step_safety        boolean not null default false,
  add column if not exists repair_applied_at         timestamptz,
  add column if not exists repair_approved_at        timestamptz,
  add column if not exists repair_approved_by        uuid,
  add column if not exists repair_rejection_reason   text,
  add column if not exists repair_specialties        text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vendor_profiles_repair_application_status_check'
  ) then
    alter table public.vendor_profiles
      add constraint vendor_profiles_repair_application_status_check
      check (repair_application_status in ('none','pending','approved','rejected'));
  end if;
end $$;

-- Partial index: the public /repairs query is exactly this predicate.
create index if not exists vendor_profiles_approved_technicians_idx
  on public.vendor_profiles (repair_application_status)
  where offers_repairs = true and repair_application_status = 'approved';

-- ---------------------------------------------------------------------------
-- Ticking the box files an application; unticking withdraws it.
-- ---------------------------------------------------------------------------
create or replace function public.sync_repair_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.offers_repairs then
      new.repair_application_status := 'pending';
      new.repair_applied_at := now();
    end if;
    return new;
  end if;

  -- Vendor just volunteered: (re)open an application.
  if new.offers_repairs and not coalesce(old.offers_repairs, false) then
    if coalesce(old.repair_application_status, 'none') in ('none', 'rejected') then
      new.repair_application_status := 'pending';
      new.repair_applied_at := now();
      new.repair_rejection_reason := null;
    end if;
  end if;

  -- Vendor withdrew: drop the application and every check with it, so
  -- re-applying later starts from a clean slate rather than inheriting stale
  -- ticks from a previous review.
  if not new.offers_repairs and coalesce(old.offers_repairs, false) then
    new.repair_application_status := 'none';
    new.repair_step_identity := false;
    new.repair_step_skills   := false;
    new.repair_step_safety   := false;
    new.repair_approved_at   := null;
    new.repair_approved_by   := null;
  end if;

  -- Approval is only ever valid with all three checks cleared. This is the
  -- backstop for the UI's own guard.
  if new.repair_application_status = 'approved'
     and not (new.repair_step_identity and new.repair_step_skills and new.repair_step_safety) then
    raise exception 'all three vetting steps must be cleared before approving a repair technician';
  end if;

  if new.repair_application_status = 'approved'
     and coalesce(old.repair_application_status, 'none') <> 'approved' then
    new.repair_approved_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists sync_repair_application_trg on public.vendor_profiles;
create trigger sync_repair_application_trg
  before insert or update on public.vendor_profiles
  for each row execute function public.sync_repair_application();

-- ---------------------------------------------------------------------------
-- A vendor must not be able to vet themselves.
--
-- "Users can update own vendor profile" is a broad USING/WITH CHECK on
-- user_id, so without this a vendor could PATCH repair_application_status
-- straight to 'approved' from the browser. Non-admins get the old values of
-- every review column forced back on top of whatever they sent.
-- ---------------------------------------------------------------------------
create or replace function public.protect_repair_vetting_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for the service role and for server-side jobs; those
  -- are trusted. Anyone else must hold the admin role.
  if auth.uid() is not null and not public.has_role(auth.uid(), 'admin') then
    new.repair_application_status := old.repair_application_status;
    new.repair_step_identity      := old.repair_step_identity;
    new.repair_step_skills        := old.repair_step_skills;
    new.repair_step_safety        := old.repair_step_safety;
    new.repair_approved_at        := old.repair_approved_at;
    new.repair_approved_by        := old.repair_approved_by;
    new.repair_rejection_reason   := old.repair_rejection_reason;
    new.verification_status       := old.verification_status;
  end if;
  return new;
end;
$$;

-- Runs BEFORE sync_repair_application (alphabetical order on equal timing), so
-- the "vendor ticked the box" path above still sees the vendor's real intent
-- for offers_repairs while the review columns stay locked down.
drop trigger if exists protect_repair_vetting_columns_trg on public.vendor_profiles;
create trigger protect_repair_vetting_columns_trg
  before update on public.vendor_profiles
  for each row execute function public.protect_repair_vetting_columns();

-- ---------------------------------------------------------------------------
-- Tell the admins an application landed, and tell the vendor the outcome.
-- ---------------------------------------------------------------------------
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
    -- notifications has no `link` column; reference_id carries the vendor row
    -- and the client routes off `type`.
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
      new.id
    );

  elsif new.repair_application_status = 'rejected'
        and coalesce(old.repair_application_status, 'none') <> 'rejected' then
    insert into public.notifications (user_id, type, title, message, reference_id)
    values (
      new.user_id,
      'repair_update',
      'Repair application not approved',
      coalesce(new.repair_rejection_reason, 'Your repair technician application was not approved at this time.'),
      new.id
    );
  end if;

  return new;
end;
$$;

-- NOT `after update of repair_application_status`. That clause fires on the
-- columns named in the UPDATE statement, not on what a BEFORE trigger changed —
-- and the commonest path here is the vendor toggling `offers_repairs` alone,
-- with sync_repair_application deriving the new status. Restricting the column
-- list silently swallowed exactly that case. The guards inside the function
-- already make every other update a no-op.
drop trigger if exists notify_repair_application_trg on public.vendor_profiles;
create trigger notify_repair_application_trg
  after insert or update on public.vendor_profiles
  for each row execute function public.notify_repair_application();

-- ---------------------------------------------------------------------------
-- Approved technicians must be publicly readable even before the shop itself
-- is marked verified, otherwise /repairs shows an empty list for a technician
-- the admin has explicitly cleared.
-- ---------------------------------------------------------------------------
drop policy if exists "Public can view approved repair technicians" on public.vendor_profiles;
create policy "Public can view approved repair technicians"
  on public.vendor_profiles for select
  using (offers_repairs = true and repair_application_status = 'approved');

-- ---------------------------------------------------------------------------
-- Backfill: anyone already carrying the flag becomes a pending application, so
-- they surface in the admin queue instead of silently disappearing.
-- ---------------------------------------------------------------------------
update public.vendor_profiles
set repair_application_status = 'pending',
    repair_applied_at = coalesce(repair_applied_at, created_at, now())
where offers_repairs = true
  and repair_application_status = 'none';
