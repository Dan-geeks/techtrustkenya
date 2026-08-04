import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Shield,
  Navigation,
  Phone,
  Package,
  Hourglass,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RateVendor } from "@/components/reviews/RateVendor";
import { invokeFunction } from "@/lib/functions";

/** The five milestones shown in the tracker, in order. */
const STEPS = [
  { key: "payment_held", label: "Payment Held", icon: Shield },
  { key: "vendor_preparing", label: "Order Confirmed", icon: Package },
  { key: "out_for_delivery", label: "In Transit", icon: Truck },
  { key: "delivered_awaiting_confirmation", label: "Delivered", icon: Hourglass },
  { key: "confirmed", label: "Complete", icon: CheckCircle2 },
];

/** -2 = order terminated, -1 = not paid yet (no milestone reached), 0..4 = milestone index. */
const getStatusIndex = (status?: string) => {
  switch (status) {
    case "pending_payment":
      return -1;
    case "payment_held":
      return 0;
    case "vendor_preparing":
      return 1;
    case "out_for_delivery":
    case "ready_for_pickup":
      return 2;
    case "delivered_awaiting_confirmation":
      return 3;
    case "confirmed":
    case "completed":
    case "discharged":
      return 4;
    default:
      return -2; // cancelled / refunded / disputed / unknown
  }
};

const BANNERS: Record<number, { title: string; note: string }> = {
  [-1]: {
    title: "Awaiting Payment",
    note: "We haven't received your M-Pesa payment yet. Complete the STK push on your phone to secure this order.",
  },
  0: {
    title: "Payment Held",
    note: "Your money is safely held in Float. The vendor has been notified and will confirm your order shortly.",
  },
  1: {
    title: "Order Confirmed",
    note: "The vendor has confirmed your order and is preparing it for dispatch.",
  },
  2: {
    title: "In Transit",
    note: "Your order is on the way. You'll be able to confirm delivery once it arrives.",
  },
  3: {
    title: "Delivered",
    note: "Your order has been delivered. Inspect the item, then confirm to release the funds.",
  },
  // The payout half of this note is conditional at render time: an order can be
  // complete for the buyer while the vendor is still owed. See `floatReleased`.
  4: {
    title: "Complete",
    note: "This order is complete and the funds have been released to the vendor.",
  },
};

export const OrderDetail = () => {
  // The route is declared as `/orders/:orderId` in App.tsx - reading `id` here
  // silently yielded undefined and left the page stuck on "Loading order...".
  // Accept either name so the page survives a future route rename.
  const params = useParams<{ orderId?: string; id?: string }>();
  const id = params.orderId ?? params.id;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [raising, setRaising] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [payoutMessage, setPayoutMessage] = useState("");
  const [reportingPayout, setReportingPayout] = useState(false);
  const { user } = useAuth();

  const fetchOrder = async () => {
    if (!id) {
      // Never leave the spinner up: no id means there is nothing to load.
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*, product:product_id(*), vendor:vendor_id(*)")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Supabase Error:", error);
        toast.error("Error loading order details: " + error.message);
        setNotFound(true);
      } else if (data) {
        setOrder(data);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } catch (e: any) {
      console.error("Unexpected Error:", e);
      toast.error("An unexpected error occurred while loading this order.");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOrder();

    if (!id) return;
    const channel = supabase
      .channel(`order_detail_${id}_${Math.random().toString(36).substring(7)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new) {
            setOrder((prev: any) => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (order) {
      document.title = `Order #${order.id.slice(0, 8).toUpperCase()} | TechTrust Kenya`;
    }
  }, [order]);

  /**
   * Confirming delivery is what releases the money.
   *
   * This used to be a bare `update({ status: "confirmed" })`. It never set
   * payment_status, never set float_released_at, and never called
   * /release-float-payment - so the vendor was never actually paid, no payout
   * was ever recorded, and the referral reward never fired. The banner still
   * read "Float: Released" because that text keys off the step being complete,
   * so the screen claimed a payout that nothing had performed. Four confirmed
   * orders were sitting in exactly that state.
   *
   * The escrow API owns this transition: it claims the payout before calling
   * the gateway (so a double click cannot pay twice), writes
   * payment_status/float_released_at/payout_reference, notifies the vendor and
   * grants the referral reward.
   */
  const handleConfirmDelivery = async () => {
    if (!order || confirming) return;
    setConfirming(true);

    const { data, error } = await invokeFunction<{
      success: boolean;
      error?: string;
      payoutPending?: boolean;
    }>("release-float-payment", { body: { orderId: order.id } });

    if (error || !data?.success) {
      const message = error?.message ?? data?.error ?? "Could not release the payment.";
      // Don't leave the buyer stuck: the goods really did arrive, so record the
      // confirmation and let an admin chase the payout, rather than silently
      // pretending the money moved.
      const { error: markErr } = await supabase
        .from("orders")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", order.id);
      setConfirming(false);
      if (markErr) {
        toast.error(markErr.message);
        return;
      }
      toast.warning(
        `Delivery confirmed, but the payout could not be sent yet: ${message} TechTrust has been notified.`,
      );
      await fetchOrder();
      return;
    }

    setConfirming(false);
    toast.success(
      data.payoutPending
        ? "Delivery confirmed. The payout to the vendor is already on its way."
        : "Delivery confirmed and the Float payment has been released to the vendor.",
    );
    await fetchOrder();
  };

  /**
   * Raise a dispute. open_dispute freezes the Float payment, tells the other
   * side, and puts the order in front of every admin - none of which the old
   * "link to the policy page" button did.
   */
  const raiseDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error("Tell us what went wrong so we can review it.");
      return;
    }
    setRaising(true);
    const { error } = await supabase.rpc("open_dispute", {
      _order_id: order.id,
      _reason: disputeReason.trim(),
    });
    setRaising(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dispute opened. Your payment stays frozen in Float while we review it.");
    setDisputeOpen(false);
    setDisputeReason("");
    await fetchOrder();
  };

  const reportPayoutIssue = async () => {
    if (!payoutMessage.trim()) {
      toast.error("Tell us what happened so we can chase it.");
      return;
    }
    setReportingPayout(true);
    const { error } = await supabase.rpc("report_payout_issue", {
      _order_id: order.id,
      _message: payoutMessage.trim(),
    });
    setReportingPayout(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reported. We'll respond within 24 hours.");
    setPayoutOpen(false);
    setPayoutMessage("");
  };

  /**
   * Vendor-side fulfilment, so a vendor opening the tracker from their
   * dashboard can act on the order here instead of going back to the list.
   * Mirrors the buttons in the dashboard Orders tab.
   */
  const advanceOrder = async (status: string, note: string) => {
    if (!order || advancing) return;
    setAdvancing(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: status as any, updated_at: new Date().toISOString() })
      .eq("id", order.id);

    if (error) {
      toast.error(error.message);
      setAdvancing(false);
      return;
    }

    // Keep the customer informed at each step; the tracker they are watching is
    // realtime, but the notification is what actually pulls them back to it.
    // Must go through notify_counterparty: a direct insert is blocked by
    // notifications' "auth.uid() = user_id" policy and fails silently.
    await supabase.rpc("notify_counterparty", {
      _user_id: order.customer_id,
      _title: "Order update",
      _message: note,
      _type: "order_update",
      _reference_id: order.id,
    });

    toast.success("Order updated.");
    await fetchOrder();
    setAdvancing(false);
  };

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-[#0F3D8C]/20 border-t-[#0F3D8C] animate-spin" />
          <p className="text-sm text-[#64748B]">Loading order...</p>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen py-32 px-4 flex flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-2xl font-bold font-display">Order Not Found</h2>
        <p className="text-sm text-[#64748B] max-w-sm">
          We couldn't find this order. It may have been removed, or it belongs to a different account.
        </p>
        <Link to="/orders" className="bg-[#0F3D8C] text-white px-6 py-2.5 rounded-xl font-bold text-sm">
          View My Orders
        </Link>
      </div>
    );
  }

  const currentIndex = getStatusIndex(order.status);
  const isTerminated = currentIndex === -2;
  const isCompleted = currentIndex === 4;
  const amount = order.total_amount_ksh?.toLocaleString() ?? "0";
  const banner = BANNERS[currentIndex];

  // The vendor row is joined on vendor_id, so its user_id is the shop owner.
  // Compare against that rather than the customer_id: an admin viewing the
  // order is neither, and must not get either side's action buttons.
  const isVendorSide = !!user && !!order.vendor?.user_id && user.id === order.vendor.user_id;

  // Whether the money has ACTUALLY left Float, as opposed to the tracker merely
  // reaching its last step. These are not the same thing and were conflated.
  const floatReleased = order.payment_status === "released";
  const awaitingPayout = isCompleted && !floatReleased && !isTerminated;

  // ---- Real vendor location (no fabricated courier GPS) ----
  const rawLat = order.vendor?.gps_latitude ?? order.vendor?.latitude;
  const rawLng = order.vendor?.gps_longitude ?? order.vendor?.longitude;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  // Some vendor rows hold junk like (3333, 3331), so range-check before plotting.
  const hasRealCoords =
    rawLat != null &&
    rawLng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0);

  const d = 0.02; // ~2km box around the shop
  const bbox = `${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const mapLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
  const vendorAddress = [order.vendor?.physical_address, order.vendor?.city, order.vendor?.county]
    .filter(Boolean)
    .join(", ");
  const vendorPhone = order.vendor?.phone;

  // Each step occupies 1/5 of the row, so circle centres sit at 10%, 30%, 50%, 70%, 90%.
  const trackStart = 10;
  const trackSpan = 80;
  const progressWidth = currentIndex > 0 ? (currentIndex / (STEPS.length - 1)) * trackSpan : 0;

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen pt-24 md:pt-32 pb-12">
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-[#64748B] mb-5 flex-wrap">
          <Link to="/" className="hover:text-[#0F3D8C]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link to="/orders" className="hover:text-[#0F3D8C]">My Orders</Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-semibold text-[#0F172A]">#{order.id.slice(0, 8).toUpperCase()}</span>
        </div>

        {/* Page heading */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight text-[#0F172A] mb-1">
              Order Tracker
            </h1>
            <p className="text-sm sm:text-base text-[#64748B]">
              Order <span className="font-mono text-xs sm:text-sm text-[#0F3D8C]">#{order.id.slice(0, 8).toUpperCase()}</span>
            </p>
          </div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0F3D8C] hover:underline bg-white px-4 py-2 rounded-xl border border-[#CBD5E1] shadow-sm self-start sm:self-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Orders</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ---------- Left column ---------- */}
          <div className="lg:col-span-8 space-y-6">
            {/* Status banner */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-[#0F172A] mb-1">
                  Status: {isTerminated
                    ? order.status?.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
                    : banner?.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  {isTerminated
                    ? "This order is no longer active. Contact support if you believe this is a mistake."
                    : awaitingPayout
                      ? "This order is complete. The vendor's payout is still being settled."
                      : banner?.note}
                </p>
              </div>
              {/* Reads payment_status, NOT the step index. This said
                  "Float: Released" the moment the tracker reached Complete,
                  whether or not a payout had actually happened - and because
                  confirming delivery never called the release endpoint, that
                  was routinely a lie. An order can be complete for the buyer
                  and still owe the vendor money; the badge now says which. */}
              <div
                className={`px-5 py-3 rounded-full flex items-center gap-2 shadow-sm whitespace-nowrap text-white flex-shrink-0 ${
                  isTerminated ? "bg-[#94A3B8]" : floatReleased ? "bg-[#22C55E]" : "bg-[#3B82F6]"
                }`}
              >
                <ShieldCheck className="h-5 w-5 flex-shrink-0" />
                <span className="font-mono text-sm sm:text-base font-medium">
                  {isTerminated
                    ? "Float: Closed"
                    : floatReleased
                      ? `Float: Released KES ${amount}`
                      : `Float: Holding KES ${amount}`}
                </span>
              </div>
            </div>

            {/* Progress stepper */}
            <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-sm border border-[#E2E8F0]">
              <h3 className="text-xs font-bold text-[#0F172A] mb-8 text-center uppercase tracking-widest">
                Order Progress
              </h3>

              {isTerminated ? (
                <div className="flex flex-col items-center gap-2 py-2 text-center">
                  <XCircle className="h-8 w-8 text-[#DC2626]" />
                  <p className="text-sm font-bold text-[#DC2626]">
                    Order {order.status?.replace(/_/g, " ")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1 pb-1">
                  <div className="relative min-w-[500px]">
                    {/* Track (grey) */}
                    <div
                      className="absolute top-[18px] h-1 bg-slate-200 rounded-full z-0"
                      style={{ left: `${trackStart}%`, width: `${trackSpan}%` }}
                    />
                    {/* Track (completed, green) */}
                    <div
                      className="absolute top-[18px] h-1 bg-[#22C55E] rounded-full z-0 transition-all duration-500 ease-in-out"
                      style={{ left: `${trackStart}%`, width: `${progressWidth}%` }}
                    />

                    <div className="flex relative z-10">
                      {STEPS.map((step, idx) => {
                        const reached = currentIndex >= idx;
                        const isCurrent = currentIndex === idx;
                        const Icon = step.icon;

                        return (
                          <div key={step.key} className="flex-1 flex flex-col items-center px-1">
                            <div className="relative mb-2">
                              {/* Pulse on the milestone the order is sitting at */}
                              {isCurrent && !isCompleted && (
                                <span className="absolute inset-0 rounded-full bg-[#22C55E] opacity-60 animate-ping" />
                              )}
                              <div
                                className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-500 ${
                                  reached
                                    ? "bg-[#22C55E] text-white shadow-sm"
                                    : "bg-slate-200 text-slate-400"
                                } ${isCurrent ? "ring-4 ring-[#22C55E]/20" : ""}`}
                              >
                                {reached ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                              </div>
                            </div>
                            <span
                              className={`text-[11px] sm:text-xs font-bold text-center leading-tight transition-colors duration-500 ${
                                reached ? "text-[#16A34A]" : "text-slate-400"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order items */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#E2E8F0] space-y-4">
              <h3 className="text-base font-bold text-[#0F172A] border-b border-slate-100 pb-3">Order Items</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-2">
                <img
                  src={order.product?.image_urls?.[0] || order.product_image_url || "/placeholder.svg"}
                  alt={order.product?.model_name || order.product_name || "Product"}
                  className="w-20 h-20 rounded-xl object-contain bg-slate-50 border border-slate-200 p-2 flex-shrink-0"
                />
                <div className="flex-grow min-w-0">
                  {/* Fall back to the snapshot: a vendor may have deleted the
                      listing since, which nulls product_id but never the order. */}
                  <h4 className="font-bold text-base text-[#0F172A]">
                    {order.product?.brand ?? order.product_brand} {order.product?.model_name ?? order.product_name}
                  </h4>
                  {order.product?.condition && (
                    <p className="text-xs text-[#64748B] mt-0.5">Condition: {order.product.condition}</p>
                  )}
                  <p className="text-xs text-[#64748B] mt-0.5">Quantity: {order.quantity}</p>
                </div>
                <div className="font-mono text-lg font-bold text-[#0F172A] flex-shrink-0">
                  KES {amount}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-3 border-t border-slate-100 text-xs">
                <span className="text-[#64748B]">
                  Sold by: <strong className="text-[#0F3D8C]">{order.vendor?.business_name || "TechTrust Vendor"}</strong>
                </span>
                <div className="inline-flex items-center gap-1 bg-[#22C55E]/10 text-[#16A34A] px-2.5 py-1 rounded-full border border-[#22C55E]/20 font-bold self-start sm:self-auto">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Partner</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- Right column ---------- */}
          <div className="lg:col-span-4 space-y-6">
            {/* Vendor pickup location - real coordinates from vendor_profiles */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Navigation className="h-4 w-4 text-[#0F3D8C] flex-shrink-0" />
                  <h3 className="font-bold text-sm text-[#0F172A] truncate">Vendor Location</h3>
                </div>
                {hasRealCoords && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-[#0F3D8C] hover:underline flex-shrink-0"
                  >
                    View larger map
                  </a>
                )}
              </div>

              {hasRealCoords ? (
                <div className="h-48 w-full relative bg-slate-100">
                  <iframe
                    title={`Map of ${order.vendor?.business_name || "vendor"}`}
                    className="w-full h-full border-0"
                    src={mapSrc}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="h-32 w-full flex flex-col items-center justify-center gap-1.5 bg-slate-50 text-center px-4">
                  <MapPin className="h-5 w-5 text-slate-400" />
                  <p className="text-xs text-[#64748B]">
                    This vendor hasn't shared exact map coordinates.
                  </p>
                </div>
              )}

              <div className="p-4 bg-white border-t border-slate-100 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-[#0F3D8C] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-bold text-[#0F172A]">
                      {order.vendor?.business_name || "TechTrust Vendor"}
                    </p>
                    <p className="text-[#64748B] break-words">
                      {vendorAddress || "Address not provided"}
                    </p>
                  </div>
                </div>
                {vendorPhone && (
                  <a
                    href={`tel:${vendorPhone}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#EEF2FF] text-[#0F3D8C] font-bold rounded-lg hover:bg-[#0F3D8C] hover:text-white transition-colors border border-[#0F3D8C]/20"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>Call {vendorPhone}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Vendor fulfilment. Shown instead of the customer's confirm card
                when the viewer owns the shop this order belongs to, so the
                tracker is useful from both sides of the same URL. */}
            {isVendorSide && (
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#E2E8F0] space-y-4">
                <h3 className="font-bold text-base text-[#0F172A]">Fulfil This Order</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  The customer's payment is held in Float. Move the order along as you go - they see each step on
                  this same page, and their confirmation is what releases your payout.
                </p>

                <div className="flex flex-wrap gap-2">
                  {order.status === "payment_held" && (
                    <button
                      onClick={() => advanceOrder("vendor_preparing", "The vendor has confirmed your order and is preparing it.")}
                      disabled={advancing}
                      className="bg-[#0F3D8C] hover:bg-[#0c327a] disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
                    >
                      {advancing ? "Saving…" : "Confirm Order"}
                    </button>
                  )}
                  {order.status === "vendor_preparing" && (
                    <>
                      <button
                        onClick={() => advanceOrder("out_for_delivery", "Your order is on the way.")}
                        disabled={advancing}
                        className="bg-[#0F3D8C] hover:bg-[#0c327a] disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
                      >
                        Out for delivery
                      </button>
                      <button
                        onClick={() => advanceOrder("ready_for_pickup", "Your order is ready for pickup.")}
                        disabled={advancing}
                        className="bg-white border border-[#CBD5E1] hover:bg-slate-50 disabled:opacity-50 text-[#0F172A] font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
                      >
                        Ready for pickup
                      </button>
                    </>
                  )}
                  {(order.status === "out_for_delivery" || order.status === "ready_for_pickup") && (
                    <button
                      onClick={() => advanceOrder("delivered_awaiting_confirmation", "Your order has been delivered. Inspect it, then confirm to release the funds.")}
                      disabled={advancing}
                      className="bg-[#0F3D8C] hover:bg-[#0c327a] disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
                    >
                      Mark delivered
                    </button>
                  )}
                  {order.status === "delivered_awaiting_confirmation" && (
                    <p className="text-xs text-[#64748B]">
                      Waiting for the customer to inspect and confirm. That releases your payout from Float.
                    </p>
                  )}
                  {isCompleted && (
                    <div className="w-full space-y-3">
                      {floatReleased ? (
                        <p className="text-xs text-emerald-700 font-semibold">
                          Confirmed by the customer. Your payout has been released from Float
                          {order.payout_reference ? ` (ref ${order.payout_reference})` : ""}.
                        </p>
                      ) : (
                        /* Told the vendor their payout was released regardless of
                           whether it had been. Say what is actually true. */
                        <p className="text-xs text-amber-700 font-semibold">
                          Confirmed by the customer. Your payout is queued and has not left Float yet -
                          TechTrust is completing it. Report it below if it doesn't arrive.
                        </p>
                      )}
                      {/* A released payout is not the same as money in hand, and
                          a vendor who is short had no obvious next step. This is
                          NOT open_dispute: that would flip a confirmed order back
                          to disputed and reverse the buyer's confirmation. A
                          missing payout is between the vendor and TechTrust. */}
                      <div className="rounded-xl border border-[#CBD5E1] bg-slate-50 p-3">
                        <p className="text-xs text-[#475569] leading-relaxed">
                          <strong className="text-[#0F172A]">Didn't receive the money?</strong> Open a request
                          below and we'll respond in less than 24 hours.
                        </p>
                        <button
                          onClick={() => { setPayoutMessage(""); setPayoutOpen(true); }}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Report a payout problem
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rate the vendor. Only once the order is actually complete, and
                only for the buyer - this is what feeds the vendor's public
                rating, which until now had no source at all. */}
            {!isVendorSide && isCompleted && user && (
              <RateVendor
                orderId={order.id}
                vendorId={order.vendor_id}
                productId={order.product_id}
                customerId={user.id}
                vendorName={order.vendor?.business_name}
              />
            )}

            {/* Finalize transaction - customer only. A vendor must never be
                able to confirm delivery on the buyer's behalf. */}
            {!isVendorSide && (
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#E2E8F0] space-y-4">
              <h3 className="font-bold text-base text-[#0F172A]">Finalize Transaction</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Please inspect your item before confirming delivery. Clicking{" "}
                <strong>Confirm Delivery</strong> releases the held Float funds directly to the vendor.
              </p>

              <button
                onClick={handleConfirmDelivery}
                disabled={isCompleted || isTerminated || confirming || currentIndex < 2}
                className="w-full bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                <span>
                  {isCompleted
                    ? "Delivery Confirmed"
                    : confirming
                    ? "Releasing Float..."
                    : "Confirm Delivery (Release Float)"}
                </span>
              </button>

              {/* This used to link to /disputes, a static policy page - there
                  was no way to actually raise one. */}
              {order.status === "disputed" ? (
                <div className="w-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Dispute under review
                  </p>
                  {order.dispute_reason && <p className="mt-1">You reported: {order.dispute_reason}</p>}
                  <p className="mt-1">
                    Your Float payment is frozen while TechTrust reviews this. We'll notify you with the outcome.
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => { setDisputeReason(""); setDisputeOpen(true); }}
                  disabled={isCompleted || isTerminated || currentIndex < 0}
                  className="w-full bg-white border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Open Dispute / Report Issue</span>
                </button>
              )}

              <Link to="/disputes" className="block text-center text-[11px] text-[#64748B] underline">
                How disputes work
              </Link>
            </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a problem with this order</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-[#64748B] leading-relaxed">
              Your payment is held in Float and stays frozen while we review this - the seller is not paid.
              Tell us what happened, with as much detail as you can.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="dispute-reason">What went wrong?</Label>
              <Textarea
                id="dispute-reason"
                rows={4}
                placeholder="e.g. The laptop arrived with a cracked screen and 8GB RAM instead of the 16GB listed."
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)} disabled={raising}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={raiseDispute} disabled={raising}>
              {raising ? "Opening…" : "Open dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a payout problem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-[#64748B] leading-relaxed">
              This order is marked as released, but tell us if the money hasn't reached you. We'll
              trace it and respond within 24 hours. The customer's order is not affected.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="payout-message">What happened?</Label>
              <Textarea
                id="payout-message"
                rows={4}
                placeholder="e.g. The order shows released but nothing has come to my M-Pesa till since yesterday."
                value={payoutMessage}
                onChange={(e) => setPayoutMessage(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutOpen(false)} disabled={reportingPayout}>
              Cancel
            </Button>
            <Button onClick={reportPayoutIssue} disabled={reportingPayout}>
              {reportingPayout ? "Sending…" : "Send report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetail;
