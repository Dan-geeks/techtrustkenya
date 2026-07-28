// Mobile-money STK Push edge function.
// Supports the existing Safaricom Daraja setup and KCB Buni when
// PAYMENT_PROVIDER=kcb_buni or KCB_BUNI_* credentials are configured.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Provider = "safaricom_daraja" | "kcb_buni";

type StkResult = {
  provider: Provider;
  success: boolean;
  transactionId?: string;
  merchantRequestId?: string;
  customerMessage?: string;
  error?: string;
  details?: unknown;
};

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

// Normalise a phone number to 254XXXXXXXXX format.
// Handles +254..., 254..., 07..., 7XXXXXXXX.
function formatPhone(raw: string): string | null {
  // Strip the leading + so +254... becomes 254...
  const stripped = String(raw).replace(/^\+/, "");
  const digits = stripped.replace(/\D/g, "");
  if (/^254\d{9}$/.test(digits)) return digits;
  if (/^0\d{9}$/.test(digits)) return "254" + digits.slice(1);
  if (/^7\d{8}$/.test(digits) || /^1\d{8}$/.test(digits)) return "254" + digits;
  return null;
}

function maskPhone(phone: string): string {
  return phone.slice(0, 4) + "XXXXXX";
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function resolveProvider(): Provider {
  const configured = env("PAYMENT_PROVIDER").toLowerCase();
  if (["kcb", "kcb_buni", "buni"].includes(configured)) return "kcb_buni";
  if (["safaricom", "daraja", "mpesa", "safaricom_daraja"].includes(configured)) {
    return "safaricom_daraja";
  }
  if (env("KCB_BUNI_CONSUMER_KEY") && env("KCB_BUNI_CONSUMER_SECRET")) return "kcb_buni";
  return "safaricom_daraja";
}

// In sandbox mode (PAYMENT_SANDBOX_MODE=true), PAYMENT_TEST_AMOUNT_KSH overrides
// the real order amount — useful for testing without charging real money.
// In production (sandbox mode NOT set), PAYMENT_TEST_AMOUNT_KSH is ignored even
// if present, and the real order amount is always used.
function resolveChargeAmount(totalAmountKsh: number): number {
  const sandboxMode = isTrue(env("PAYMENT_SANDBOX_MODE"));
  const override = Number(env("PAYMENT_TEST_AMOUNT_KSH"));
  if (Number.isFinite(override) && override > 0) {
    if (sandboxMode) {
      return Math.max(1, Math.ceil(override));
    }
    // PAYMENT_TEST_AMOUNT_KSH is set but sandbox mode is off — warn and use real amount
    console.warn(
      "[mpesa-stkpush] PAYMENT_TEST_AMOUNT_KSH is set but PAYMENT_SANDBOX_MODE is not true. " +
        "Using real order amount in production. Set PAYMENT_SANDBOX_MODE=true to use the test amount.",
    );
  }
  return Math.max(1, Math.ceil(totalAmountKsh));
}

async function getJson(res: Response): Promise<Record<string, unknown>> {
  return await res.json().catch(() => ({}));
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
    throw new Error(
      `Failed to get KCB Buni token: ${firstString(data.error_description, data.error, data.message) ?? `HTTP ${res.status}`}`,
    );
  }
  return token;
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
    throw new Error(
      `Failed to get M-Pesa token: ${firstString(data.errorMessage, data.error, data.message) ?? `HTTP ${res.status}`}`,
    );
  }
  return token;
}

async function requestKcbBuniStk(args: {
  orderId: string;
  phone: string;
  amountKsh: number;
}): Promise<StkResult> {
  const callbackUrl = env("KCB_BUNI_CALLBACK_URL") || env("MPESA_CALLBACK_URL");
  if (!callbackUrl) return { provider: "kcb_buni", success: false, error: "Missing KCB_BUNI_CALLBACK_URL" };

  const token = await getKcbToken();
  const baseUrl = cleanBaseUrl(env("KCB_BUNI_BASE_URL"), "https://uat.buni.kcbgroup.com");
  const stkUrl = env("KCB_BUNI_STK_URL") || `${baseUrl}/mm/api/request/1.0.0/stkpush`;
  const accountRef = `TT-${args.orderId.slice(0, 8).toUpperCase()}`;
  const invoiceNumber =
    env("KCB_BUNI_INVOICE_NUMBER") ||
    env("KCB_BUNI_ACCOUNT_NUMBER") ||
    accountRef;

  const res = await fetch(stkUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(env("KCB_BUNI_API_KEY") ? { apikey: env("KCB_BUNI_API_KEY") } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumber: args.phone,
      amount: String(args.amountKsh),
      invoiceNumber,
      sharedShortCode: !isTrue(env("KCB_BUNI_DEDICATED_SHORTCODE")),
      orgShortCode: env("KCB_BUNI_ORG_SHORTCODE", "522522"),
      orgPassKey: env("KCB_BUNI_ORG_PASSKEY"),
      callbackUrl,
      transactionDescription: `TechTrust escrow ${accountRef}`,
    }),
  });
  const data = await getJson(res);
  const response = data.response as Record<string, unknown> | undefined;
  const header = data.header as Record<string, unknown> | undefined;
  const code = firstString(header?.statusCode, response?.ResponseCode, data.ResponseCode, data.statusCode);

  if (!res.ok || code !== "0") {
    const errorMessage =
      firstString(header?.statusDescription, response?.ResponseDescription, response?.errorMessage, data.errorMessage, data.message) ??
      `KCB Buni STK push failed with HTTP ${res.status}`;
    console.error("[mpesa-stkpush] KCB STK push failed. Response body:", JSON.stringify(data));
    return {
      provider: "kcb_buni",
      success: false,
      error: errorMessage,
      details: data,
    };
  }

  // Validate that CheckoutRequestID is present — required to match the callback later
  const checkoutRequestId = firstString(response?.CheckoutRequestID, data.CheckoutRequestID);
  if (!checkoutRequestId) {
    console.error("[mpesa-stkpush] KCB STK push response missing CheckoutRequestID. Full response:", JSON.stringify(data));
    return {
      provider: "kcb_buni",
      success: false,
      error: "KCB Buni response did not include a CheckoutRequestID. Cannot track payment.",
      details: data,
    };
  }

  const transactionId = checkoutRequestId;

  return {
    provider: "kcb_buni",
    success: true,
    transactionId,
    merchantRequestId: firstString(response?.MerchantRequestID, data.MerchantRequestID),
    customerMessage:
      firstString(response?.CustomerMessage, response?.ResponseDescription, header?.statusDescription) ??
      "STK Push accepted",
    details: data,
  };
}

async function requestDarajaStk(args: {
  orderId: string;
  phone: string;
  amountKsh: number;
}): Promise<StkResult> {
  const shortcode = env("MPESA_SHORTCODE");
  const passkey = env("MPESA_PASSKEY");
  const callbackUrl = env("MPESA_CALLBACK_URL");
  if (!shortcode || !passkey || !callbackUrl) {
    return { provider: "safaricom_daraja", success: false, error: "Missing M-Pesa STK configuration" };
  }

  const token = await getDarajaToken();
  const baseUrl = cleanBaseUrl(env("MPESA_BASE_URL"), "https://sandbox.safaricom.co.ke");
  const ts = timestamp();
  const password = btoa(`${shortcode}${passkey}${ts}`);
  const accountRef = `TT-${args.orderId.slice(0, 8).toUpperCase()}`;

  const res = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: args.amountKsh,
      PartyA: args.phone,
      PartyB: shortcode,
      PhoneNumber: args.phone,
      CallBackURL: callbackUrl,
      AccountReference: accountRef,
      TransactionDesc: "TechTrust escrow payment",
    }),
  });
  const data = await getJson(res);
  const code = firstString(data.ResponseCode);

  if (!res.ok || code !== "0") {
    return {
      provider: "safaricom_daraja",
      success: false,
      error: firstString(data.errorMessage, data.ResponseDescription, data.message) ?? "STK push failed",
      details: data,
    };
  }

  return {
    provider: "safaricom_daraja",
    success: true,
    transactionId: firstString(data.CheckoutRequestID),
    merchantRequestId: firstString(data.MerchantRequestID),
    customerMessage: firstString(data.CustomerMessage, data.ResponseDescription),
    details: data,
  };
}

async function recordPaymentEvent(
  admin: ReturnType<typeof createClient>,
  event: Record<string, unknown>,
) {
  const { error } = await admin.from("order_payment_events").insert(event);
  if (error) console.warn("order_payment_events insert skipped", error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = env("SUPABASE_URL");
    const SERVICE_KEY = env("SUPABASE_SERVICE_ROLE_KEY");
    const ANON = env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY || !ANON) {
      return ok({ success: false, error: "Missing Supabase server configuration" });
    }

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return ok({ success: false, error: "Unauthorized" });

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return ok({ success: false, error: "Unauthorized" });
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { order_id, phone } = body ?? {};
    if (!order_id || !phone) return ok({ success: false, error: "order_id and phone required" });

    const phoneFmt = formatPhone(String(phone));
    if (!phoneFmt) return ok({ success: false, error: "Invalid phone format" });

    const provider = resolveProvider();
    console.log(
      `[mpesa-stkpush] provider=${provider} orderId=${order_id} phone=${maskPhone(phoneFmt)}`,
    );

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, customer_id, total_amount_ksh, payment_status, status")
      .eq("id", order_id)
      .maybeSingle();
    if (orderErr || !order) return ok({ success: false, error: "Order not found" });
    if (order.customer_id !== userId) return ok({ success: false, error: "Forbidden" });
    if (order.payment_status !== "pending") return ok({ success: false, error: "Order already processed" });

    const amountKsh = resolveChargeAmount(Number(order.total_amount_ksh));
    const result = provider === "kcb_buni"
      ? await requestKcbBuniStk({ orderId: String(order_id), phone: phoneFmt, amountKsh })
      : await requestDarajaStk({ orderId: String(order_id), phone: phoneFmt, amountKsh });

    if (!result.success) {
      await recordPaymentEvent(admin, {
        order_id,
        event_type: "payment_initiation_failed",
        provider: result.provider,
        amount_ksh: amountKsh,
        payload: result.details ?? { error: result.error },
      });
      return ok({ success: false, error: result.error, details: result.details, provider: result.provider });
    }

    const tx = result.transactionId ?? result.merchantRequestId ?? `TT-${String(order_id).slice(0, 8).toUpperCase()}`;
    await admin.from("orders").update({ mpesa_transaction_id: tx }).eq("id", order_id);

    const { error: metadataErr } = await admin
      .from("orders")
      .update({
        payment_provider: result.provider,
        paid_amount_ksh: amountKsh,
        payment_gateway_response: result.details,
      })
      .eq("id", order_id);
    if (metadataErr) console.warn("Payment metadata update skipped", metadataErr.message);

    await recordPaymentEvent(admin, {
      order_id,
      event_type: "payment_initiated",
      provider: result.provider,
      amount_ksh: amountKsh,
      reference: tx,
      payload: result.details,
    });

    return ok({
      success: true,
      provider: result.provider,
      amountKsh,
      CheckoutRequestID: result.transactionId,
      MerchantRequestID: result.merchantRequestId,
      CustomerMessage: result.customerMessage,
    });
  } catch (e) {
    console.error("mpesa-stkpush error", e);
    return ok({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
});
