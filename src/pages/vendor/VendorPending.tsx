import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Clock, CheckCircle2, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const VendorPending = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<string>("pending");

  const checkStatus = async () => {
    if (!user) return;
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from("vendor_profiles")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const currentStatus = data?.verification_status || "pending";
      setStatus(currentStatus);

      if (currentStatus === "approved" || currentStatus === "verified") {
        toast.success("Congratulations! Your vendor application has been approved!");
        navigate("/vendor/dashboard", { replace: true });
      } else if (currentStatus === "suspended") {
        navigate("/vendor/suspended", { replace: true });
      } else if (currentStatus === "rejected") {
        navigate("/vendor/rejected", { replace: true });
      } else {
        toast.info("Application status: Pending Review.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check status");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    document.title = "Application Pending | TechTrust Kenya";
    void checkStatus();
  }, [user]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 antialiased">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-200 p-8 md:p-12 text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center text-amber-600">
            <Clock className="w-10 h-10 animate-pulse" />
          </div>
        </div>

        <div className="space-y-3 max-w-lg mx-auto">
          <span className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
            Status: Pending Review
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Vendor Application Received
          </h1>
          <p className="text-slate-600 text-base leading-relaxed">
            Thank you for registering your shop on TechTrust Kenya. Our physical location verification and compliance team is reviewing your documents.
          </p>
        </div>

        {/* Verification Checklist */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Verification Steps
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-emerald-700 font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>Business Registration & M-Pesa Till Submitted</span>
            </div>
            <div className="flex items-center gap-3 text-amber-700 font-medium">
              <Loader2 className="w-5 h-5 shrink-0 animate-spin text-amber-600" />
              <span>Document & Compliance Review (In Progress)</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400 font-medium">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0"></div>
              <span>Physical Location Inspection</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="w-full sm:w-auto px-6 py-3.5 bg-[#0F3D8C] hover:bg-[#0A2D6B] text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Check Application Status</span>
          </button>
          
          <Link
            to="/browse"
            className="w-full sm:w-auto px-6 py-3.5 border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
          >
            <span>Browse Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorPending;
