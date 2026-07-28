-- 1. Extend vendor_verification_status enum
ALTER TYPE public.vendor_verification_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.vendor_verification_status ADD VALUE IF NOT EXISTS 'rejected';

-- 2. Extend repair_status enum
ALTER TYPE public.repair_status ADD VALUE IF NOT EXISTS 'quotation_sent';
ALTER TYPE public.repair_status ADD VALUE IF NOT EXISTS 'repair_in_progress';

-- 3. Extend notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'vendor_application';

-- 4. Create order_payment_status enum
DO $$ BEGIN
  CREATE TYPE public.order_payment_status AS ENUM ('pending','paid_float','released','refunded','failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 5. Add columns to vendor_profiles
ALTER TABLE public.vendor_profiles
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS google_maps_link text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 6. Add columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.order_payment_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS mpesa_receipt_number text;

-- 7. Add columns to repair_services
ALTER TABLE public.repair_services
  ADD COLUMN IF NOT EXISTS repair_type text,
  ADD COLUMN IF NOT EXISTS warranty_days integer DEFAULT 0;

-- 8. Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_products_vendor_active ON public.products(vendor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_status ON public.vendor_profiles(verification_status);

-- 9. Float auto-release scheduled function
CREATE OR REPLACE FUNCTION public.auto_release_float()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o record;
  vendor_user uuid;
BEGIN
  FOR o IN
    SELECT id, vendor_id, total_amount_ksh
    FROM public.orders
    WHERE status = 'delivered_awaiting_confirmation'
      AND confirmation_deadline IS NOT NULL
      AND confirmation_deadline < now()
  LOOP
    UPDATE public.orders
      SET status = 'confirmed',
          payment_status = 'released',
          float_released_at = now(),
          updated_at = now()
      WHERE id = o.id;

    SELECT user_id INTO vendor_user FROM public.vendor_profiles WHERE id = o.vendor_id;
    IF vendor_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        vendor_user,
        'Float auto-released',
        'Your payment of KES ' || o.total_amount_ksh || ' was automatically released because the customer did not confirm within 48 hours.',
        'payment',
        o.id
      );
    END IF;
  END LOOP;
END;
$$;