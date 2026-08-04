import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Trash2, ArrowLeft, Info, Shield, CheckCircle2, ChevronRight, ShoppingBag, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { isVendorVerified } from "@/lib/format";

/**
 * The cart page was showing two hardcoded demo products (a Sony A7 IV and a
 * MacBook Pro) held in local state, so removing them "worked" until the next
 * render and they came straight back - and a real add-to-cart never showed up
 * here at all. It now reads the same `cart_items` rows as the rest of the app
 * through useCart, which already handles stock checks, quantities and realtime.
 */
const Cart = () => {
  const { items: cartItems, loading, removeItem, setQuantity } = useCart();

  useEffect(() => {
    document.title = "Shopping Cart | TechTrust Kenya";
  }, []);

  // Flatten the joined rows into what this page renders.
  const items = cartItems.map((ci) => {
    const p = ci.product ?? {};
    return {
      id: ci.id,
      title: [p.brand, p.model_name].filter(Boolean).join(" ") || "Item",
      price: Number(p.price_ksh ?? 0),
      quantity: ci.quantity,
      image: p.image_urls?.[0] || "/placeholder.svg",
      vendor: p.vendor?.business_name ?? "TechTrust vendor",
      vendorVerified: isVendorVerified(p.vendor?.verification_status),
    };
  });

  const handleUpdateQuantity = (id: string, delta: number) => {
    const current = items.find((i) => i.id === id);
    if (!current) return;
    void setQuantity(id, Math.max(1, current.quantity + delta));
  };

  const handleRemoveItem = (id: string) => {
    void removeItem(id);
  };

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal;

  if (loading && items.length === 0) {
    return (
      <div className="bg-slate-50 min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0F3D8C]" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 text-[#0F172A] antialiased min-h-screen">
      <main className="w-full max-w-container-max mx-auto px-6 md:px-12 py-8 md:py-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-[#64748B] mb-6">
          <Link to="/" className="hover:text-[#0F3D8C]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/browse" className="hover:text-[#0F3D8C]">Marketplace</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-[#0F172A]">Shopping Cart</span>
        </div>

        {/* Page Title & Back Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display-h2 text-3xl md:text-4xl font-bold text-[#0F172A] flex items-center gap-3">
              <span>Shopping Cart</span>
              <span className="text-sm font-semibold bg-[#EEF2FF] text-[#0F3D8C] px-3 py-1 rounded-full border border-[#0F3D8C]/20">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            </h1>
            <p className="text-sm text-[#64748B] mt-1">
              Review your items before securing your order with Float Escrow.
            </p>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0F3D8C] hover:underline bg-white px-4 py-2 rounded-xl border border-[#CBD5E1] shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
            <div className="w-16 h-16 bg-[#EEF2FF] rounded-2xl mx-auto flex items-center justify-center text-[#0F3D8C]">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Your cart is empty</h2>
            <p className="text-sm text-[#64748B]">
              Browse Kenya's verified tech marketplace to add inspectable electronics to your cart.
            </p>
            <Link
              to="/browse"
              className="inline-block bg-[#0F3D8C] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#0A2D6B] transition-all shadow-md mt-2"
            >
              Browse Verified Tech
            </Link>
          </div>
        ) : (
          /* Cart Content Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] hover:shadow-md transition-all flex flex-col sm:flex-row gap-6 items-center sm:items-start"
                >
                  {/* Thumbnail */}
                  <div className="w-full sm:w-44 h-32 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 relative border border-[#E2E8F0] flex items-center justify-center p-2">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 w-full flex flex-col justify-between h-full space-y-4">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h3 className="font-bold text-base md:text-lg text-[#0F172A] leading-snug">
                          {item.title}
                        </h3>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          aria-label={`Remove ${item.title} from cart`}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#64748B]">Sold by:</span>
                        <span className="text-xs font-semibold text-[#0F3D8C]">{item.vendor}</span>
                        {item.vendorVerified && (
                          <div className="inline-flex items-center gap-1 bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full border border-[#10B981]/20">
                            <CheckCircle2 className="h-3 w-3" />
                            <span className="text-[11px] font-bold">Verified</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity & Price */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div className="flex items-center border border-[#CBD5E1] rounded-lg overflow-hidden bg-slate-50">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, -1)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0F172A] font-bold text-sm transition-colors border-r border-[#CBD5E1]"
                        >
                          -
                        </button>
                        <span className="px-4 py-1.5 font-mono text-sm font-bold text-[#0F172A]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, 1)}
                          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-[#0F172A] font-bold text-sm transition-colors border-l border-[#CBD5E1]"
                        >
                          +
                        </button>
                      </div>

                      <div className="font-mono text-xl font-bold text-[#0F172A] text-price font-data-price">
                        KES {(item.price * item.quantity).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Escrow Summary Sidebar */}
            <div className="lg:col-span-4 sticky top-24">
              <div className="bg-white rounded-2xl p-6 shadow-md border border-[#E2E8F0] space-y-6">
                <h2 className="text-lg font-bold text-[#0F172A] pb-4 border-b border-[#E2E8F0] flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#0F3D8C]" />
                  <span>Float Escrow Summary</span>
                </h2>

                {/* Security Guarantee Notice */}
                <div className="bg-[#EEF2FF] border border-[#0F3D8C]/20 rounded-xl p-4 text-xs text-[#0F3D8C] space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">
                      Your funds will be safely held in a <strong>TechTrust Float Escrow</strong> account. The vendor is only paid after you receive and inspect your items.
                    </p>
                  </div>
                </div>

                {/* Pricing Line Items */}
                <div className="space-y-3 text-sm border-b border-[#E2E8F0] pb-6">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Subtotal ({items.length} items)</span>
                    <span className="font-mono text-[#0F172A] font-bold text-price">
                      KES {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Buyer Protection Fee</span>
                    <span className="font-mono text-[#10B981] font-bold">
                      FREE
                    </span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>Estimated Shipping</span>
                    <span className="text-[#10B981] font-semibold">Calculated at checkout</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-end pt-1">
                  <div>
                    <span className="text-base font-bold text-[#0F172A] block">Total to Secure</span>
                    <span className="text-xs text-[#64748B]">Includes Float protection</span>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[#0F3D8C] text-price font-data-price">
                    KES {total.toLocaleString()}
                  </span>
                </div>

                {/* Checkout CTA */}
                <Link
                  to="/checkout"
                  className="w-full bg-[#0F3D8C] text-white py-3.5 rounded-xl font-bold text-base hover:bg-[#0A2D6B] transition-all shadow-md flex items-center justify-center gap-2 text-center"
                >
                  <ShieldCheck className="h-5 w-5 text-[#10B981]" />
                  <span>Proceed to Secure Checkout</span>
                </Link>

                <div className="text-center pt-2">
                  <span className="text-xs text-[#64748B] inline-flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>256-bit Financial-Grade Encryption</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
