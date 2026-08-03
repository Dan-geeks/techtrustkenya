import { supabase } from "@/integrations/supabase/client";

/** Fallback when the setting is missing or unreadable. */
export const DEFAULT_ESCROW_FEE_PERCENT = 5;

/**
 * The platform commission, set by admins in app_settings.escrow_fee_percentage.
 * Checkout used to hardcode 5%, so changing it in the admin console had no
 * effect on what buyers were actually charged.
 */
export async function fetchEscrowFeePercent(): Promise<number> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "escrow_fee_percentage")
    .maybeSingle();

  const pct = Number(data?.value);
  // Guard against a blank/garbage/negative setting silently zeroing revenue.
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return DEFAULT_ESCROW_FEE_PERCENT;
  return pct;
}
