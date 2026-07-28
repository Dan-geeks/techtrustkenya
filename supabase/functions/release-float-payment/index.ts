import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PayoutProvider = "simulation" | "safaricom_b2c" | "kcb_buni";

type PayoutResult = {
  provider: PayoutProvider;
  accepted: boolean;
  final: boolean;
  reference?: string;
  receipt?: string;
  message?: string;
  details?: unknown;
};

function env(name: string, fallback = ""): string {
  return Deno.env.get(name) ?? fallback;
}

function isTrue(value: string | undefined | null): boolean {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function cleanBaseUrl(value: string, fallback: string): string {
  return (value || fallback).replace(/\/+$/, "");
}

function formatPhone(raw: string): string {
  let p = (raw ?? "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "254" + p.substring(1);
  if ((p.startsWith("7") || p.startsWith("1")) && p.length === 9) p = "254" + p;
  return p;
}

function maskPhone(phone: string): string {
  return phone.slice(0, 4) + "XXXXXX";
}

function ok(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getJson(res: Response): Promise<Record<string, unknown>> {
  return await res.json().catch(() => ({}));
}

async function getDarajaToken(): Promise<string> {
  const key = env("MPESA_CONSUMER_KEY");
  const secret = env("MPESA_CONSUMER_SECRET");
  if (!key || !secret) throw new Error("Missing M-Pesa consumer key/secret");

  const baseUrl = cleanBaseUrl(env("MPESA_BASE_URL"), "https://sandbox.safaricom.co.ke");
  const auth = btoa(`${key}:${secret}`);
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await getJson(res);
  const token = firstString(data.access_token);
  if (!res.ok || !token) {
    throw new Error(firstString(data.errorMessage, data.error, data.message) ?? "Failed to obtain M-Pesa OAuth token");
  }
  return token;
}

async function getKcbToken(): Promise<string> {
  const key = env("KCB_BUNI_CONSUMER_KEY") || env("KCB_CONSUMER_KEY");
  const secret = env("KCB_BUNI_CONSUMER_SECRET") || env("KCB_CONSUMER_SECRET");
  if (!key || !secret) throw new Error("Missing KCB Buni consumer key/secret");

  const baseUrl = cleanBaseUrl(env("KCB_BUNI_BASE_URL"), "https://uat.buni.kcbgroup.com");
  const tokenUrl = env("KCB_BUNI_TOKEN_URL") || `${baseUrl}/oauth2/token`;
  const auth = btoa(`${key}:${secret}`);
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await getJson(res);
  const token = firstString(data.access_token);
  if (!res.ok || !token) {
    throw new Error(firstString(data.error_description, data.error, data.message) ?? "Failed to obtain KCB Buni token");
  }
  return token;
}

// Returns the resolved payout provider or null if none is configured.
// Callers are responsible for surfacing a user-friendly error when null is returned.
function resolvePayoutProvider(): PayoutProvider | null {
  const configured = env("PAYOUT_PROVIDER").toLowerCase();
  if (["simulation", "simulator", "demo"].includes(configured)) return "simulation";
  if (["kcb", "kcb_buni", "buni"].includes(configured)) return "kcb_buni";
  if (["safaricom", "daraja", "mpesa", "safaricom_b2c"].includes(configured)) return "safaricom_b2c";
  if (env("KCB_BUNI_PAYOUT_URL")) return "kcb_buni";
  if (env("MPESA_INITIATOR_NAME") && env("MPESA_SECURITY_CREDENTIAL")) return "safaricom_b2c";
  if (isTrue(env("PAYOUT_SIMULATION_ENABLED")) || isTrue(env("PAYMENT_SANDBOX_MODE"))) return "simulation";
  return null;
}

function buildKcbPayoutBody(args: {
  orderId: string;
  amountKsh: number;
  vendorPhone: string;
  vendorName?: string;
}): Record<string, unknown> {
  const reference = `TT-REL-${args.orderId.slice(0, 8).toUpperCase()}`;
  const template = env("KCB_BUNI_PAYOUT_BODY_TEMPLATE");
  if (template) {
    const replaced = template
      .replaceAll("{{orderId}}", args.orderId)
      .replaceAll("{{reference}}", reference)
      .replaceAll("{{amount}}", String(args.amountKsh))
      .replaceAll("{{phone}}", args.vendorPhone)
      .replaceAll("{{vendorName}}", args.vendorName ?? "TechTrust vendor")
      .replaceAll("{{sourceAccount}}", env("KCB_BUNI_SOURCE_ACCOUNT"));
    return JSON.parse(replaced);
  }

  return {
    transactionReference: reference,
    sourceAccount: env("KCB_BUNI_SOURCE_ACCOUNT"),
    phoneNumber: args.vendorPhone,
    amount: String(args.amountKsh),
    currency: "KES",
    description: `TechTrust escrow release ${reference}`,
    callbackUrl: env("KCB_BUNI_PAYOUT_CALLBACK_URL") || env("MPESA_CALLBACK_URL"),
  };
}

async function sendKcbBuniPayout(args: {
  orderId: string;
  amountKsh: number;
  vendorPhone: string;
  vendorName?: string;
}): Promise<PayoutResult> {
  const payoutUrl = env("KCB_BUNI_PAYOUT_URL");
  if (!payoutUrl) throw new Error("Missing KCB_BUNI_PAYOUT_URL for Buni send-money payouts");

  const token = await getKcbToken();
  const body = buildKcbPayoutBody(args);
  const reference = firstString(body.transactionReference, body.reference, body.MerchantTransactionReference);
  const res = await fetch(payoutUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(env("KCB_BUNI_API_KEY") ? { apikey: env("KCB_BUNI_API_KEY") } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await getJson(res);
  const response = data.response as Record<string, unknown> | undefined;
  const header = data.header as Record<string, unknown> | undefined;
  const code = firstString(
    header?.statusCode,
    response?.ResponseCode,
    data.ResponseCode,
    data.statusCode,
    data.code,
  );
  const accepted =
    res.ok &&
    (["0", "00", "000"].includes(String(code ?? "")) || (code === undefined && isTrue(env("KCB_BUNI_ASSUME_HTTP_2XX_SUCCESS"))));
  if (!accepted) {
    const errorMessage =
      firstString(header?.statusDescription, response?.ResponseDescription, data.errorMessage, data.message) ??
      `KCB Buni payout failed with HTTP ${res.status}`;
    console.error("[release-float-payment] KCB payout rejected. Response body:", JSON.stringify(data));
    throw new Error(errorMessage);
  }

  const payoutReference = firstString(
    response?.ConversationID,
    response?.OriginatorConversationID,
    response?.TransactionID,
    data.ConversationID,
    data.OriginatorConversationID,
    data.TransactionID,
    reference,
  );

  return {
    provider: "kcb_buni",
    accepted: true,
    final: isTrue(env("KCB_BUNI_PAYOUT_IS_FINAL")),
    reference: payoutReference,
    receipt: firstString(response?.TransactionID, data.TransactionID),
    message: firstString(header?.statusDescription, response?.ResponseDescription, data.message) ?? "KCB Buni payout accepted",
    details: data,
  };
}

async function sendDarajaB2c(args: {
  orderId: string;
  amountKsh: number;
  vendorPhone: string;
}): Promise<PayoutResult> {
  const initiator = env("MPESA_INITIATOR_NAME");
  const credential = env("MPESA_SECURITY_CREDENTIAL");
  const shortcode = env("MPESA_B2C_SHORTCODE") || env("MPESA_SHORTCODE") || "174379";
  const resultUrl = env("MPESA_B2C_RESULT_URL") || env("MPESA_CALLBACK_URL");
  const timeoutUrl = env("MPESA_B2C_TIMEOUT_URL") || env("MPESA_CALLBACK_URL");
  if (!initiator || !credential || !resultUrl || !timeoutUrl) {
    throw new Error("M-Pesa B2C credentials not fully configured");
  }

  const token = await getDarajaToken();
  const baseUrl = cleanBaseUrl(env("MPESA_BASE_URL"), "https://sandbox.safaricom.co.ke");
  const res = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      InitiatorName: initiator,
      SecurityCredential: credential,
      CommandID: env("MPESA_B2C_COMMAND_ID", "BusinessPayment"),
      Amount: Math.round(args.amountKsh),
      PartyA: shortcode,
      PartyB: args.vendorPhone,
      Remarks: `TechTrust order ${args.orderId.slice(0, 8).toUpperCase()}`,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: resultUrl,
      Occasion: "TechTrustPayout",
    }),
  });
  const data = await getJson(res);
  if (!res.ok || firstString(data.ResponseCode) !== "0") {
    throw new Error(firstString(data.errorMessage, data.ResponseDescription, data.message) ?? `M-Pesa B2C failed with HTTP ${res.status}`);
  }

  return {
    provider: "safaricom_b2c",
    accepted: true,
    final: false,
    reference: firstString(data.OriginatorConversationID, data.ConversationID),
    message: firstString(data.ResponseDescription) ?? "M-Pesa B2C payout accepted",
    details: data,
  };
}

async function sendPayout(args: {
  orderId: string;
  amountKsh: number;
  vendorPhone: string;
  vendorName?: string;
  provider: PayoutProvider;
}): Promise<PayoutResult> {
  const { provider } = args;
  if (provider === "simulation") {
    if (!isTrue(env("PAYOUT_SIMULATION_ENABLED")) && !isTrue(env("PAYMENT_SANDBOX_MODE"))) {
      throw new Error("Simulation payout requested but PAYOUT_SIMULATION_ENABLED is not true");
    }
    const receipt = `SIM-REL-${Date.now().toString(36).toUpperCase()}`;
    return {
      provider,
      accepted: true,
      final: true,
      reference: receipt,
      receipt,
      message: "Sandbox simulation payout completed",
      details: { simulated: true },
    };
  }

  const { orderId, amountKsh, vendorPhone, vendorName } = args;
  if (provider === "kcb_buni") return await sendKcbBuniPayout({ orderId, amountKsh, vendorPhone, vendorName });
  return await sendDarajaB2c({ orderId, amountKsh, vendorPhone });
}

async function recordPaymentEvent(
  admin: ReturnType<typeof createClient>,
  event: Record<string, unknown>,
) {
  const { error } = await admin.from("order_payment_events").insert(event);
  if (error) console.warn("order_payment_events insert skipped", error.message);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = env("SUPABASE_URL");
    const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON) {
      return ok({ success: false, error: "Missing Supabase server configuration" }, 500);
    }

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return ok({ success: false, error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return ok({ success: false, error: "Unauthorized" }, 401);

    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId) return ok({ success: false, error: "orderId required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, customer_id, vendor_id, status, payment_status, total_amount_ksh, platform_fee_ksh, vendor_payout_ksh, payout_status")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr || !order) return ok({ success: false, error: "Order not found" }, 404);
    if (order.customer_id !== userData.user.id) return ok({ success: false, error: "Forbidden" }, 403);
    if (order.payment_status !== "paid_float") {
      return ok({ success: false, error: "Payment is not held in Float" }, 409);
    }

    // Idempotency: if payout was already sent or released, skip API call
    if (order.payout_status === "sent" || order.payout_status === "released") {
      return ok({ success: true, message: "Payout already sent" });
    }

    const { data: vendor } = await admin
      .from("vendor_profiles")
      .select("id, user_id, business_name, phone")
      .eq("id", order.vendor_id)
      .maybeSingle();
    const vendorPhone = formatPhone(vendor?.phone ?? "");
    if (!/^254\d{9}$/.test(vendorPhone)) {
      return ok({ success: false, error: "Vendor payout phone is missing or invalid" }, 409);
    }

    const provider = resolvePayoutProvider();
    console.log(
      `[release-float-payment] orderId=${orderId} provider=${provider ?? "none"} vendorPhone=${maskPhone(vendorPhone)}`,
    );

    if (provider === null) {
      return ok(
        { success: false, error: "Payout system is not configured. Please contact support." },
        503,
      );
    }

    const canRelease =
      order.status === "delivered_awaiting_confirmation" ||
      (order.status === "confirmed" && order.payout_status === "failed");
    if (!canRelease) {
      return ok({ success: false, error: "Order is not awaiting customer confirmation" }, 409);
    }
    if (["pending", "sent"].includes(String(order.payout_status ?? ""))) {
      return ok({ success: false, error: "Payout has already been requested" }, 409);
    }

    const payoutAmount = Number(order.vendor_payout_ksh ?? (Number(order.total_amount_ksh) - Number(order.platform_fee_ksh)));
    const payout = await sendPayout({
      orderId,
      amountKsh: payoutAmount,
      vendorPhone,
      vendorName: vendor?.business_name,
      provider,
    });

    const now = new Date().toISOString();
    const updatePayload = payout.final
      ? {
          status: "confirmed",
          payment_status: "released",
          float_released_at: now,
          payout_status: "sent",
          payout_provider: payout.provider,
          payout_reference: payout.receipt ?? payout.reference,
          payout_error: null,
          payout_gateway_response: payout.details,
          updated_at: now,
        }
      : {
          status: "confirmed",
          payout_status: "pending",
          payout_provider: payout.provider,
          payout_reference: payout.reference,
          payout_error: null,
          payout_gateway_response: payout.details,
          updated_at: now,
        };

    const { error: updateErr } = await admin.from("orders").update(updatePayload).eq("id", orderId);
    if (updateErr) return ok({ success: false, error: updateErr.message }, 500);

    await recordPaymentEvent(admin, {
      order_id: orderId,
      event_type: payout.final ? "payout_confirmed" : "payout_initiated",
      provider: payout.provider,
      amount_ksh: payoutAmount,
      reference: payout.receipt ?? payout.reference ?? null,
      payload: payout.details,
    });

    if (vendor?.user_id) {
      await admin.from("notifications").insert({
        user_id: vendor.user_id,
        title: payout.final ? "Float released to your mobile money" : "Float payout is processing",
        message: payout.final
          ? `Payment of KES ${payoutAmount.toLocaleString()} has been sent to your number ending ${vendorPhone.slice(-4)}. Reference: ${payout.receipt ?? payout.reference}.`
          : `The customer confirmed delivery. Your payout of KES ${payoutAmount.toLocaleString()} is processing to the number ending ${vendorPhone.slice(-4)}.`,
        type: "payment",
        reference_id: orderId,
      });
    }

    return ok({
      success: true,
      payoutPending: !payout.final,
      payoutProvider: payout.provider,
      payoutReference: payout.receipt ?? payout.reference,
      message: payout.message,
    });
  } catch (err) {
    console.error("release-float-payment error", err);
    return ok({ success: false, error: err instanceof Error ? err.message : String(err) }, 200);
  }
});
