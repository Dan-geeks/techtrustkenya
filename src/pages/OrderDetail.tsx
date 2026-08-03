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
  4: {
    title: "Complete",
    note: "This order is complete and the funds have been released to the vendor.",
  },
};

export const OrderDetail = () => {
  // The route is declared as `/orders/:orderId` in App.tsx — reading `id` here
  // silently yielded undefined and left the page stuck on "Loading order...".
  // Accept either name so the page survives a future route rename.
  const params = useParams<{ orderId?: string; id?: string }>();
  const id = params.orderId ?? params.id;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);

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

  const handleConfirmDelivery = async () => {
    if (!order || confirming) return;
    setConfirming(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "confirmed", updated_at: new Date().toISOString() })
      .eq("id", order.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Delivery confirmed! Float funds have been released to the vendor.");
      await fetchOrder();
    }
    setConfirming(false);
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
                    : banner?.note}
                </p>
              </div>
              <div
                className={`px-5 py-3 rounded-full flex items-center gap-2 shadow-sm whitespace-nowrap text-white flex-shrink-0 ${
                  isTerminated ? "bg-[#94A3B8]" : isCompleted ? "bg-[#22C55E]" : "bg-[#3B82F6]"
                }`}
              >
                <ShieldCheck className="h-5 w-5 flex-shrink-0" />
                <span className="font-mono text-sm sm:text-base font-medium">
                  {isTerminated ? "Float: Closed" : isCompleted ? `Float: Released KES ${amount}` : `Float: Holding KES ${amount}`}
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
                  src={order.product?.image_urls?.[0] || "/placeholder.svg"}
                  alt={order.product?.model_name || "Product"}
                  className="w-20 h-20 rounded-xl object-contain bg-slate-50 border border-slate-200 p-2 flex-shrink-0"
                />
                <div className="flex-grow min-w-0">
                  <h4 className="font-bold text-base text-[#0F172A]">
                    {order.product?.brand} {order.product?.model_name}
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5">Condition: {order.product?.condition}</p>
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
            {/* Vendor pickup location — real coordinates from vendor_profiles */}
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

            {/* Finalize transaction */}
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

              <Link
                to="/disputes"
                className="w-full bg-white border border-red-300 text-red-600 hover:bg-red-50 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Open Dispute / Report Issue</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderDetail;
