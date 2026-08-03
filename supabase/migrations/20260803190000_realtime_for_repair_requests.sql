-- repair_requests was never added to the realtime publication, so the repair
-- page never updated live: a customer watching their repair saw nothing when
-- the technician moved it along, and a vendor watching saw nothing when the
-- customer paid or confirmed. Both sides had to reload to learn anything.
--
-- REPLICA IDENTITY FULL so the payload carries the whole row, matching how
-- notifications and messages were set up in 20260803040000. Without it an
-- UPDATE only ships the primary key and the changed columns, which is not
-- enough to re-render the page from.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'repair_requests'
  ) then
    alter publication supabase_realtime add table public.repair_requests;
  end if;
end $$;

alter table public.repair_requests replica identity full;
