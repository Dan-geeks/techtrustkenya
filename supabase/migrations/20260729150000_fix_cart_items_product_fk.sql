-- cart_items.product_id was created without a foreign key to products(id),
-- which breaks PostgREST's embedded-resource syntax (product:products(...)) used by
-- useCart's refresh() query — every read after a successful add-to-cart insert
-- fails with PGRST200 "Could not find a relationship between 'cart_items' and 'products'".
ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
