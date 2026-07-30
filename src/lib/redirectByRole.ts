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

  if (roleSet.has("admin")) return "/admin/dashboard";

  if (roleSet.has("vendor")) {
    const { data: vp } = await supabase
      .from("vendor_profiles")
      .select("verification_status")
      .eq("user_id", userId)
      .maybeSingle();
    const status = vp?.verification_status;
    if (status === "approved" || status === "verified") return "/vendor/dashboard";
    if (status === "suspended") return "/vendor/suspended";
    if (status === "rejected") return "/vendor/rejected";
    return "/vendor/pending";
  }

  return "/browse";
}
