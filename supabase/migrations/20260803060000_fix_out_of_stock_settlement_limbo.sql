-- settle_order_into_float() marked an order cancelled/failed when stock had run
-- out and then RAISE EXCEPTION'd. The raise aborts the transaction, so that very
-- UPDATE is rolled back with it: the order stays 'pending_payment'/'pending'
-- forever while the customer's money has already left their M-Pesa.
--
-- Observed live: order 902ab4bc paid (receipt UH3KF1NQS5, KES 1) against a
-- product whose quantity_in_stock had reached 0. /payment-status retried
-- endlessly, each attempt logging "Stock no longer available", and the order
-- never left pending. That is the "money in limbo" state the Float spec says
-- must never exist.
--
-- Fix: record the failure and RETURN normally so the write commits. Callers
-- already read payment_status back, so they see 'failed' and can refund.
create or replace function public.settle_order_into_float(
  _order_id uuid,
  _receipt text,
  _mpesa_tx text,
  _paid_amount_ksh integer default null,
  _payment_provider text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
    -- Money was taken but the item is gone. Persist this (no RAISE) and tell
    -- both sides, so it surfaces as a refundable failure instead of limbo.
    UPDATE public.orders
      SET status = 'cancelled',
          payment_status = 'failed',
          mpesa_receipt_number = COALESCE(_receipt, mpesa_receipt_number),
          mpesa_transaction_id = COALESCE(_mpesa_tx, mpesa_transaction_id),
          paid_amount_ksh = COALESCE(_paid_amount_ksh, paid_amount_ksh),
          payment_provider = COALESCE(_payment_provider, payment_provider),
          payment_gateway_response = jsonb_build_object(
            'error', 'Stock no longer available',
            'receipt', _receipt,
            'refund_required', true),
          updated_at = now()
      WHERE id = _order_id;

    INSERT INTO public.notifications (user_id, title, message, type, reference_id)
    VALUES (
      _o.customer_id,
      'Payment could not be completed',
      'This item sold out before your payment settled. Your money has not been held in Float and a refund is due.',
      'payment',
      _order_id
    );

    SELECT user_id INTO _vendor_user FROM public.vendor_profiles WHERE id = _o.vendor_id;
    IF _vendor_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, reference_id)
      VALUES (
        _vendor_user,
        'Order failed - out of stock',
        'A customer paid for an item that was already out of stock. A refund is required.',
        'order_update',
        _order_id
      );
    END IF;

    RETURN;   -- commit the failure instead of rolling it back
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
END
$$;
