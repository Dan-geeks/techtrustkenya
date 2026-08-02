import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShieldCheck, Truck, MapPin, CheckCircle2, AlertTriangle, ChevronRight, ArrowLeft, Clock, Shield, RefreshCw, Navigation, Phone } from "lucide-react";
import { toast } from "sonner";

interface OrderDetailData {
  id: string;
  orderNumber: string;
  status: "held" | "confirmed" | "prepared" | "in_transit" | "delivered" | "discharged";
  estimatedDelivery: string;
  escrowAmount: number;
  item: {
    title: string;
    specs: string;
    price: number;
    image: string;
    vendor: string;
    vendorVerified: boolean;
  };
  courier: {
    name: string;
    phone: string;
    vehicle: string;
    locationName: string;
  };
}

const SAMPLE_ORDER: OrderDetailData = {
  id: "3469010c-a1a9-437a-9b72-f75dc5c5949f",
  orderNumber: "TT-8492-MK2",
  status: "in_transit",
  estimatedDelivery: "Today by 5:00 PM",
  escrowAmount: 45000,
  item: {
    title: 'MacBook Pro 14" M2 Pro',
    specs: "Space Gray, 16GB RAM, 512GB SSD",
    price: 45000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC-ofAM4B9rnndVlhGPX9ZSbahK-a-P3pGy2SIwEa7bZLbfdNf_8zj0-VIu9-2H9snQDd5N9ow4oZUZkdatMWTn43NT3CSzG0huAyIPiY0DJL3wjNQcoTpY27xoITrl0MAO-VPUOyAomQwkxSNq-QUfKCpmshYeUPQCiXckgPuu9gCqVXWH5YblZ887SQdxfpWGQ-lhXbTHaEWeVhQXt4rsxMOWmexB37ulGVynQvPwDB21GyLLg6T0uQ",
    vendor: "TechHub Nairobi",
    vendorVerified: true,
  },
  courier: {
    name: "John Mwangi",
    phone: "+254 712 345 678",
    vehicle: "M-Post Courier (KAA 123X)",
    locationName: "En route along Waiyaki Way, Nairobi",
  },
};

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetailData>(SAMPLE_ORDER);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    document.title = `Order #${order.orderNumber} | TechTrust Kenya`;
  }, [order]);

  const handleConfirmDelivery = () => {
    setConfirmed(true);
    setOrder((prev) => ({ ...prev, status: "discharged" }));
    toast.success("Delivery Confirmed! Escrow funds have been released to the vendor.");
  };

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] antialiased min-h-screen">
      <main className="w-full max-w-container-max mx-auto px-6 md:px-12 py-8 md:py-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-[#64748B] mb-6">
          <Link to="/" className="hover:text-[#0F3D8C]">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link to="/orders" className="hover:text-[#0F3D8C]">My Orders</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-[#0F172A]">Order #{id ? id.slice(0, 8) : order.orderNumber}</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="font-display-h2 text-3xl md:text-4xl font-bold text-[#0F172A]">Order Tracker</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Order Reference: <span className="font-mono text-[#0F3D8C] font-bold">#{order.orderNumber}</span>
            </p>
          </div>
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
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] animate-pulse"></span>
                  <h2 className="font-bold text-lg text-[#0F172A]">
                    {confirmed ? "Status: Delivery Complete" : "Status: In Transit"}
                  </h2>
                </div>
                <p className="text-sm text-[#64748B]">
                  {confirmed
                    ? "Escrow funds have been successfully released to TechHub Nairobi."
                    : `Your order is on the way. Estimated delivery: ${order.estimatedDelivery}`}
                </p>
              </div>
              <div className="bg-[#3B82F6] text-white px-5 py-2.5 rounded-full flex items-center gap-2 shadow-sm font-semibold text-sm whitespace-nowrap">
                <Shield className="h-4 w-4" />
                <span className="font-mono text-price">
                  Float: Holding KES {order.escrowAmount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Stepper Component */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#E2E8F0] overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="flex items-center justify-between relative">
                  {/* Background Progress Line */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 z-0"></div>
                  {/* Active Progress Line */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#10B981] transition-all duration-500 z-0"
                    style={{ width: confirmed ? "100%" : "75%" }}
                  ></div>

                  {/* Step 1: Payment Held */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center mb-2 shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-[#0F172A]">Payment Held</span>
                  </div>

                  {/* Step 2: Order Confirmed */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center mb-2 shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-[#0F172A]">Order Confirmed</span>
                  </div>

                  {/* Step 3: Being Prepared */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center mb-2 shadow-sm">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-[#0F172A]">Being Prepared</span>
                  </div>

                  {/* Step 4: In Transit */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${confirmed ? "bg-[#10B981] text-white" : "bg-[#0F3D8C] text-white animate-pulse"} flex items-center justify-center mb-2 shadow-sm`}>
                      {confirmed ? <CheckCircle2 className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                    </div>
                    <span className="text-xs font-bold text-[#0F3D8C]">In Transit</span>
                  </div>

                  {/* Step 5: Delivered & Complete */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${confirmed ? "bg-[#10B981] text-white" : "bg-slate-200 text-slate-500"} flex items-center justify-center mb-2`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className={`text-xs font-bold ${confirmed ? "text-[#10B981]" : "text-slate-400"}`}>Complete</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Details Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0] space-y-4">
              <h3 className="text-base font-bold text-[#0F172A] border-b border-slate-100 pb-3">Order Items</h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 py-2">
                <img
                  src={order.item.image}
                  alt={order.item.title}
                  className="w-20 h-20 rounded-xl object-contain bg-slate-50 border border-slate-200 p-2 flex-shrink-0"
                />
                <div className="flex-grow">
                  <h4 className="font-bold text-base text-[#0F172A]">{order.item.title}</h4>
                  <p className="text-xs text-[#64748B] mt-0.5">{order.item.specs}</p>
                </div>
                <div className="font-mono text-lg font-bold text-[#0F172A] text-price font-data-price">
                  KES {order.item.price.toLocaleString()}
                </div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-xs">
                <span className="text-[#64748B]">Sold by: <strong className="text-[#0F3D8C]">{order.item.vendor}</strong></span>
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
              <div className="h-64 w-full relative bg-slate-100">
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
                      {order.courier.locationName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Courier Info */}
              <div className="p-4 bg-white flex items-center justify-between border-t border-slate-100 text-xs">
                <div>
                  <p className="font-bold text-[#0F172A]">{order.courier.name}</p>
                  <p className="text-[#64748B]">{order.courier.vehicle}</p>
                </div>
                <a
                  href={`tel:${order.courier.phone}`}
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
                disabled={confirmed}
                className="w-full bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-5 w-5" />
                <span>{confirmed ? "Delivery Confirmed!" : "Confirm Delivery (Release Escrow)"}</span>
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
