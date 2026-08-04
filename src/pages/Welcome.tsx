import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Loader2, Gift, ArrowLeft } from "lucide-react";
import { ShoppingBagIcon } from "@/components/icons/ShoppingBagIcon";
import { StoreIcon } from "@/components/icons/StoreIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * One-time gate shown right after a brand-new Google sign-in - email/password
 * sign-ups already pick a role before the account exists, but Google never
 * asks. profiles.onboarding_complete flips to true once a choice is made, so
 * this page never appears again for that account.
 */
const Welcome = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [settling, setSettling] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    document.title = "Welcome to TechTrust";
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  const applyReferralIfEntered = async () => {
    const code = referralCode.trim();
    if (!code) return;
    const { data, error } = await supabase.rpc("apply_referral_code", { p_code: code });
    if (!error && data === true) {
      toast.success("Referral code applied!");
    } else if (!error) {
      toast.error("That referral code isn't valid.");
    }
  };

  const chooseCustomer = async () => {
    if (!user) return;
    setSettling(true);
    await applyReferralIfEntered();
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_complete: true })
      .eq("id", user.id);
    setSettling(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/browse", { replace: true });
  };

  const chooseVendor = async () => {
    setSettling(true);
    await applyReferralIfEntered();
    setSettling(false);
    navigate("/vendor/onboarding", { replace: true });
  };

  if (authLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative grid place-items-center px-4 py-10 bg-gradient-subtle">
      {/* Back Button */}
      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate("/auth", { replace: true });
        }}
        className="absolute top-6 left-6 flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm rounded-lg transition-all font-medium text-sm z-10"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="w-full max-w-lg mt-8">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <span className="font-display-h2 text-3xl md:text-4xl font-bold text-[#0F3D8C]">TechTrust</span>
          <img src="/logo-transparent.png" alt="TechTrust Logo" className="h-12 md:h-14 w-auto object-contain " />
        </Link>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome to TechTrust</h1>
          <p className="text-sm text-muted-foreground mb-6">
            One quick thing - what brings you here?
          </p>

          <div className="mb-6 text-left">
            <Label htmlFor="welcome-referral" className="flex items-center gap-1.5 text-sm">
              <Gift className="h-3.5 w-3.5 text-accent" /> Referral code (optional)
            </Label>
            <Input
              id="welcome-referral"
              autoComplete="off"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="mt-1.5 uppercase"
              placeholder="e.g. JOHN91D14"
              disabled={settling}
            />
            <p className="text-xs text-muted-foreground mt-1">
              You and your friend each get KES 500 after your first order.
            </p>
          </div>

          <div className="space-y-3 text-left">
            <button
              type="button"
              onClick={chooseCustomer}
              disabled={settling}
              className="w-full flex items-center gap-4 rounded-xl border border-border p-4 text-left transition-all hover:border-accent hover:bg-accent-soft hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                {settling ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingBagIcon className="h-5 w-5" />}
              </span>
              <span>
                <span className="block font-semibold text-sm">I'm a Customer</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Browse verified laptops, phones and repairs
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={chooseVendor}
              disabled={settling}
              className="w-full flex items-center gap-4 rounded-xl border border-border p-4 text-left transition-all hover:border-accent hover:bg-accent-soft hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <StoreIcon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-sm">I'm a Vendor</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  List your shop and reach verified buyers
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
