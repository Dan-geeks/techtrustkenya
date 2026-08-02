import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const VendorSuspended = () => {
  useEffect(() => {
    document.title = "Account suspended | TechTrust";
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <ShieldCheck className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="text-base font-bold tracking-tight font-display">
            Tech<span className="text-accent">Trust</span>
          </span>
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 md:p-10 shadow-card text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 grid place-items-center mb-5">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-3">Account Suspended</h1>
          <p className="text-muted-foreground leading-relaxed">
            Your vendor account has been suspended. This may be due to a policy
            violation or customer complaints. Please contact our support team for
            assistance.
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

export default VendorSuspended;
