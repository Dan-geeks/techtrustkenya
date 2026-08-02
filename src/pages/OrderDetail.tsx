import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, Truck, MapPin, CheckCircle2, AlertTriangle, ChevronRight, ArrowLeft, Shield, Navigation, Phone, Package, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, product:product_id(*), vendor:vendor_id(*)")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      toast.error("Error loading order details.");
    } else if (data) {
      setOrder(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (order) {
      document.title = `Order #${order.id.slice(0, 8).toUpperCase()} | TechTrust Kenya`;
    }
  }, [order]);

  const handleConfirmDelivery = async () => {
    if (!order) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: "completed" })
      .eq("id", order.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Delivery Confirmed! Escrow funds have been released to the vendor.");
      fetchOrder(); // refresh order
    }
  };

  if (loading) {
    return (
      <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen py-32 flex flex-col items-center justify-center space-y-4">
        <h2 className="text-2xl font-bold">Order Not Found</h2>
        <Link to="/orders" className="bg-[#0F3D8C] text-white px-6 py-2 rounded-lg font-bold">
          View My Orders
        </Link>
      </div>
    );
  }

  // Determine progress state based on order status
  const statuses = [
    { key: "payment_held", label: "Payment Held", icon: Shield },
    { key: "vendor_preparing", label: "Preparing", icon: Package },
    { key: "in_transit", label: "In Transit", icon: Truck },
    { key: "awaiting_confirmation", label: "Awaiting Confirmation", icon: Hourglass },
    { key: "completed", label: "Complete", icon: CheckCircle2 }
  ];

  const getStatusIndex = (status: string) => {
    if (status === "payment_held" || status === "pending_payment") return 0;
    if (status === "vendor_preparing") return 1;
    if (status === "out_for_delivery" || status === "ready_for_pickup") return 2;
    if (status === "delivered_awaiting_confirmation") return 3;
    if (status === "completed" || status === "discharged") return 4;
    return -1; // cancelled/refunded/disputed
  };

  const currentIndex = getStatusIndex(order.status);
  const isCompleted = currentIndex === 4;

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen pt-32 pb-8">
      <main className="w-full max-w-6xl mx-auto px-4 md:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-[#64748B] mb-6">
          <Link to="/" className="hover:text-[#0F3D8C]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/orders" className="hover:text-[#0F3D8C]">My Orders</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-[#0F172A]">Order #{order.id.slice(0, 8).toUpperCase()}</span>
        </div>

        <div className="flex justify-end mb-4">
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0F3D8C] hover:underline bg-white px-4 py-2 rounded-xl border border-[#CBD5E1] shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Orders</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Progress & Order Details */}
          <div className="lg:col-span-8 space-y-6">
            {/* Escrow Status Banner */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-6 w-6 text-[#10B981]" />
                  <h2 className="text-xl font-bold text-[#0F172A]">Payment is secured in Float Escrow</h2>
                </div>
                <p className="text-xs text-[#64748B]">
                  Amount: <strong className="text-[#0F172A]">KES {order.total_amount_ksh.toLocaleString()}</strong>.
                  Funds will only be released to the vendor once you confirm delivery.
                </p>
              </div>
              <div className="bg-[#EEF2FF] text-[#0F3D8C] border border-[#0F3D8C]/20 px-4 py-2 rounded-xl font-bold text-sm">
                Status: {order.status.replace(/_/g, " ").toUpperCase()}
              </div>
            </div>

            {/* Live Progress Tracker */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] mb-8 text-center uppercase tracking-widest">Order Progress</h3>
              
              <div className="relative">
                {/* Connecting Line (Background) */}
                <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 z-0"></div>
                {/* Connecting Line (Progress) */}
                <div 
                  className="absolute top-4 left-4 h-1 bg-[#10B981] z-0 transition-all duration-500 ease-in-out"
                  style={{ width: `calc(${(Math.max(currentIndex, 0) / (statuses.length - 1)) * 100}% - 32px)` }}
                ></div>

                {/* Status Points */}
                <div className="flex justify-between relative z-10">
                  {statuses.map((step, idx) => {
                    const isPassed = idx < currentIndex;
                    const isActive = idx === currentIndex;
                    const isFuture = idx > currentIndex;
                    const Icon = step.icon;

                    let bgClass = "bg-slate-200 text-slate-500";
                    if (isPassed) bgClass = "bg-[#10B981] text-white";
                    else if (isActive) bgClass = "bg-[#0F3D8C] text-white animate-pulse shadow-lg";

                    return (
                      <div key={step.key} className="flex flex-col items-center w-20">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${bgClass}`}>
                          {isPassed ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </div>
                        <span className={`text-[10px] sm:text-xs font-bold text-center ${isActive ? "text-[#0F3D8C]" : isPassed ? "text-[#10B981]" : "text-slate-400"}`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Product Details Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-4">
              <h3 className="text-base font-bold text-[#0F172A] border-b border-slate-100 pb-3">Order Items</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-2">
                <img
                  src={order.product?.image_urls?.[0] || "/placeholder.svg"}
                  alt={order.product?.model_name || "Product"}
                  className="w-20 h-20 rounded-xl object-contain bg-slate-50 border border-slate-200 p-2 flex-shrink-0"
                />
                <div className="flex-grow">
                  <h4 className="font-bold text-base text-[#0F172A]">{order.product?.brand} {order.product?.model_name}</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">Condition: {order.product?.condition}</p>
                  <p className="text-xs text-[#64748B] mt-0.5">Quantity: {order.quantity}</p>
                </div>
                <div className="font-mono text-lg font-bold text-[#0F172A] text-price font-data-price">
                  KES {order.total_amount_ksh.toLocaleString()}
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
                <span className="text-[#64748B]">Sold by: <strong className="text-[#0F3D8C]">{order.vendor?.business_name || "TechTrust Vendor"}</strong></span>
                <div className="inline-flex items-center gap-1 bg-[#10B981]/10 text-[#10B981] px-2.5 py-1 rounded-full border border-[#10B981]/20 font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified Partner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Map & Delivery Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Real Interactive OpenStreetMap View */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-[#0F3D8C]" />
                  <h3 className="font-bold text-sm text-[#0F172A]">Live Delivery Map</h3>
                </div>
                <span className="text-[11px] font-semibold bg-[#10B981]/10 text-[#10B981] px-2 py-0.5 rounded-full border border-[#10B981]/20">
                  GPS Active
                </span>
              </div>

              {/* Embed Real OpenStreetMap centered on Nairobi CBD / Waiyaki Way */}
              <div className="h-48 w-full relative bg-slate-100">
                <iframe
                  title="Nairobi Live Delivery GPS Map"
                  className="w-full h-full border-0"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=36.78%2C-1.32%2C36.85%2C-1.25&layer=mapnik&marker=-1.286389%2C36.817223"
                  loading="lazy"
                ></iframe>
                <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur p-3 rounded-xl shadow-md border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#0F3D8C] flex-shrink-0" />
                    <span className="font-semibold text-[#0F172A] truncate max-w-[200px]">
                      Nairobi Delivery Route
                    </span>
                  </div>
                </div>
              </div>

              {/* Courier Info */}
              <div className="p-4 bg-white flex items-center justify-between border-t border-slate-100 text-xs">
                <div>
                  <p className="font-bold text-[#0F172A]">TechTrust Express</p>
                  <p className="text-[#64748B]">Courier Partner</p>
                </div>
                <a
                  href={`tel:0700000000`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EEF2FF] text-[#0F3D8C] font-bold rounded-lg hover:bg-[#0F3D8C] hover:text-white transition-colors border border-[#0F3D8C]/20"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Call</span>
                </a>
              </div>
            </div>

            {/* Escrow Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-4">
              <h3 className="font-bold text-base text-[#0F172A]">Finalize Transaction</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Inspect your item upon arrival. Clicking <strong>Confirm Delivery</strong> releases the held Float Escrow funds directly to the merchant.
              </p>

              <button
                onClick={handleConfirmDelivery}
                disabled={isCompleted || currentIndex < 2}
                className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>{isCompleted ? "Delivery Confirmed!" : "Confirm Delivery (Release Escrow)"}</span>
              </button>

              <Link
                to="/disputes"
                className="w-full bg-white border border-red-300 text-red-600 hover:bg-red-50 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs text-center block"
              >
                <AlertTriangle className="h-4 w-4" />
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
