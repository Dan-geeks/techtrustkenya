import { supabase } from "@/integrations/supabase/client";

type InvokeOptions = {
  body?: unknown;
};

type InvokeResult<T> = {
  data: T | null;
  error: Error | null;
};

const FUNCTION_BASE_URL = import.meta.env.VITE_RAILWAY_FUNCTION_URL?.replace(/\/+$/, "");

/** Base URL of the escrow API. Pages must use this rather than hardcoding a Railway
 *  host — two pages pinned the old deleted deployment and silently broke. */
export const ESCROW_API_BASE = FUNCTION_BASE_URL ?? "";

/** True when a dedicated escrow API is configured (rather than Supabase edge functions). */
export const hasEscrowApi = Boolean(FUNCTION_BASE_URL);

export async function invokeFunction<T = any>(
  name: string,
  options: InvokeOptions = {},
): Promise<InvokeResult<T>> {
  if (!FUNCTION_BASE_URL) {
    const { data, error } = await supabase.functions.invoke<T>(name, {
      body: options.body,
    });
    return { data: data ?? null, error: error ?? null };
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${FUNCTION_BASE_URL}/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(options.body ?? {}),
    });
    const data = (await response.json().catch(() => null)) as T | null;

    if (!response.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error?: unknown }).error)
          : `Request failed with status ${response.status}`;
      return { data, error: new Error(message) };
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Fire the welcome email for a freshly created account.
 *
 * Deliberately fire-and-forget: the server addresses the mail from the caller's
 * own verified session, and a mail failure must never surface as a failed
 * signup. Guarded so the same browser doesn't re-send on every auth state
 * re-emit (an OAuth round trip fires several).
 */
export async function sendWelcomeEmail(args: { name?: string; role?: "customer" | "vendor" }): Promise<void> {
  if (!FUNCTION_BASE_URL) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const guard = `techtrust:welcomed:${session.user.id}`;
    if (localStorage.getItem(guard)) return;
    localStorage.setItem(guard, "1");

    await fetch(`${FUNCTION_BASE_URL}/email/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ name: args.name, role: args.role ?? "customer" }),
    });
  } catch (error) {
    console.warn("welcome email skipped", error);
  }
}

export type PaymentStatus = {
  success: boolean;
  status: "pending" | "paid" | "failed";
  orderId?: string;
  checkoutRequestId?: string | null;
  receipt?: string | null;
  amountKsh?: number;
  paymentStatus?: string;
  orderStatus?: string;
  heldInFloat?: boolean;
  error?: string;
};

/**
 * Response 2 of an STK Push. Response 1 only means the PIN prompt was delivered —
 * this is the call that tells you whether money actually moved. Poll it until
 * `status` stops being "pending".
 *
 * Returns null when no escrow API is configured, so callers can fall back to
 * reading the order row directly.
 */
export async function fetchPaymentStatus(
  orderId: string,
): Promise<PaymentStatus | null> {
  if (!FUNCTION_BASE_URL) return null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    const response = await fetch(
      `${FUNCTION_BASE_URL}/payment-status?order_id=${encodeURIComponent(orderId)}`,
      { headers: { Authorization: `Bearer ${session.access_token}` } },
    );
    const data = (await response.json().catch(() => null)) as PaymentStatus | null;
    if (!response.ok || !data?.success) return null;
    return data;
  } catch {
    // Network hiccup mid-poll is not a payment failure — let the caller retry.
    return null;
  }
}
