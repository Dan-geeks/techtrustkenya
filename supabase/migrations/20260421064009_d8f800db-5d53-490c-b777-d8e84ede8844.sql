ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS completed_transactions_count integer NOT NULL DEFAULT 0;

UPDATE public.vendor_profiles
SET completed_transactions_count = COALESCE(completed_transactions_count, total_completed_transactions),
    total_completed_transactions = COALESCE(total_completed_transactions, completed_transactions_count)
WHERE completed_transactions_count IS DISTINCT FROM total_completed_transactions;

CREATE OR REPLACE FUNCTION public.sync_vendor_profile_transaction_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.completed_transactions_count IS NULL THEN
    NEW.completed_transactions_count := COALESCE(NEW.total_completed_transactions, 0);
  END IF;
  IF NEW.total_completed_transactions IS NULL THEN
    NEW.total_completed_transactions := COALESCE(NEW.completed_transactions_count, 0);
  END IF;
  IF NEW.completed_transactions_count IS DISTINCT FROM OLD.completed_transactions_count THEN
    NEW.total_completed_transactions := NEW.completed_transactions_count;
  ELSIF NEW.total_completed_transactions IS DISTINCT FROM OLD.total_completed_transactions THEN
    NEW.completed_transactions_count := NEW.total_completed_transactions;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_vendor_profile_transaction_counts_trigger ON public.vendor_profiles;
CREATE TRIGGER sync_vendor_profile_transaction_counts_trigger
BEFORE UPDATE ON public.vendor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_vendor_profile_transaction_counts();