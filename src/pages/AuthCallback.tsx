import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPostLoginPath } from "@/lib/redirectByRole";
import { toast } from "sonner";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export const AuthCallback = () => {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let hasProcessed = false;

    const handleOAuthCallback = async () => {
      try {
        // Check for error parameters in URL or Hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        const oauthError =
          hashParams.get("error_description") ||
          hashParams.get("error") ||
          searchParams.get("error_description") ||
          searchParams.get("error");

        if (oauthError) {
          throw new Error(oauthError);
        }

        // Wait for session established
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        const processNavigation = async (userId: string, email?: string, fullName?: string) => {
          if (!isMounted || hasProcessed) return;
          hasProcessed = true;

          // Apply pending referral code if passed during OAuth / Google signup
          const pendingRef = localStorage.getItem("pending_referral_code");
          if (pendingRef) {
            localStorage.removeItem("pending_referral_code");
            try {
              const { error: refErr } = await supabase.rpc("apply_referral_code", { p_code: pendingRef });
              if (!refErr) {
                toast.success("Referral bonus applied! KES 500 added to your wallet.");
              }
            } catch (e) {
              console.warn("Failed to apply referral code:", e);
            }
          }

          toast.success(`Welcome back, ${fullName || email || "user"}!`);

          const savedTarget = localStorage.getItem("auth_redirect_target");
          localStorage.removeItem("auth_redirect_target");
          
          const pendingRole = localStorage.getItem("pending_role");
          localStorage.removeItem("pending_role");

          if (pendingRole === "vendor") {
            navigate("/vendor/onboarding", { replace: true });
          } else if (savedTarget && savedTarget !== "/auth" && savedTarget !== "/profile" && savedTarget !== "/") {
            navigate(savedTarget, { replace: true });
          } else {
            const targetPath = await getPostLoginPath(userId);
            navigate(targetPath, { replace: true });
          }
        };

        if (session) {
          await processNavigation(
            session.user.id,
            session.user.email,
            session.user.user_metadata?.full_name
          );
        } else {
          // Listen for session established event (PKCE flow)
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === "SIGNED_IN" && newSession && isMounted) {
              await processNavigation(
                newSession.user.id,
                newSession.user.email,
                newSession.user.user_metadata?.full_name
              );
            }
          });

          // Timeout fallback in case auth fails or is cancelled
          const timer = setTimeout(() => {
            if (isMounted) {
              subscription.unsubscribe();
              toast.error("Authentication timed out. Please try signing in again.");
              navigate("/auth", { replace: true });
            }
          }, 6000);

          return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
          };
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err?.message || "Failed to complete authentication.";
        setErrorMsg(msg);
        toast.error(msg);
        setTimeout(() => navigate("/auth", { replace: true }), 3000);
      }
    };

    void handleOAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 antialiased">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-10 h-10" />
          </div>
        </div>

        {errorMsg ? (
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Authentication Error</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{errorMsg}</p>
            <p className="text-xs text-slate-500">Redirecting to sign in pageâ€¦</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Authenticating with Googleâ€¦</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Verifying your security credentials with TechTrust Escrow Engine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
