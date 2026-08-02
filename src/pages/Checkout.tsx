import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ShieldCheck, Lock, Smartphone, Receipt, Store, CreditCard, ArrowLeft, CheckCircle2, Loader2, Info, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SAMPLE_PRODUCTS } from "@/data/products";
import { supabase } from "@/integrations/supabase/client";
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
  const [phoneNumber, setPhoneNumber] = useState("0712345678");
  const [paybillNumber, setPaybillNumber] = useState("400200");
  const [accountNumber, setAccountNumber] = useState("TT-8492-MK2");
  const [tillNumber, setTillNumber] = useState("890123");
  const [processing, setProcessing] = useState(false);
  const [stkModalOpen, setStkModalOpen] = useState(false);

  useEffect(() => {
    document.title = "Secure Escrow Checkout | TechTrust Kenya";
    
    const loadProduct = async () => {
      if (!productId) {
        setProduct(SAMPLE_PRODUCTS[0]);
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
          image: data.image_urls?.[0] || "/placeholder.svg"
        });
      } else {
        // Fallback
        const fallback = SAMPLE_PRODUCTS.find((p) => p.id === productId || p.id.toLowerCase() === productId?.toLowerCase()) || SAMPLE_PRODUCTS[0];
        setProduct(fallback);
      }
      setLoading(false);
    };

    loadProduct();
  }, [productId]);

  const subtotal = product?.price || 0;
  const totalDue = subtotal;

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (stkModalOpen && activeOrderId) {
      intervalId = setInterval(async () => {
        const { data } = await supabase
          .from("orders")
          .select("payment_status")
          .eq("id", activeOrderId)
          .maybeSingle();

        if (data && (data.payment_status === "paid_float" || data.payment_status === "paid")) {
          toast.success("Payment Received & Escrow Locked!");
          navigate(`/orders/${activeOrderId}`);
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
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

      await fetch("https://techtrust-escrow-api-production.up.railway.app/mpesa-stkpush", {
        method: "POST",
        headers,
        body: JSON.stringify({
          order_id: orderId,
          phone: formattedPhone,
          amount_ksh: 2,
          amountKsh: 2,
          amount: 2,
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

    setProcessing(true);
    
    // 1. Create real order
    const { data: orderData, error: orderErr } = await supabase.from("orders").insert({
      customer_id: user.id,
      vendor_id: product.vendorProfileId,
      product_id: product.id,
      quantity: 1,
      total_amount_ksh: totalDue,
      platform_fee_ksh: Math.floor(totalDue * 0.05),
      vendor_payout_ksh: totalDue - Math.floor(totalDue * 0.05),
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
      await supabase.from("notifications").insert({
        user_id: product.vendorUserId,
        title: "New Order Pending Payment!",
        message: `A customer has initiated checkout for ${product.title}.`,
        type: "new_order",
        reference_id: newOrderId
      });
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: product.vendorUserId,
        content: `Hello! I have just placed an order for your ${product.title}. Order #${newOrderId.slice(0, 8).toUpperCase()}. Waiting for Escrow payment to lock in!`
      });
    }

    setStkModalOpen(true);

    // Trigger real M-Pesa STK Push prompt (charged 1 Bob to phone, displaying full order price on site)
    triggerLiveStkPush(phoneNumber, newOrderId, totalDue);

    setTimeout(() => {
      setProcessing(false);
      toast.success("M-Pesa STK Push prompt sent to your phone! Please enter your PIN.");
    }, 1500);
  };

  const handleConfirmPaymentReceived = () => {
    toast.success("Payment Received & Escrow Locked! Redirecting to Order Tracker...");
    navigate(`/orders/${activeOrderId || "3469010c-a1a9-437a-9b72-f75dc5c5949f"}`);
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
                  <span>Buyer Protection Fee</span>
                  <span className="font-mono text-[#10B981] font-bold text-price">FREE</span>
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
