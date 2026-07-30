import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Shield,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatKsh } from "@/lib/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLATFORM_FEE_RATE = 0.1;

const conditionStyles: Record<string, string> = {
  new: "bg-success-soft text-success border-success/20",
  refurbished: "bg-accent-soft text-accent border-accent/20",
  used: "bg-muted text-muted-foreground border-border",
};


const Cart = () => {
  const { items, loading, removeItem, setQuantity, count, refresh } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    document.title = "Your cart — TechTrust";
  }, []);

  useEffect(() => {
    if (!user) navigate("/auth", { replace: true });
  }, [user, navigate]);

  // Always refetch on mount so we never show a stale empty cart
  useEffect(() => {
    if (user) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const subtotal = items.reduce(
    (s, it) => s + (it.product?.price_ksh ?? 0) * it.quantity,
    0
  );
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE);
  const total = subtotal + platformFee;

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckingOut(true);
    const created: string[] = [];
    for (const it of items) {
      const { data, error } = await supabase.rpc("create_order_atomic", {
        _product_id: it.product_id,
        _quantity: it.quantity,
      });
      if (error) {
        toast.error(`${it.product?.brand ?? "Item"}: ${error.message}`);
      } else if (data) {
        created.push(data as string);
        await supabase.from("cart_items").delete().eq("id", it.id);
      }
    }
    setCheckingOut(false);
    if (created.length === 0) {
      toast.error("Could not start checkout for any item.");
      return;
    }
    if (created.length > 1) {
      toast.success(`${created.length} orders created. Pay each from My Orders.`);
      navigate("/orders");
    } else {
      navigate(`/checkout/${created[0]}`);
    }
  };

  if (loading) {
    return (
      <div className="container py-20 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container py-24 max-w-lg text-center">
        <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground/50" />
        <h1 className="text-2xl font-bold mt-6">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">
          Discover certified refurbished devices from trusted vendors.
        </p>
        <Button
          variant="hero"
          size="lg"
          className="mt-8"
          onClick={() => navigate("/browse")}
        >
          Start Shopping
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const itemLabel = `${count} ${count === 1 ? "item" : "items"}`;

  return (
    <div className="container py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">
        Your cart{" "}
        <span className="text-muted-foreground font-normal text-xl">
          ({itemLabel})
        </span>
      </h1>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          {items.map((it) => {
            const p = it.product;
            const max = p?.quantity_in_stock ?? 99;
            const condition = p?.condition ?? "refurbished";
            const lineTotal = (p?.price_ksh ?? 0) * it.quantity;
            return (
              <Card
                key={it.id}
                className="p-5 relative border hover:border-accent/40 transition-colors duration-200"
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeItem(it.id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="flex gap-4 pr-10">
                  <img
                    src={p?.image_urls?.[0] ?? "/placeholder.svg"}
                    alt={p?.model_name ?? "Product"}
                    className="h-20 w-20 rounded-lg object-cover bg-muted shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {p?.brand} {p?.model_name}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {p?.vendor?.business_name ?? "Vendor"}
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        "mt-2 text-xs capitalize",
                        conditionStyles[condition]
                      )}
                    >
                      {condition}
                    </Badge>

                    <div className="text-sm font-medium mt-2">
                      {formatKsh(p?.price_ksh ?? 0)} each
                    </div>

                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          setQuantity(it.id, Math.max(1, it.quantity - 1))
                        }
                        disabled={it.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-9 text-center text-sm font-medium select-none">
                        {it.quantity}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() =>
                          setQuantity(it.id, Math.min(max, it.quantity + 1))
                        }
                        disabled={it.quantity >= max}
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground ml-2">
                        {max} in stock
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 self-center font-semibold text-base">
                    {formatKsh(lineTotal)}
                  </span>
                </div>
              </Card>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => navigate("/browse")}
          >
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />
            Continue Shopping
          </Button>
        </div>

        <div className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-24">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-5">Order Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal ({itemLabel})
                </span>
                <span>{formatKsh(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform fee (10%)</span>
                <span>{formatKsh(platformFee)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mt-5 pt-4 border-t border-border">
              <span className="font-semibold text-base">Total</span>
              <span className="text-2xl font-bold">{formatKsh(total)}</span>
            </div>

            <Button
              variant="hero"
              size="lg"
              className="w-full mt-5"
              onClick={handleCheckout}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              {checkingOut ? "Creating orders…" : "Proceed to Checkout"}
            </Button>

            <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-success/5 border border-success/20">
              <Shield className="h-4 w-4 text-success shrink-0" />
              <p className="text-xs text-muted-foreground">
                Payments are held in{" "}
                <span className="font-medium text-foreground">
                  TechTrust Float
                </span>{" "}
                and released only after delivery is confirmed.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Shield className="h-3.5 w-3.5 text-success shrink-0" />
        Payments held in Float — released only when you confirm delivery.
      </p>
    </div>
  );
};

export default Cart;
