import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Required role(s). If omitted, any authenticated user may pass. */
  roles?: ("customer" | "vendor" | "admin")[];
  /** For vendor routes: require verification_status === 'approved'. */
  requireApprovedVendor?: boolean;
  /** Where to send an unauthenticated visitor. Defaults to the customer/vendor auth page. */
  loginPath?: string;
}

export const ProtectedRoute = ({ children, roles, requireApprovedVendor, loginPath = "/auth" }: Props) => {
  const { user, roles: userRoles, loading } = useAuth();
  const location = useLocation();
  const [vendorStatus, setVendorStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(requireApprovedVendor ?? false);

  useEffect(() => {
    if (!requireApprovedVendor || !user) {
      setChecking(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("vendor_profiles")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      setVendorStatus(data?.verification_status ?? null);
      setChecking(false);
    })();
  }, [requireApprovedVendor, user]);

  if (loading || checking) {
    return (
      <div className="grid place-items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;

  if (roles && !roles.some((r) => userRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  if (requireApprovedVendor) {
    if (vendorStatus === "suspended") return <Navigate to="/vendor/suspended" replace />;
    if (vendorStatus !== "approved" && vendorStatus !== "verified")
      return <Navigate to="/vendor/pending" replace />;
  }

  return <>{children}</>;
};
