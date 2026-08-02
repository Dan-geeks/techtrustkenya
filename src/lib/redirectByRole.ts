import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the path the user should land on after sign-in based on role + vendor status.
 */
export async function getPostLoginPath(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.onboarding_complete === false) return "/welcome";

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roleSet = new Set((roles ?? []).map((r) => r.role));

  // Admins should not be forced to the admin dashboard on login;
  // they can navigate there manually when they want to.
  // if (roleSet.has("admin")) return "/admin/dashboard";

  const { data: vp } = await supabase
    .from("vendor_profiles")
    .select("verification_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (vp || roleSet.has("vendor")) {
    const status = vp?.verification_status;
    if (status === "approved" || status === "verified") return "/vendor/dashboard";
    if (status === "suspended") return "/vendor/suspended";
    if (status === "rejected") return "/vendor/rejected";
    return "/vendor/pending";
  }

  return "/browse";
}
