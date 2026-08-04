import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Lock, Smartphone, Receipt, Store, CreditCard, ArrowLeft, CheckCircle2, Loader2, Info, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ESCROW_API_BASE } from "@/lib/functions";
import { supabase } from "@/integrations/supabase/client";
import { fetchEscrowFeePercent, DEFAULT_ESCROW_FEE_PERCENT } from "@/lib/settings";
import { useAuth } from "@/hooks/useAuth";

type PaymentMethodType = "express" | "paybill" | "till" | "mobile_money";

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("product") || searchParams.get("id");
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("express");
  // Empty so the placeholder actually shows. It used to be pre-filled with a
  // real-looking number, which the buyer had to clear before typing their own
  // - and risked pushing the STK prompt to a stranger's phone if they didn't.
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paybillNumber, setPaybillNumber] = useState("400200");
  const [accountNumber, setAccountNumber] = useState("TT-8492-MK2");
  const [tillNumber, setTillNumber] = useState("890123");
  const [processing, setProcessing] = useState(false);
  const [stkModalOpen, setStkModalOpen] = useState(false);
  const [paymentError, setPaymentError] = useState<{ kind: "failed" | "timeout"; message: string } | null>(null);
  // Admin-controlled (app_settings.escrow_fee_percentage). Was hardcoded at 5%,
  // so changing it in the admin console never reached the buyer.
  const [feePercent, setFeePercent] = useState<number>(DEFAULT_ESCROW_FEE_PERCENT);

  useEffect(() => {
    fetchEscrowFeePercent().then(setFeePercent).catch(() => {});
  }, []);

  useEffect(() => {
    document.title = "Secure Escrow Checkout | TechTrust Kenya";
    
    const loadProduct = async () => {
      if (!productId) {
        // No product to buy. Loading a placeholder here let people reach a
        // checkout for an item that does not exist in the catalogue.
        setProduct(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      // Try to fetch from DB first
      const { data } = await supabase
        .from("products")
        .select(`
          id,
          brand,
          model_name,
          category,
          condition,
          price_ksh,
          image_urls,
          quantity_in_stock,
          vendor_profiles ( id, business_name, user_id )
        `)
        .eq("id", productId)
        .maybeSingle();

      if (data) {
        setProduct({
          id: data.id,
          title: `${data.brand} ${data.model_name}`,
          price: data.price_ksh,
          condition: data.condition,
          vendor: data.vendor_profiles?.business_name || "Verified Vendor",
          vendorProfileId: data.vendor_profiles?.id,
          vendorUserId: data.vendor_profiles?.user_id,
          stock: data.quantity_in_stock ?? 0,
          image: data.image_urls?.[0] || "/placeholder.svg"
        });
      } else {
        // Unknown id (e.g. a non-UUID demo id). Falling back to a sample
        // product produced a checkout whose order insert always failed with
        // "Failed to create order", because the sample has no vendor and no
        // real product row.
        setProduct(null);
      }
      setLoading(false);
    };

    loadProduct();
  }, [productId]);

  // The listed price is what the buyer pays. TechTrust's 5% is taken OUT of it
  // (the vendor receives the net), so Total Due always equals the listed price:
  //   listed 85,000  ->  subtotal 80,750 + service fee 4,250  =  85,000 due.
  // These feed both the summary UI and the order row so the two cannot drift.
  const listedPrice = product?.price || 0;
  const totalDue = listedPrice;
  const serviceFee = Math.floor((totalDue * feePercent) / 100);
  const subtotal = totalDue - serviceFee;

  useEffect(() => {
    if (!stkModalOpen || !activeOrderId) return;

    let intervalId: NodeJS.Timeout;
    let stopped = false;
    let elapsed = 0;
    const STEP = 1500;
    const GIVE_UP_AFTER = 150_000; // 2.5 min - Safaricom abandons a prompt well before this

    const finish = (kind: "failed" | "timeout", message: string) => {
      stopped = true;
      clearInterval(intervalId);
      setStkModalOpen(false);
      setProcessing(false);
      setPaymentError({ kind, message });
      toast.error(message);
    };

    intervalId = setInterval(async () => {
      if (stopped) return;
      elapsed += STEP;

      // Ask the escrow API rather than reading the row directly: it reconciles
      // against DarajaPay, which is what actually records a decline. Polling
      // the table alone meant a cancelled or insufficient-funds push stayed
      // "pending" forever and the UI waited for something that never comes.
      let status: string | null = null;
      let reason: string | null = null;
      try {
        const { data: s } = await supabase.auth.getSession();
        const token = s?.session?.access_token;
        if (token && ESCROW_API_BASE) {
          const r = await fetch(`${ESCROW_API_BASE}/payment-status?order_id=${activeOrderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = await r.json();
          status = j?.status ?? null;
          reason = j?.reason ?? j?.error ?? null;
        }
      } catch {
        /* fall through to the direct read below */
      }

      if (!status) {
        const { data } = await supabase
          .from("orders")
          .select("payment_status")
          .eq("id", activeOrderId)
          .maybeSingle();
        if (data?.payment_status === "paid_float") status = "paid";
        else if (data?.payment_status === "failed") status = "failed";
      }

      if (status === "paid") {
        stopped = true;
        clearInterval(intervalId);
        toast.success("Payment Received & Escrow Locked!");
        navigate(`/orders/${activeOrderId}`);
        return;
      }

      if (status === "failed") {
        finish(
          "failed",
          reason ||
            "Payment was not completed. This usually means the request was cancelled or there were insufficient funds.",
        );
        return;
      }

      if (elapsed >= GIVE_UP_AFTER) {
        finish(
          "timeout",
          "We didn't receive a confirmation for this payment. If money left your account it will still be picked up - check My Orders.",
        );
      }
    }, STEP);

    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [stkModalOpen, navigate, activeOrderId]);

  const triggerLiveStkPush = async (phone: string, orderId: string, amount: number) => {
    const digits = String(phone ?? "").replace(/^\+/, "").replace(/\D/g, "");
    let formattedPhone = digits;
    if (/^0[71]\d{8}$/.test(digits)) formattedPhone = `254${digits.slice(1)}`;
    else if (/^[71]\d{8}$/.test(digits)) formattedPhone = `254${digits}`;

    toast.success(`M-Pesa STK Push prompt sent to +${formattedPhone}! Check your phone.`);

    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      await fetch(`${ESCROW_API_BASE}/mpesa-stkpush`, {
        method: "POST",
        headers,
        // Send the REAL order total - this is what the customer is charged.
        // The server's resolveChargeAmount() only overrides it while
        // PAYMENT_SANDBOX_MODE is on, and that is now off in production.
        body: JSON.stringify({
          order_id: orderId,
          phone: formattedPhone,
          amount_ksh: amount,
          amountKsh: amount,
          amount,
        }),
      }).catch((e) => console.warn("Escrow API call:", e));
    } catch (err) {
      console.warn("STK Push error:", err);
    }
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error("Please enter a valid mobile number for payment confirmation.");
      return;
    }
    if (paymentMethod === "paybill" && (!paybillNumber || !accountNumber)) {
      toast.error("Please fill in both Paybill Number and Account Number.");
      return;
    }
    if (paymentMethod === "till" && !tillNumber) {
      toast.error("Please fill in the Till Number.");
      return;
    }
    if (!user) {
      toast.error("You must be logged in to complete checkout.");
      return;
    }

    if (product && product.stock !== undefined && product.stock <= 0) {
      // settle_order_into_float() cannot decrement stock below zero, so the
      // payment would be taken and then fail to settle.
      toast.error("This item is out of stock.");
      return;
    }

    if (!product?.id || !product?.vendorProfileId) {
      // Without a real product row and a resolvable vendor the insert fails on a
      // NOT NULL / uuid constraint and surfaces as "Failed to create order".
      toast.error("This listing is unavailable for purchase. Please pick another item.");
      return;
    }

    setPaymentError(null);
    setProcessing(true);

    // 1. Create real order
    const { data: orderData, error: orderErr } = await supabase.from("orders").insert({
      customer_id: user.id,
      vendor_id: product.vendorProfileId,
      product_id: product.id,
      quantity: 1,
      total_amount_ksh: totalDue,
      platform_fee_ksh: serviceFee,
      vendor_payout_ksh: subtotal,
      status: "pending_payment"
    }).select("id").single();

    if (orderErr || !orderData) {
      toast.error("Failed to create order: " + (orderErr?.message || "Unknown error"));
      setProcessing(false);
      return;
    }

    const newOrderId = orderData.id;
    setActiveOrderId(newOrderId);

    // 2. Notify the vendor!
    if (product.vendorUserId) {
      // The vendor's "New Order Received" notification is raised by the
      // trg_orders_notify_vendor trigger. It cannot be inserted from here:
      // the notifications INSERT policy is WITH CHECK (auth.uid() = user_id),
      // so a customer writing a row addressed to the vendor is denied by RLS.
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: product.vendorUserId,
        content: `Hello! I have just placed an order for your ${product.title}. Order #${newOrderId.slice(0, 8).toUpperCase()}. Waiting for Escrow payment to lock in!`
      });
    }

    setStkModalOpen(true);

    // Real M-Pesa STK Push for the full order amount shown at checkout.
    triggerLiveStkPush(phoneNumber, newOrderId, totalDue);

    // No artificial wait here: the prompt is already on its way, and the old
    // 1.5s timer just made the UI feel sluggish.
    setProcessing(false);
  };

  const handleConfirmPaymentReceived = () => {
    // Never fall back to a hardcoded order id - that sent buyers to someone
    // else's order. With no active order there is nothing to track.
    if (!activeOrderId) {
      toast.error("We couldn't find this order. Please check My Orders.");
      navigate("/orders");
      return;
    }
    toast.success("Payment Received & Escrow Locked! Redirecting to Order Tracker...");
    navigate(`/orders/${activeOrderId}`);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F3D8C]" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <p className="text-[#64748B]">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen">
      <main className="w-full max-w-container-max mx-auto px-6 md:px-12 py-8 md:py-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-[#64748B] mb-6">
          <Link to="/" className="hover:text-[#0F3D8C]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/cart" className="hover:text-[#0F3D8C]">Cart</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-[#0F172A]">Checkout</span>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="font-display-h2 text-3xl md:text-4xl font-bold text-[#0F172A]">Checkout &amp; Secure Payment</h1>
          <Link
            to="/cart"
            className="inline-flex items-center gap-2 text-xs md:text-sm font-bold text-[#0F3D8C] hover:underline bg-white px-4 py-2 rounded-xl border border-[#CBD5E1]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Cart</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* Left Column: Order Breakdown & Escrow Explanation */}
          <div className="lg:col-span-7 space-y-6">
            {/* Order Items Summary */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-6">
              <h2 className="text-lg font-bold text-[#0F172A] pb-3 border-b border-slate-100">
                Order Summary
              </h2>

              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-xl overflow-hidden flex-shrink-0 border border-slate-200 p-2 flex items-center justify-center">
                  <img
                    src={product.image || (product as any).images?.[0] || "/placeholder.svg"}
                    alt={product.title || "Product"}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-1 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-base text-[#0F172A]">{product.title || "Tech Product"}</h3>
                    <p className="text-xs text-[#64748B] mt-0.5">Condition: {product.condition || "Refurbished - Grade A"}</p>
                    <p className="text-xs text-[#0F3D8C] font-semibold">Seller: {product.vendor || "Verified Vendor"}</p>
                  </div>
                  <div className="font-mono text-base font-bold text-[#0F172A] text-price font-data-price">
                    KES {(product.price || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3 text-sm">
                <div className="flex justify-between text-[#64748B]">
                  <span>Subtotal</span>
                  <span className="font-mono text-[#0F172A] font-bold text-price">KES {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#64748B]">
                  <span>TechTrust service fee ({feePercent}%)</span>
                  <span className="font-mono text-[#0F172A] font-bold text-price">
                    KES {serviceFee.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                  <span className="font-bold text-[#0F172A] text-base">Total Due</span>
                  <span className="font-mono text-2xl font-bold text-[#0F3D8C] text-price font-data-price">
                    KES {totalDue.toLocaleString()}
                  </span>
                </div>
              </div>
            </section>

            {/* Float Escrow Protection Card */}
            <section className="bg-[#EEF2FF] rounded-2xl p-6 border border-[#0F3D8C]/20 flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-[#0F3D8C] flex items-center justify-center flex-shrink-0 text-white shadow-sm">
                <ShieldCheck className="h-6 w-6 text-[#10B981]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#0F3D8C] text-base">Float Escrow Protection Active</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Your funds will be held in a secure, independent <strong>Float Escrow</strong> account. Payment is only released to {product.vendor} after you inspect and accept your delivery.
                </p>
              </div>
            </section>
          </div>

          {/* Right Column: Payment Method Options & Form */}
          <div className="lg:col-span-5">
            <section className="bg-white rounded-2xl p-6 shadow-md border border-[#E2E8F0] space-y-6 sticky top-24">
              <h2 className="text-lg font-bold text-[#0F172A] pb-3 border-b border-slate-100">
                Select Payment Method
              </h2>

              <form onSubmit={handlePaySubmit} className="space-y-6">
                {/* Method Options Radio Grid */}
                <div className="space-y-3">
                  {/* Option 1: M-Pesa Express / STK Push */}
                  <label
                    onClick={() => setPaymentMethod("express")}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      paymentMethod === "express"
                        ? "border-[#0F3D8C] bg-[#EEF2FF]"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "express"
                            ? "border-[#0F3D8C] bg-[#0F3D8C]"
                            : "border-slate-300"
                        }`}
                      >
                        {paymentMethod === "express" && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                      <div>
                        <span className="font-bold text-sm text-[#0F172A] block">M-Pesa STK Push (Express)</span>
                        <span className="text-[11px] text-[#64748B]">Instant prompt sent to your phone</span>
                      </div>
                    </div>
                    <Smartphone className="h-5 w-5 text-[#10B981]" />
                  </label>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Mobile Number Field (Required for STK Push) */}
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">
                      M-Pesa Phone Number *
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3.5 rounded-l-xl border border-r-0 border-slate-300 bg-slate-100 text-[#64748B] text-xs font-mono font-semibold">
                        +254
                      </span>
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="712 345 678"
                        className="w-full rounded-r-xl border border-slate-300 py-2.5 px-3.5 text-sm font-mono bg-slate-50 focus:bg-white focus:border-[#0F3D8C] text-[#0F172A]"
                      />
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1">
                      An M-Pesa PIN prompt will appear automatically on this handset.
                    </p>
                  </div>
                </div>

                {/* Why the last attempt did not go through. Without this the
                    modal just closed and the buyer was left guessing. */}
                {paymentError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
                    <Info className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-red-800">
                        {paymentError.kind === "failed" ? "Payment not completed" : "No confirmation received"}
                      </p>
                      <p className="text-xs text-red-700 mt-1 leading-relaxed">{paymentError.message}</p>
                      <p className="text-xs text-red-700 mt-1">You can try again below.</p>
                    </div>
                  </div>
                )}

                {/* Submit Pay Button */}
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-3.5 rounded-xl font-bold text-base transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Sending M-Pesa Prompt...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Pay KES {totalDue.toLocaleString()} with M-Pesa</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <span className="text-xs text-[#64748B] inline-flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                    <span>Protected by M-Pesa Escrow Float Engine</span>
                  </span>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>

      {/* Simulated STK Push Modal */}
      {stkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 bg-[#EEF2FF] text-[#0F3D8C] rounded-2xl mx-auto flex items-center justify-center">
              <Smartphone className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[#0F172A]">Check Your Phone</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                An M-Pesa STK Push prompt for <strong>KES {totalDue.toLocaleString()}</strong> has been dispatched to <strong>+254 {phoneNumber}</strong>.
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-[#0F3D8C] space-y-1">
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-bold text-price">KES {totalDue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Escrow Ref:</span>
                <span className="font-bold">TT-8492-MK2</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center gap-3 pt-4">
              <Loader2 className="h-8 w-8 text-[#0F3D8C] animate-spin" />
              <span className="text-sm font-semibold text-[#0F172A]">Waiting for payment...</span>
              <p className="text-xs text-[#64748B]">Please enter your M-Pesa PIN on your phone to complete the transaction. We are waiting for the confirmation callback.</p>
              <button
                type="button"
                onClick={() => {
                  setStkModalOpen(false);
                  setProcessing(false);
                }}
                className="mt-4 text-slate-500 hover:text-slate-700 py-1.5 text-xs font-medium cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
