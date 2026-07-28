-- Atomic order creation with stock check
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  _product_id uuid,
  _quantity integer,
  _phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer uuid := auth.uid();
  _product record;
  _total numeric;
  _fee numeric;
  _payout numeric;
  _order_id uuid;
BEGIN
  IF _customer IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _quantity < 1 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  SELECT id, vendor_id, price_ksh, quantity_in_stock, is_active
    INTO _product
    FROM public.products
    WHERE id = _product_id
    FOR UPDATE;

  IF NOT FOUND OR NOT _product.is_active THEN
    RAISE EXCEPTION 'Product unavailable';
  END IF;
  IF _product.quantity_in_stock < _quantity THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

  _total := _product.price_ksh * _quantity;
  _fee := round(_total * 0.10);
  _payout := _total - _fee;

  INSERT INTO public.orders (
    customer_id, vendor_id, product_id, quantity,
    total_amount_ksh, platform_fee_ksh, vendor_payout_ksh,
    status, payment_status
  )
  VALUES (
    _customer, _product.vendor_id, _product.id, _quantity,
    _total, _fee, _payout,
    'pending_payment', 'pending'
  )
  RETURNING id INTO _order_id;

  RETURN _order_id;
END;
$$;

-- Mark order paid (used by mpesa-callback edge function via service role)
CREATE OR REPLACE FUNCTION public.mark_order_paid(
  _order_id uuid,
  _receipt text,
  _mpesa_tx text
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

  -- Deduct stock
  UPDATE public.products
    SET quantity_in_stock = quantity_in_stock - _o.quantity,
        updated_at = now()
    WHERE id = _o.product_id AND quantity_in_stock >= _o.quantity;

  IF NOT FOUND THEN
    UPDATE public.orders
      SET status = 'cancelled', payment_status = 'failed', updated_at = now()
      WHERE id = _order_id;
    RAISE EXCEPTION 'Stock no longer available';
  END IF;

  UPDATE public.orders
    SET payment_status = 'paid_float',
        status = 'payment_held',
        mpesa_receipt_number = _receipt,
        mpesa_transaction_id = _mpesa_tx,
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
    'Your payment of KES ' || _o.total_amount_ksh || ' is held safely in Float until you confirm delivery.',
    'payment',
    _order_id
  );
END;
$$;

-- RLS: customers can insert their own orders
DROP POLICY IF EXISTS "customers_insert_own_orders" ON public.orders;
CREATE POLICY "customers_insert_own_orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- RLS: customers can view their own orders
DROP POLICY IF EXISTS "customers_view_own_orders" ON public.orders;
CREATE POLICY "customers_view_own_orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id
    OR EXISTS (
      SELECT 1 FROM public.vendor_profiles vp
      WHERE vp.id = orders.vendor_id AND vp.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- RLS: customers can update only to confirm or dispute their own orders
DROP POLICY IF EXISTS "customers_update_own_orders" ON public.orders;
CREATE POLICY "customers_update_own_orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);
