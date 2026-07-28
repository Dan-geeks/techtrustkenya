import { Link } from "react-router-dom";
import { XCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const VendorRejected = () => {
  const { user } = useAuth();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Application Rejected — TechTrust";
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("vendor_profiles")
        .select("rejection_reason")
        .eq("user_id", user.id)
        .maybeSingle();
      setReason(data?.rejection_reason ?? null);
    })();
  }, [user]);

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
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 grid place-items-center mb-5">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Application Rejected</h1>
          <p className="text-muted-foreground leading-relaxed">
            Unfortunately your vendor application was not approved at this time.
          </p>
          {reason && (
            <div className="mt-4 text-left bg-destructive/5 border border-destructive/20 rounded-lg p-4">
              <div className="text-xs uppercase tracking-wide text-destructive font-semibold mb-1">
                Reason from verification team
              </div>
              <p className="text-sm">{reason}</p>
            </div>
          )}
          <p className="text-muted-foreground leading-relaxed mt-4">
            You may contact our support team to appeal or get guidance on
            resubmitting your application.
          </p>
          <Button variant="secondary" className="mt-8" asChild>
            <Link to="/">Back to Home</Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-6">
            Contact us at{" "}
            <a href="mailto:johnmwangimegwe@gmail.com" className="text-accent hover:underline">
              johnmwangimegwe@gmail.com
            </a>{" "}
            or{" "}
            <a href="mailto:support@techtrust.co.ke" className="text-accent hover:underline">
              support@techtrust.co.ke
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorRejected;
