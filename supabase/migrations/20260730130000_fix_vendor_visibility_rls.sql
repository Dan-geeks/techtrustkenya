-- ============ FIX: PUBLIC VENDOR VISIBILITY RLS REGRESSION ============
-- 20260421063603 replaced the broader "verified OR approved" public SELECT
-- policy on vendor_profiles with an approved-only one, silently hiding every
-- vendor still marked 'verified' (5 of the 6 live vendors) from Browse's
-- inner join on vendor_profiles — hence "0 products found" for signed-in
-- customers even though the products themselves were active, in stock, and
-- correctly priced. Browse.tsx and redirectByRole.ts both already treat
-- 'verified' and 'approved' as equivalent live states; RLS now matches.
DROP POLICY IF EXISTS "Public can view approved vendors" ON public.vendor_profiles;

CREATE POLICY "Public can view approved vendors"
ON public.vendor_profiles FOR SELECT TO anon, authenticated
USING (verification_status IN ('verified', 'approved'));
