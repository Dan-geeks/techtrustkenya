import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock, ShieldCheck, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const VendorPending = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    document.title = "Application Pending — TechTrust";
  }, []);

  // Auto-check status on mount so approved vendors don't get stuck here
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("vendor_profiles")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      const status = data?.verification_status;
      if (status === "approved" || status === "verified") {
        navigate("/vendor/dashboard", { replace: true });
      } else if (status === "suspended") {
        navigate("/vendor/suspended", { replace: true });
      } else if (status === "rejected") {
        navigate("/vendor/rejected", { replace: true });
      }
    })();
  }, [user, navigate]);

  const refreshStatus = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setChecking(true);
    const { data, error } = await supabase
      .from("vendor_profiles")
      .select("verification_status")
      .eq("user_id", user.id)
      .maybeSingle();
    setChecking(false);
    if (error) { toast.error(error.message); return; }
    const status = data?.verification_status;
    if (status === "approved" || status === "verified") {
      toast.success("You've been approved! Redirecting to your dashboard…");
      navigate("/vendor/dashboard", { replace: true });
    } else if (status === "suspended") {
      navigate("/vendor/suspended", { replace: true });
    } else if (status === "rejected") {
      toast.error("Your application was rejected. Please contact support.");
    } else {
      toast("Still pending review. Please check back later.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight">
            Tech<span className="text-accent">Trust</span>
          </span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-card text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/10 grid place-items-center mb-5">
            <Clock className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Application Submitted</h1>
          <p className="text-muted-foreground leading-relaxed">
            Thank you for registering your shop on TechTrust. Our verification team
            will review your submitted business details, shop photos, GPS coordinates
            and Google Maps link from the Admin Dashboard within{" "}
            <span className="text-foreground font-medium">24 to 48 hours</span>.
            A physical visit may be arranged in some cases, but the approval
            decision is recorded inside the app.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Once approved you will receive an email notification at the address you
            registered with. You can then log in and you will be taken directly to
            your vendor dashboard.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={refreshStatus} disabled={checking} variant="hero">
              {checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : <><RefreshCw className="h-4 w-4" /> Refresh status</>}
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Questions? Contact us at{" "}
            <a href="mailto:johnmwangimegwe@gmail.com" className="text-accent hover:underline">johnmwangimegwe@gmail.com</a>{" "}
            or{" "}
            <a href="mailto:support@techtrust.co.ke" className="text-accent hover:underline">support@techtrust.co.ke</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorPending;
