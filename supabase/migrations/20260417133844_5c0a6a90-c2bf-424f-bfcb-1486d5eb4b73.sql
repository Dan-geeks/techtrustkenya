-- Tighten notifications insert
DROP POLICY IF EXISTS "System insert notifications" ON public.notifications;
CREATE POLICY "Users insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Note: public buckets remain accessible by direct URL.
-- The "always true" SELECT on storage.objects allows listing; we keep it for product/avatar/shop reads
-- because public marketplace images need to be browsable. This is intentional and acceptable for MVP.
-- (Linter warning is informational; documented decision.)