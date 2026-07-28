import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: any;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  loading: boolean;
  addToCart: (productId: string, qty?: number) => Promise<boolean>;
  removeItem: (itemId: string) => Promise<void>;
  setQuantity: (itemId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const ensureCart = async (userId: string): Promise<string | null> => {
  const { data: existing, error: selErr } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", userId)
    .maybeSingle();
  if (selErr) console.error("cart select error", selErr);
  if (existing) return existing.id;
  // Use upsert in case another tab created one in parallel (unique constraint on customer_id)
  const { data: created, error } = await supabase
    .from("carts")
    .upsert({ customer_id: userId }, { onConflict: "customer_id" })
    .select("id")
    .single();
  if (error) {
    console.error("Failed to create cart", error);
    // Fallback: re-query in case of race
    const { data: retry } = await supabase
      .from("carts")
      .select("id")
      .eq("customer_id", userId)
      .maybeSingle();
    return retry?.id ?? null;
  }
  return created.id;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartId, setCartId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setCartId(null);
      return;
    }
    setLoading(true);
    const id = await ensureCart(user.id);
    setCartId(id);
    if (!id) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        "id, product_id, quantity, product:products(id, brand, model_name, price_ksh, image_urls, quantity_in_stock, is_active, vendor_id, vendor:vendor_profiles(id, business_name))",
      )
      .eq("cart_id", id)
      .order("created_at", { ascending: true });
    if (error) console.error("cart_items load error", error);
    setItems((data as any[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: refetch when our cart_items change
  useEffect(() => {
    if (!cartId) return;
    const channel = supabase
      .channel(`cart-items-${cartId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cart_items", filter: `cart_id=eq.${cartId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cartId, refresh]);

  const addToCart = async (productId: string, qty = 1) => {
    if (!user) return false;
    // Validate product is purchasable
    const { data: prod, error: prodErr } = await supabase
      .from("products")
      .select("id, is_active, quantity_in_stock")
      .eq("id", productId)
      .maybeSingle();
    if (prodErr || !prod) {
      toast.error("Product not found");
      return false;
    }
    if (!prod.is_active) {
      toast.error("Product is no longer available");
      return false;
    }
    if ((prod.quantity_in_stock ?? 0) < qty) {
      toast.error("Not enough stock");
      return false;
    }
    const id = cartId ?? (await ensureCart(user.id));
    if (!id) {
      toast.error("Could not access your cart");
      return false;
    }
    if (!cartId) setCartId(id);

    const { data: existing, error: selErr } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", id)
      .eq("product_id", productId)
      .maybeSingle();
    if (selErr) {
      toast.error(selErr.message);
      return false;
    }

    let error: any = null;
    if (existing) {
      ({ error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + qty })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("cart_items")
        .insert({ cart_id: id, product_id: productId, quantity: qty }));
    }
    if (error) {
      toast.error(error.message);
      return false;
    }
    await refresh();
    return true;
  };

  const removeItem = async (itemId: string) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
    if (error) toast.error(error.message);
    else await refresh();
  };

  const setQuantity = async (itemId: string, qty: number) => {
    if (qty < 1) return;
    const { error } = await supabase.from("cart_items").update({ quantity: qty }).eq("id", itemId);
    if (error) toast.error(error.message);
    else await refresh();
  };

  const clearCart = async () => {
    if (!user || !cartId) return;
    await supabase.from("cart_items").delete().eq("cart_id", cartId);
    await refresh();
  };

  const count = items.reduce((s, it) => s + it.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, loading, addToCart, removeItem, setQuantity, clearCart, refresh }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
