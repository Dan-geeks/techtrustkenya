-- Harden the TechTrust Float workflow for KCB Buni / mobile-money escrow.
-- Payments are collected into Float first, then customer confirmation starts a
-- server-side vendor payout. Payouts are only marked released after a final
-- simulator result or gateway payout callback/result.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_amount_ksh integer,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_gateway_response jsonb,
  ADD COLUMN IF NOT EXISTS payout_provider text,
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS payout_error text,
  ADD COLUMN IF NOT EXISTS payout_gateway_response jsonb;

CREATE INDEX IF NOT EXISTS idx_orders_mpesa_transaction_id
  ON public.orders(mpesa_transaction_id)
  WHERE mpesa_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payout_reference
  ON public.orders(payout_reference)
  WHERE payout_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_payout_status
  ON public.orders(payout_status);

CREATE TABLE IF NOT EXISTS public.order_payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  provider text,
  amount_ksh integer,
  reference text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_payment_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_order_payment_events_order
  ON public.order_payment_events(order_id, created_at DESC);

DROP POLICY IF EXISTS "Order parties can view payment events" ON public.order_payment_events;
CREATE POLICY "Order parties can view payment events"
  ON public.order_payment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = order_payment_events.order_id
        AND (
          o.customer_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.vendor_profiles vp
            WHERE vp.id = o.vendor_id AND vp.user_id = auth.uid()
          )
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Service role can insert payment events" ON public.order_payment_events;
CREATE POLICY "Service role can insert payment events"
  ON public.order_payment_events FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Edge functions use the service-role key, which bypasses RLS. This policy is
-- only for explicit admin inserts from SQL/API clients.

CREATE OR REPLACE FUNCTION public.mark_order_paid(
  _order_id uuid,
  _receipt text,
  _mpesa_tx text,
  _paid_amount_ksh integer DEFAULT NULL,
  _payment_provider text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _o record;
  _vendor_user uuid;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF _o.payment_status <> 'pending' THEN RETURN; END IF;

  UPDATE public.products
    SET quantity_in_stock = quantity_in_stock - _o.quantity,
        updated_at = now()
    WHERE id = _o.product_id AND quantity_in_stock >= _o.quantity;

  IF NOT FOUND THEN
    UPDATE public.orders
      SET status = 'cancelled',
          payment_status = 'failed',
          payment_gateway_response = jsonb_build_object('error', 'Stock no longer available'),
          updated_at = now()
      WHERE id = _order_id;
    RAISE EXCEPTION 'Stock no longer available';
  END IF;

  UPDATE public.orders
    SET payment_status = 'paid_float',
        status = 'payment_held',
        mpesa_receipt_number = _receipt,
        mpesa_transaction_id = _mpesa_tx,
        paid_amount_ksh = COALESCE(_paid_amount_ksh, _o.total_amount_ksh),
        payment_provider = COALESCE(_payment_provider, payment_provider),
        payout_status = 'not_started',
        payout_error = NULL,
        confirmation_deadline = now() + interval '48 hours',
        updated_at = now()
    WHERE id = _order_id;

  SELECT user_id INTO _vendor_user FROM public.vendor_profiles WHERE id = _o.vendor_id;
  IF _vendor_user IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      _vendor_user,
      'New paid order',
      'You have a new order. Payment of KES ' || _o.total_amount_ksh || ' is held in Float. Prepare for delivery.',
      'order_update',
      _order_id
    );
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, reference_id)
  VALUES (
    _o.customer_id,
    'Payment received',
    'Your payment of KES ' || COALESCE(_paid_amount_ksh, _o.total_amount_ksh) || ' is held safely in Float until you confirm delivery.',
    'payment',
    _order_id
  );
END;
$$;

-- The previous database-only auto-release marked funds released without a
-- vendor payout. Keep the deadline detector, but do not change payment_status
-- to released; a scheduled edge function or admin process should initiate a
-- real payout.
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
      AND payment_status = 'paid_float'
      AND confirmation_deadline IS NOT NULL
      AND confirmation_deadline < now()
      AND payout_status IN ('not_started', 'failed')
  LOOP
    UPDATE public.orders
      SET payout_status = 'auto_release_due',
          updated_at = now()
      WHERE id = o.id;

    SELECT user_id INTO vendor_user FROM public.vendor_profiles WHERE id = o.vendor_id;
    IF vendor_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        vendor_user,
        'Float release review due',
        'The customer confirmation window expired for order ' || left(o.id::text, 8) || '. TechTrust must initiate a verified payout before funds are marked released.',
        'payment',
        o.id
      );
    END IF;
  END LOOP;
END;
$$;
