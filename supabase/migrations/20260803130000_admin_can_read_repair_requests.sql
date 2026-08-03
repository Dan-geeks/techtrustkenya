-- The admin Repairs tab queries repair_requests, but the only SELECT policies
-- on that table were "Customer view own repairs" and "Vendor view own repairs".
-- An admin matched neither, so the tab was permanently empty no matter how many
-- repairs existed — it looked like "no repair requests found" rather than a
-- permissions problem, which is why it went unnoticed.
--
-- Admins already have a blanket ALL policy on vendor_profiles and orders; this
-- brings repair_requests in line.

drop policy if exists "Admin manages repair requests" on public.repair_requests;
create policy "Admin manages repair requests"
  on public.repair_requests for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Same gap on repair_services, which the admin tab joins for the service name.
drop policy if exists "Admin manages repair services" on public.repair_services;
create policy "Admin manages repair services"
  on public.repair_services for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
