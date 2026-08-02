// TechTrust Float — escrow payment backend (Bun + Hono, deployed on Railway).
//
// Escrow model, end to end:
//   1. POST /mpesa-stkpush      → push the STK prompt, store CheckoutRequestID.  (Response 1)
//   2. Customer enters M-Pesa PIN.
//   3. POST /mpesa-callback     → gateway confirms, funds are marked held in Float. (Response 2)
//   4. GET  /payment-status     → the client polls this until it stops being `pending`.
//      (With PAYMENT_PROVIDER=darajapay there is no step 3 — DarajaPay owns the
//      callback, so step 4 polling its /widget/status IS Response 2.)
//   5. POST /release-float-payment → customer confirms delivery, vendor is paid out (B2C).
//   6. POST /payout-result      → gateway confirms the payout, order marked released.
//
// An STK Push returns TWO responses. Response 1 only means the PIN prompt was
// delivered — no money has moved. Never treat it as payment. Only step 3/4
// reaching `paid` is proof of payment.
import { Hono } from "hono";
import { cors } from "hono/cors";

type User = { id: string; email?: string };

type Order = {
  id: string;
  customer_id: string;
  vendor_id: string;
  product_id?: string;
  quantity?: number;
  total_amount_ksh: number;
  platform_fee_ksh?: number;
  vendor_payout_ksh?: number;
  payment_status: string;
  status: string;
  payout_status?: string | null;
  payout_reference?: string | null;
  mpesa_transaction_id?: string | null;
  mpesa_receipt_number?: string | null;
  paid_amount_ksh?: number | null;
  payment_provider?: string | null;
};

type Vendor = {
  id: string;
  user_id?: string | null;
  business_name?: string | null;
  phone?: string | null;
  till_number?: string | null;
};

type Provider = "simulation" | "safaricom_daraja" | "kcb_buni" | "darajapay";
type PayoutProvider = "simulation" | "safaricom_b2c" | "kcb_buni";

type StkResult = {
  provider: Provider;
  success: boolean;
  transactionId?: string;
  merchantRequestId?: string;
  customerMessage?: string;
  error?: string;
  details?: unknown;
};

type PayoutResult = {
  provider: PayoutProvider;
  accepted: boolean;
  /** true when the gateway settles synchronously and no result callback will arrive */
  final: boolean;
  reference?: string;
  receipt?: string;
  message?: string;
  details?: unknown;
};

type CallbackInfo = {
  kind: "payment" | "payout" | "unknown";
  resultCode?: string;
  resultDescription?: string;
  transactionId?: string;
  merchantRequestId?: string;
  receipt?: string;
  amountKsh?: number;
  provider?: string;
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const env = (name: string, fallback = "") => process.env[name] ?? fallback;

const requiredEnv = (name: string) => {
  const value = env(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const isTrue = (value: unknown) =>
  ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());

const supabaseUrl = () => requiredEnv("SUPABASE_URL").replace(/\/+$/, "");
const anonKey = () => env("SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");
const serviceKey = () => requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function toNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function cleanBaseUrl(value: string, fallback: string): string {
  return (value || fallback).replace(/\/+$/, "");
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function readBody(c: any): Promise<Record<string, any>> {
  return await c.req.json().catch(() => ({}));
}

/**
 * Gateways occasionally answer with a literal `null` body or with HTML from an
 * upstream proxy. `.catch()` alone does not cover `null`, which then blows up
 * on the first property access — always fall back to an object.
 */
async function getJson(res: Response): Promise<Record<string, unknown>> {
  const parsed = await res.json().catch(() => null);
  return (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, unknown>;
}

/** Normalise to 254XXXXXXXXX. Returns null when the input cannot be a Kenyan MSISDN. */
export function formatPhone(raw: string): string | null {
  const digits = String(raw ?? "").replace(/^\+/, "").replace(/\D/g, "");
  if (/^254[71]\d{8}$/.test(digits)) return digits;
  if (/^0[71]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[71]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

function maskPhone(phone: string): string {
  return `${phone.slice(0, 4)}XXXXXX${phone.slice(-2)}`;
}

/** M-Pesa till/paybill shortcodes are 5-7 digits. */
export function formatTill(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return /^\d{5,7}$/.test(digits) ? digits : null;
}

/** Daraja timestamp: YYYYMMDDHHmmss in Africa/Nairobi (UTC+3). */
export function darajaTimestamp(): string {
  const now = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    now.getUTCFullYear().toString() +
    pad(now.getUTCMonth() + 1) +
    pad(now.getUTCDate()) +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes()) +
    pad(now.getUTCSeconds())
  );
}

function accountRefFor(orderId: string) {
  return `TT-${orderId.slice(0, 8).toUpperCase()}`;
}

// ---------------------------------------------------------------------------
// Supabase REST (service role — bypasses RLS)
// ---------------------------------------------------------------------------

function adminHeaders(extra: Record<string, string> = {}) {
  const key = serviceKey();
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: adminHeaders((init.headers as Record<string, string>) ?? {}),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = data?.message ?? data?.error ?? `Supabase REST error ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  return rest<T>(`rpc/${fn}`, { method: "POST", body: JSON.stringify(body) });
}

const ORDER_FIELDS =
  "id,customer_id,vendor_id,product_id,quantity,total_amount_ksh,platform_fee_ksh," +
  "vendor_payout_ksh,payment_status,status,payout_status,payout_reference," +
  "mpesa_transaction_id,mpesa_receipt_number,paid_amount_ksh,payment_provider";

async function getOrder(orderId: string, select = ORDER_FIELDS): Promise<Order | null> {
  const rows = await rest<Order[]>(
    `orders?select=${encodeURIComponent(select)}&id=eq.${encodeURIComponent(orderId)}&limit=1`,
  );
  return rows[0] ?? null;
}

async function getOrderByTransaction(txId: string): Promise<Order | null> {
  const rows = await rest<Order[]>(
    `orders?select=${encodeURIComponent(ORDER_FIELDS)}&mpesa_transaction_id=eq.${encodeURIComponent(txId)}&limit=1`,
  );
  return rows[0] ?? null;
}

async function getOrderByPayoutReference(reference: string): Promise<Order | null> {
  const rows = await rest<Order[]>(
    `orders?select=${encodeURIComponent(ORDER_FIELDS)}&payout_reference=eq.${encodeURIComponent(reference)}&limit=1`,
  );
  return rows[0] ?? null;
}

async function patchOrder(orderId: string, patch: Record<string, unknown>) {
  await rest(`orders?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
  });
}

async function getVendor(vendorId: string): Promise<Vendor | null> {
  const rows = await rest<Vendor[]>(
    `vendor_profiles?select=id,user_id,business_name,phone,till_number&id=eq.${encodeURIComponent(vendorId)}&limit=1`,
  );
  return rows[0] ?? null;
}

async function isAdmin(userId: string) {
  const rows = await rest<Array<{ role: string }>>(
    `user_roles?select=role&user_id=eq.${encodeURIComponent(userId)}&role=eq.admin&limit=1`,
  );
  return rows.length > 0;
}

async function notify(userId: string, title: string, message: string, type: string, referenceId?: string) {
  try {
    await rest("notifications", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId, title, message, type, reference_id: referenceId ?? null }),
    });
  } catch (error) {
    console.warn("notification insert skipped", error);
  }
}

async function recordPaymentEvent(event: Record<string, unknown>) {
  try {
    await rest("order_payment_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.warn("order_payment_events insert skipped", error);
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function getUser(authHeader: string | null): Promise<User | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = anonKey();
  if (!key) throw new Error("Missing SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY");
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: key, Authorization: authHeader },
  });
  if (!res.ok) return null;
  return (await res.json()) as User;
}

async function requireUser(c: any): Promise<User> {
  const user = await getUser(c.req.header("authorization") ?? null);
  if (!user?.id) {
    throw new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}

// ---------------------------------------------------------------------------
// Provider resolution & amounts
// ---------------------------------------------------------------------------

function simulationEnabled() {
  return (
    isTrue(env("PAYMENT_SIMULATION_ENABLED")) ||
    env("PAYMENT_PROVIDER").toLowerCase() === "simulation"
  );
}

export function resolveProvider(): Provider {
  const configured = env("PAYMENT_PROVIDER").toLowerCase();
  if (["simulation", "simulator", "demo"].includes(configured)) return "simulation";
  if (["darajapay", "daraja_pay", "darajapay.app"].includes(configured)) return "darajapay";
  if (["kcb", "kcb_buni", "buni"].includes(configured)) return "kcb_buni";
  if (["safaricom", "daraja", "mpesa", "safaricom_daraja"].includes(configured)) return "safaricom_daraja";
  if (env("DARAJAPAY_TILL_NUMBER")) return "darajapay";
  if (env("KCB_BUNI_CONSUMER_KEY") && env("KCB_BUNI_CONSUMER_SECRET")) return "kcb_buni";
  if (env("MPESA_CONSUMER_KEY") && env("MPESA_CONSUMER_SECRET")) return "safaricom_daraja";
  if (simulationEnabled()) return "simulation";
  return "safaricom_daraja";
}

function resolvePayoutProvider(): PayoutProvider | null {
  const configured = env("PAYOUT_PROVIDER").toLowerCase();
  if (["simulation", "simulator", "demo"].includes(configured)) return "simulation";
  if (["kcb", "kcb_buni", "buni"].includes(configured)) return "kcb_buni";
  if (["safaricom", "daraja", "mpesa", "safaricom_b2c", "b2c"].includes(configured)) return "safaricom_b2c";
  if (env("KCB_BUNI_PAYOUT_URL")) return "kcb_buni";
  if (env("MPESA_INITIATOR_NAME") && env("MPESA_SECURITY_CREDENTIAL")) return "safaricom_b2c";
  if (isTrue(env("PAYOUT_SIMULATION_ENABLED")) || isTrue(env("PAYMENT_SANDBOX_MODE"))) return "simulation";
  return null;
}

/**
 * PAYMENT_TEST_AMOUNT_KSH lets sandbox runs charge KES 1 instead of the real total.
 * It is deliberately ignored unless PAYMENT_SANDBOX_MODE is on, so a stray value
 * can never under-charge a live customer.
 */
export function resolveChargeAmount(totalAmountKsh: number): number {
  const override = Number(env("PAYMENT_TEST_AMOUNT_KSH"));
  if (Number.isFinite(override) && override > 0) {
    if (isTrue(env("PAYMENT_SANDBOX_MODE"))) return Math.max(1, Math.ceil(override));
    console.warn(
      "[stkpush] PAYMENT_TEST_AMOUNT_KSH is set but PAYMENT_SANDBOX_MODE is off — charging the real order amount.",
    );
  }
  return Math.max(1, Math.ceil(totalAmountKsh));
}

/** Public base URL of this service, used to build gateway callback URLs. */
function selfUrl(): string {
  const explicit = env("PUBLIC_BASE_URL");
  if (explicit) return explicit.replace(/\/+$/, "");
  const domain = env("RAILWAY_PUBLIC_DOMAIN");
  return domain ? `https://${domain}` : "";
}

/**
 * Gateways POST to these URLs unauthenticated, so the shared secret rides in the
 * path. Without MPESA_CALLBACK_SECRET the bare path still works (needed for
 * sandbox), but production should always set one.
 */
function callbackPath(kind: "mpesa-callback" | "payout-result" | "payout-timeout") {
  const secret = env("MPESA_CALLBACK_SECRET");
  return secret ? `/${kind}/${encodeURIComponent(secret)}` : `/${kind}`;
}

function callbackUrl(kind: "mpesa-callback" | "payout-result" | "payout-timeout") {
  const override =
    kind === "mpesa-callback"
      ? env("MPESA_CALLBACK_URL") || env("KCB_BUNI_CALLBACK_URL")
      : kind === "payout-result"
        ? env("MPESA_B2C_RESULT_URL")
        : env("MPESA_B2C_TIMEOUT_URL");
  if (override) return override;
  const base = selfUrl();
  return base ? `${base}${callbackPath(kind)}` : "";
}

function callbackSecretOk(c: any): boolean {
  const expected = env("MPESA_CALLBACK_SECRET");
  if (!expected) return true;
  return c.req.param("secret") === expected;
}

// ---------------------------------------------------------------------------
// Gateway tokens
// ---------------------------------------------------------------------------

async function getDarajaToken(): Promise<string> {
  const key = env("MPESA_CONSUMER_KEY");
  const secret = env("MPESA_CONSUMER_SECRET");
  if (!key || !secret) throw new Error("Missing MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET");

  const baseUrl = cleanBaseUrl(env("MPESA_BASE_URL"), "https://sandbox.safaricom.co.ke");
  const auth = btoa(`${key}:${secret}`);
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await getJson(res);
  const token = firstString(data.access_token);
  if (!res.ok || !token) {
    throw new Error(
      firstString(data.errorMessage, data.error, data.message) ?? `Daraja OAuth failed (HTTP ${res.status})`,
    );
  }
  return token;
}

async function getKcbToken(): Promise<string> {
  const key = env("KCB_BUNI_CONSUMER_KEY") || env("KCB_CONSUMER_KEY");
  const secret = env("KCB_BUNI_CONSUMER_SECRET") || env("KCB_CONSUMER_SECRET");
  if (!key || !secret) throw new Error("Missing KCB_BUNI_CONSUMER_KEY / KCB_BUNI_CONSUMER_SECRET");

  const baseUrl = cleanBaseUrl(env("KCB_BUNI_BASE_URL"), "https://uat.buni.kcbgroup.com");
  const tokenUrl = env("KCB_BUNI_TOKEN_URL") || `${baseUrl}/oauth2/token`;
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${key}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await getJson(res);
  const token = firstString(data.access_token);
  if (!res.ok || !token) {
    throw new Error(
      firstString(data.error_description, data.error, data.message) ?? `KCB Buni OAuth failed (HTTP ${res.status})`,
    );
  }
  return token;
}

// ---------------------------------------------------------------------------
// STK Push — Response 1
// ---------------------------------------------------------------------------

async function requestDarajaStk(args: { orderId: string; phone: string; amountKsh: number }): Promise<StkResult> {
  const shortcode = env("MPESA_SHORTCODE");
  const passkey = env("MPESA_PASSKEY");
  const cb = callbackUrl("mpesa-callback");
  if (!shortcode || !passkey) {
    return { provider: "safaricom_daraja", success: false, error: "Missing MPESA_SHORTCODE / MPESA_PASSKEY" };
  }
  if (!cb) {
    return {
      provider: "safaricom_daraja",
      success: false,
      error: "No callback URL — set MPESA_CALLBACK_URL or PUBLIC_BASE_URL",
    };
  }

  const token = await getDarajaToken();
  const baseUrl = cleanBaseUrl(env("MPESA_BASE_URL"), "https://sandbox.safaricom.co.ke");
  const ts = darajaTimestamp();
  const ref = accountRefFor(args.orderId);

  const res = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: btoa(`${shortcode}${passkey}${ts}`),
      Timestamp: ts,
      TransactionType: env("MPESA_TRANSACTION_TYPE", "CustomerPayBillOnline"),
      Amount: args.amountKsh,
      PartyA: args.phone,
      PartyB: env("MPESA_TILL_NUMBER") || shortcode,
      PhoneNumber: args.phone,
      CallBackURL: cb,
      AccountReference: ref,
      TransactionDesc: `TechTrust escrow ${ref}`,
    }),
  });
  const data = await getJson(res);

  if (!res.ok || firstString(data.ResponseCode) !== "0") {
    return {
      provider: "safaricom_daraja",
      success: false,
      error:
        firstString(data.errorMessage, data.ResponseDescription, data.message) ??
        `STK push failed (HTTP ${res.status})`,
      details: data,
    };
  }

  const checkoutRequestId = firstString(data.CheckoutRequestID);
  if (!checkoutRequestId) {
    return {
      provider: "safaricom_daraja",
      success: false,
      error: "Daraja accepted the push but returned no CheckoutRequestID — payment cannot be tracked",
      details: data,
    };
  }

  return {
    provider: "safaricom_daraja",
    success: true,
    transactionId: checkoutRequestId,
    merchantRequestId: firstString(data.MerchantRequestID),
    customerMessage: firstString(data.CustomerMessage, data.ResponseDescription) ?? "STK Push sent",
    details: data,
  };
}

const DARAJAPAY_DEFAULT_BASE = "https://darajapay-api-production-65ba.up.railway.app";

function darajapayBaseUrl() {
  return cleanBaseUrl(env("DARAJAPAY_BASE_URL"), DARAJAPAY_DEFAULT_BASE);
}

/**
 * DarajaPay (darajapay.app) fronts Safaricom for us: it holds the consumer
 * key/secret, shortcode and passkey, so this service needs neither credentials
 * nor a public callback URL. The trade-off is that Response 2 only ever arrives
 * by polling `/widget/status` — see reconcileDarajaPayStk.
 */
async function requestDarajaPayStk(args: { orderId: string; phone: string; amountKsh: number }): Promise<StkResult> {
  const till = env("DARAJAPAY_TILL_NUMBER");
  if (!till) {
    return { provider: "darajapay", success: false, error: "Missing DARAJAPAY_TILL_NUMBER" };
  }

  const res = await fetch(`${darajapayBaseUrl()}/darajapay/stkpush`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Amount: String(args.amountKsh),
      Phonenumber: args.phone,
      TillNumber: till,
    }),
  });
  const data = await getJson(res);

  const checkoutRequestId = firstString(data.CheckoutRequestID, data.checkoutRequestId, data.id);
  if (!res.ok || !checkoutRequestId) {
    return {
      provider: "darajapay",
      success: false,
      error:
        firstString(data.error, data.message, data.ResponseDescription, data.errorMessage) ??
        `DarajaPay STK push failed (HTTP ${res.status})`,
      details: data,
    };
  }

  return {
    provider: "darajapay",
    success: true,
    transactionId: checkoutRequestId,
    merchantRequestId: firstString(data.MerchantRequestID),
    customerMessage:
      firstString(data.CustomerMessage, data.ResponseDescription) ?? "STK Push sent — enter your M-Pesa PIN",
    details: data,
  };
}

async function requestKcbBuniStk(args: { orderId: string; phone: string; amountKsh: number }): Promise<StkResult> {
  const cb = callbackUrl("mpesa-callback");
  if (!cb) {
    return {
      provider: "kcb_buni",
      success: false,
      error: "No callback URL — set KCB_BUNI_CALLBACK_URL or PUBLIC_BASE_URL",
    };
  }

  const token = await getKcbToken();
  const baseUrl = cleanBaseUrl(env("KCB_BUNI_BASE_URL"), "https://uat.buni.kcbgroup.com");
  const stkUrl = env("KCB_BUNI_STK_URL") || `${baseUrl}/mm/api/request/1.0.0/stkpush`;
  const ref = accountRefFor(args.orderId);

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
      invoiceNumber: env("KCB_BUNI_INVOICE_NUMBER") || env("KCB_BUNI_ACCOUNT_NUMBER") || ref,
      sharedShortCode: !isTrue(env("KCB_BUNI_DEDICATED_SHORTCODE")),
      orgShortCode: env("KCB_BUNI_ORG_SHORTCODE", "522522"),
      orgPassKey: env("KCB_BUNI_ORG_PASSKEY"),
      callbackUrl: cb,
      transactionDescription: `TechTrust escrow ${ref}`,
    }),
  });
  const data = await getJson(res);
  const response = data.response as Record<string, unknown> | undefined;
  const header = data.header as Record<string, unknown> | undefined;
  const code = firstString(header?.statusCode, response?.ResponseCode, data.ResponseCode, data.statusCode);

  if (!res.ok || code !== "0") {
    console.error("[stkpush] KCB rejected the push:", JSON.stringify(data));
    return {
      provider: "kcb_buni",
      success: false,
      error:
        firstString(
          header?.statusDescription,
          response?.ResponseDescription,
          response?.errorMessage,
          data.errorMessage,
          data.message,
        ) ?? `KCB Buni STK push failed (HTTP ${res.status})`,
      details: data,
    };
  }

  const checkoutRequestId = firstString(response?.CheckoutRequestID, data.CheckoutRequestID);
  if (!checkoutRequestId) {
    console.error("[stkpush] KCB response has no CheckoutRequestID:", JSON.stringify(data));
    return {
      provider: "kcb_buni",
      success: false,
      error: "KCB Buni returned no CheckoutRequestID — payment cannot be tracked",
      details: data,
    };
  }

  return {
    provider: "kcb_buni",
    success: true,
    transactionId: checkoutRequestId,
    merchantRequestId: firstString(response?.MerchantRequestID, data.MerchantRequestID),
    customerMessage:
      firstString(response?.CustomerMessage, response?.ResponseDescription, header?.statusDescription) ??
      "STK Push sent",
    details: data,
  };
}

// ---------------------------------------------------------------------------
// Settlement into Float
// ---------------------------------------------------------------------------

/**
 * Moves an order to `paid_float`. Safe to call twice — mark_order_paid returns
 * early unless payment_status is still 'pending', so duplicate gateway callbacks
 * cannot double-decrement stock or double-notify.
 */
async function settleIntoFloat(args: {
  order: Order;
  receipt: string;
  transactionId: string;
  amountKsh?: number;
  provider: string;
  payload?: unknown;
}) {
  const { order, receipt, transactionId, provider } = args;
  const amount = args.amountKsh ?? order.paid_amount_ksh ?? order.total_amount_ksh;

  await rpc("mark_order_paid", {
    _order_id: order.id,
    _receipt: receipt,
    _mpesa_tx: transactionId,
    _paid_amount_ksh: Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : null,
    _payment_provider: provider,
  });

  if (args.payload !== undefined) {
    await patchOrder(order.id, { payment_gateway_response: args.payload });
  }

  await recordPaymentEvent({
    order_id: order.id,
    event_type: "payment_confirmed",
    provider,
    amount_ksh: Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : null,
    reference: transactionId,
    payload: args.payload ?? { receipt },
  });
}

async function failPayment(order: Order, reason: string, provider: string, payload?: unknown) {
  await recordPaymentEvent({
    order_id: order.id,
    event_type: "payment_failed",
    provider,
    amount_ksh: null,
    reference: order.mpesa_transaction_id ?? null,
    payload: payload ?? { error: reason },
  });

  if (order.payment_status === "pending") {
    await patchOrder(order.id, {
      payment_status: "failed",
      status: "cancelled",
      payment_gateway_response: payload ?? { error: reason },
    });
  }
}

// ---------------------------------------------------------------------------
// Callback normalisation (Daraja STK, Daraja B2C result, KCB Buni)
// ---------------------------------------------------------------------------

function callbackItems(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") return [];
  const item = (value as Record<string, unknown>).Item;
  return Array.isArray(item) ? item.filter((i) => i && typeof i === "object") : [];
}

function resultParameters(value: unknown): Array<Record<string, unknown>> {
  if (!value || typeof value !== "object") return [];
  const item = (value as Record<string, unknown>).ResultParameter;
  return Array.isArray(item) ? item.filter((i) => i && typeof i === "object") : [];
}

function itemValue(items: Array<Record<string, unknown>>, ...names: string[]): unknown {
  const lower = names.map((n) => n.toLowerCase());
  return items.find((i) => lower.includes(String(i.Name ?? i.Key ?? "").toLowerCase()))?.Value;
}

export function normalizeCallback(payload: Record<string, unknown>): CallbackInfo {
  // Daraja STK callback: { Body: { stkCallback: { ... } } }
  const body = payload.Body as Record<string, unknown> | undefined;
  const stk = (body?.stkCallback ?? payload.stkCallback) as Record<string, unknown> | undefined;
  if (stk) {
    const items = callbackItems(stk.CallbackMetadata);
    return {
      kind: "payment",
      provider: "safaricom_daraja",
      resultCode: firstString(stk.ResultCode),
      resultDescription: firstString(stk.ResultDesc),
      transactionId: firstString(stk.CheckoutRequestID),
      merchantRequestId: firstString(stk.MerchantRequestID),
      receipt: firstString(itemValue(items, "MpesaReceiptNumber", "ReceiptNumber", "TransID")),
      amountKsh: toNumber(itemValue(items, "Amount", "TransactionAmount")),
    };
  }

  // Daraja B2C result: { Result: { ... } }
  const result = (payload.Result ?? payload.result) as Record<string, unknown> | undefined;
  if (result) {
    const params = resultParameters(result.ResultParameters);
    return {
      kind: "payout",
      provider: "safaricom_b2c",
      resultCode: firstString(result.ResultCode),
      resultDescription: firstString(result.ResultDesc),
      transactionId: firstString(result.OriginatorConversationID, result.ConversationID, result.TransactionID),
      merchantRequestId: firstString(result.ConversationID),
      receipt: firstString(result.TransactionID, itemValue(params, "TransactionReceipt", "ReceiptNo")),
      amountKsh: toNumber(itemValue(params, "TransactionAmount", "Amount")),
    };
  }

  // KCB Buni — nested { response, header }
  const nestedResponse = payload.response as Record<string, unknown> | undefined;
  const nestedHeader = payload.header as Record<string, unknown> | undefined;
  const rootResultCode = firstString(
    payload.ResultCode,
    payload.resultCode,
    nestedResponse?.ResultCode,
    nestedResponse?.ResponseCode,
    nestedHeader?.statusCode,
  );
  const checkout = firstString(
    payload.CheckoutRequestID,
    payload.checkoutRequestId,
    nestedResponse?.CheckoutRequestID,
    payload.MerchantRequestID,
    nestedResponse?.MerchantRequestID,
  );
  if (rootResultCode || checkout) {
    return {
      kind: "payment",
      provider: "kcb_buni",
      resultCode: rootResultCode,
      resultDescription: firstString(
        payload.ResultDesc,
        payload.resultDescription,
        nestedResponse?.ResponseDescription,
        nestedHeader?.statusDescription,
      ),
      transactionId: checkout,
      merchantRequestId: firstString(payload.MerchantRequestID, nestedResponse?.MerchantRequestID),
      receipt: firstString(payload.MpesaReceiptNumber, payload.ReceiptNumber, payload.TransID),
      amountKsh: toNumber(payload.Amount ?? payload.amount),
    };
  }

  // KCB Buni — flat payload
  const flatCode = firstString(payload.statusCode, payload.status, payload.code);
  const flatTxId = firstString(payload.transactionId, payload.transactionReference, payload.referenceId);
  if (flatCode || flatTxId) {
    return {
      kind: "payment",
      provider: "kcb_buni",
      resultCode: flatCode === "success" || flatCode === "200" ? "0" : flatCode,
      resultDescription: firstString(payload.statusDescription, payload.description, payload.message),
      transactionId: flatTxId,
      merchantRequestId: firstString(payload.merchantRequestId),
      receipt: firstString(payload.receiptNumber, payload.receipt),
      amountKsh: toNumber(payload.amount ?? payload.Amount),
    };
  }

  return { kind: "unknown" };
}

async function handlePaymentCallback(info: CallbackInfo, payload: Record<string, unknown>) {
  const lookupId = info.transactionId ?? info.merchantRequestId;
  if (!lookupId) {
    console.warn("[callback] payment callback has no transaction id", JSON.stringify(payload).slice(0, 500));
    return;
  }

  const order = await getOrderByTransaction(lookupId);
  if (!order) {
    console.warn("[callback] no order matches transaction", lookupId);
    return;
  }

  if (order.payment_status === "paid_float" || order.payment_status === "released") {
    console.log(`[callback] order ${order.id} already settled — ignoring duplicate`);
    return;
  }

  if (String(info.resultCode ?? "") === "0") {
    await settleIntoFloat({
      order,
      receipt: info.receipt ?? lookupId,
      transactionId: lookupId,
      amountKsh: info.amountKsh,
      provider: info.provider ?? "mobile_money",
      payload,
    });
    return;
  }

  await failPayment(order, info.resultDescription ?? "Payment failed", info.provider ?? "mobile_money", payload);
}

async function handlePayoutCallback(info: CallbackInfo, payload: Record<string, unknown>) {
  const candidates = [info.transactionId, info.merchantRequestId, info.receipt].filter(Boolean) as string[];
  let order: Order | null = null;
  for (const candidate of candidates) {
    order = await getOrderByPayoutReference(candidate);
    if (order) break;
  }
  if (!order) {
    console.warn("[callback] no order matches payout reference", JSON.stringify(candidates));
    return;
  }

  const success = String(info.resultCode ?? "") === "0";
  const amount = info.amountKsh ?? order.vendor_payout_ksh ?? null;

  await recordPaymentEvent({
    order_id: order.id,
    event_type: success ? "payout_confirmed" : "payout_failed",
    provider: info.provider ?? "mobile_money",
    amount_ksh: amount,
    reference: info.receipt ?? info.transactionId ?? null,
    payload,
  });

  if (success) {
    await patchOrder(order.id, {
      status: "confirmed",
      payment_status: "released",
      payout_status: "sent",
      payout_reference: info.receipt ?? info.transactionId ?? order.payout_reference,
      payout_gateway_response: payload,
      payout_error: null,
      float_released_at: new Date().toISOString(),
    });
    const vendor = await getVendor(order.vendor_id);
    if (vendor?.user_id) {
      await notify(
        vendor.user_id,
        "Float released to your mobile money",
        `Payment of KES ${Number(amount ?? 0).toLocaleString()} has been sent. Reference: ${
          info.receipt ?? info.transactionId ?? "n/a"
        }.`,
        "payment",
        order.id,
      );
    }
    return;
  }

  await patchOrder(order.id, {
    payout_status: "failed",
    payout_error: info.resultDescription ?? "Payout failed",
    payout_gateway_response: payload,
  });
}

// ---------------------------------------------------------------------------
// Reconciliation — Daraja STK Push Query
// ---------------------------------------------------------------------------

/**
 * Callbacks get lost: a misconfigured URL, a cold container, a network blip.
 * When the client polls and the order is still pending, ask Daraja directly
 * what happened so escrow can settle without the callback. This is what stops a
 * customer who has already been debited from being stuck on "pending" forever.
 */
async function reconcileDarajaStk(order: Order): Promise<"paid" | "failed" | "pending"> {
  const checkoutId = order.mpesa_transaction_id;
  const shortcode = env("MPESA_SHORTCODE");
  const passkey = env("MPESA_PASSKEY");
  if (!checkoutId || !shortcode || !passkey) return "pending";
  if (!env("MPESA_CONSUMER_KEY") || !env("MPESA_CONSUMER_SECRET")) return "pending";

  try {
    const token = await getDarajaToken();
    const baseUrl = cleanBaseUrl(env("MPESA_BASE_URL"), "https://sandbox.safaricom.co.ke");
    const ts = darajaTimestamp();
    const res = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: btoa(`${shortcode}${passkey}${ts}`),
        Timestamp: ts,
        CheckoutRequestID: checkoutId,
      }),
    });
    const data = await getJson(res);
    const code = firstString(data.ResultCode);

    // 500.001.1001 = "transaction is being processed" — still genuinely pending.
    if (!res.ok || code === undefined) return "pending";

    if (code === "0") {
      await settleIntoFloat({
        order,
        receipt: firstString(data.MpesaReceiptNumber) ?? checkoutId,
        transactionId: checkoutId,
        provider: "safaricom_daraja",
        payload: { reconciled: true, ...data },
      });
      return "paid";
    }

    // 1032 = cancelled by user, 1037 = timeout, 1 = insufficient funds, 2001 = wrong PIN.
    if (["1", "1032", "1037", "2001", "1019", "1001"].includes(code)) {
      await failPayment(
        order,
        firstString(data.ResultDesc) ?? "Payment was not completed",
        "safaricom_daraja",
        { reconciled: true, ...data },
      );
      return "failed";
    }
    return "pending";
  } catch (error) {
    console.warn("[reconcile] STK query failed", error);
    return "pending";
  }
}

/**
 * Response 2 for DarajaPay. Unlike Daraja this is not a fallback — no callback
 * ever lands, so /payment-status polling this endpoint is the only way an order
 * leaves `pending`.
 *
 * Caveat: `/widget/status` answers `{"status":"pending"}` for an unknown or
 * expired CheckoutRequestID exactly as it does for a live prompt still awaiting
 * a PIN, so a lost push is indistinguishable from a slow one and the order stays
 * pending rather than being auto-failed. Only "failed" (or an explicit failure
 * ResultCode) is treated as terminal.
 */
async function reconcileDarajaPayStk(order: Order): Promise<"paid" | "failed" | "pending"> {
  const checkoutId = order.mpesa_transaction_id;
  if (!checkoutId) return "pending";

  try {
    const res = await fetch(`${darajapayBaseUrl()}/widget/status?id=${encodeURIComponent(checkoutId)}`);
    const data = await getJson(res);
    if (!res.ok) return "pending";

    const status = firstString(data.status, data.state, data.paymentStatus)?.toLowerCase();

    if (status === "paid" || status === "success" || status === "completed") {
      await settleIntoFloat({
        order,
        receipt: firstString(data.receipt, data.MpesaReceiptNumber, data.mpesaReceiptNumber) ?? checkoutId,
        transactionId: checkoutId,
        provider: "darajapay",
        payload: { reconciled: true, ...data },
      });
      return "paid";
    }

    if (status === "failed" || status === "cancelled" || status === "canceled") {
      await failPayment(
        order,
        firstString(data.message, data.ResultDesc, data.error) ?? "Payment was not completed",
        "darajapay",
        { reconciled: true, ...data },
      );
      return "failed";
    }

    return "pending";
  } catch (error) {
    console.warn("[reconcile] DarajaPay status query failed", error);
    return "pending";
  }
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

async function sendDarajaB2c(args: { orderId: string; amountKsh: number; vendorPhone: string }): Promise<PayoutResult> {
  const initiator = env("MPESA_INITIATOR_NAME");
  const credential = env("MPESA_SECURITY_CREDENTIAL");
  const shortcode = env("MPESA_B2C_SHORTCODE") || env("MPESA_SHORTCODE");
  const resultUrl = callbackUrl("payout-result");
  const timeoutUrl = callbackUrl("payout-timeout");
  if (!initiator || !credential || !shortcode || !resultUrl || !timeoutUrl) {
    throw new Error("M-Pesa B2C is not fully configured (initiator, security credential, shortcode, result URL)");
  }

  const token = await getDarajaToken();
  const baseUrl = cleanBaseUrl(env("MPESA_BASE_URL"), "https://sandbox.safaricom.co.ke");
  const res = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      InitiatorName: initiator,
      SecurityCredential: credential,
      CommandID: env("MPESA_B2C_COMMAND_ID", "BusinessPayment"),
      Amount: Math.round(args.amountKsh),
      PartyA: shortcode,
      PartyB: args.vendorPhone,
      Remarks: `TechTrust order ${accountRefFor(args.orderId)}`,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: resultUrl,
      Occasion: "TechTrustPayout",
    }),
  });
  const data = await getJson(res);
  if (!res.ok || firstString(data.ResponseCode) !== "0") {
    throw new Error(
      firstString(data.errorMessage, data.ResponseDescription, data.message) ?? `B2C payout failed (HTTP ${res.status})`,
    );
  }

  return {
    provider: "safaricom_b2c",
    accepted: true,
    final: false, // settles via the /payout-result callback
    reference: firstString(data.OriginatorConversationID, data.ConversationID),
    message: firstString(data.ResponseDescription) ?? "Payout accepted by M-Pesa",
    details: data,
  };
}

/**
 * Pays a vendor's M-Pesa till directly (Daraja B2B "Buy Goods"), used instead
 * of sendDarajaB2c whenever the vendor has a till_number on file. Separate
 * from B2C: different endpoint, different party identifiers, and Safaricom
 * issues B2B access as its own product — MPESA_B2B_* credentials are not
 * assumed to exist just because B2C ones do. Falls back to sendDarajaB2c in
 * sendPayout() when B2B isn't configured, so nothing changes for existing
 * vendors until those credentials land.
 */
/** Same initiator/credential normally cover every Daraja product on a shortcode, but B2B is its own activation — check separately in case Safaricom issues distinct ones. */
function b2bConfigured(): boolean {
  return Boolean(
    (env("MPESA_B2B_INITIATOR_NAME") || env("MPESA_INITIATOR_NAME")) &&
      (env("MPESA_B2B_SECURITY_CREDENTIAL") || env("MPESA_SECURITY_CREDENTIAL")) &&
      (env("MPESA_B2B_SHORTCODE") || env("MPESA_B2C_SHORTCODE") || env("MPESA_SHORTCODE")),
  );
}

async function sendDarajaB2bTillPayout(args: { orderId: string; amountKsh: number; tillNumber: string }): Promise<PayoutResult> {
  const initiator = env("MPESA_B2B_INITIATOR_NAME") || env("MPESA_INITIATOR_NAME");
  const credential = env("MPESA_B2B_SECURITY_CREDENTIAL") || env("MPESA_SECURITY_CREDENTIAL");
  const shortcode = env("MPESA_B2B_SHORTCODE") || env("MPESA_B2C_SHORTCODE") || env("MPESA_SHORTCODE");
  const resultUrl = callbackUrl("payout-result");
  const timeoutUrl = callbackUrl("payout-timeout");
  if (!initiator || !credential || !shortcode) {
    throw new Error("M-Pesa B2B till payout is not fully configured (initiator, security credential, shortcode)");
  }

  const token = await getDarajaToken();
  const baseUrl = cleanBaseUrl(env("MPESA_BASE_URL"), "https://sandbox.safaricom.co.ke");
  const res = await fetch(`${baseUrl}/mpesa/b2b/v1/paymentrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      Initiator: initiator,
      SecurityCredential: credential,
      CommandID: env("MPESA_B2B_COMMAND_ID", "BusinessBuyGoods"),
      SenderIdentifierType: "4",
      RecieverIdentifierType: "4",
      Amount: Math.round(args.amountKsh),
      PartyA: shortcode,
      PartyB: args.tillNumber,
      AccountReference: accountRefFor(args.orderId),
      Remarks: `TechTrust order ${accountRefFor(args.orderId)}`,
      QueueTimeOutURL: timeoutUrl,
      ResultURL: resultUrl,
    }),
  });
  const data = await getJson(res);
  if (!res.ok || firstString(data.ResponseCode) !== "0") {
    throw new Error(
      firstString(data.errorMessage, data.ResponseDescription, data.message) ?? `B2B till payout failed (HTTP ${res.status})`,
    );
  }

  return {
    provider: "safaricom_b2c",
    accepted: true,
    final: false, // settles via the /payout-result callback
    reference: firstString(data.OriginatorConversationID, data.ConversationID),
    message: firstString(data.ResponseDescription) ?? "Till payout accepted by M-Pesa",
    details: { ...data, payoutDestination: "till", tillNumber: args.tillNumber },
  };
}

async function sendKcbBuniPayout(args: {
  orderId: string;
  amountKsh: number;
  vendorPhone: string;
  vendorName?: string;
}): Promise<PayoutResult> {
  const payoutUrl = env("KCB_BUNI_PAYOUT_URL");
  if (!payoutUrl) throw new Error("Missing KCB_BUNI_PAYOUT_URL");

  const token = await getKcbToken();
  const reference = `TT-REL-${args.orderId.slice(0, 8).toUpperCase()}`;
  const body = {
    transactionReference: reference,
    sourceAccount: env("KCB_BUNI_SOURCE_ACCOUNT"),
    phoneNumber: args.vendorPhone,
    amount: String(args.amountKsh),
    currency: "KES",
    description: `TechTrust escrow release ${reference}`,
    callbackUrl: env("KCB_BUNI_PAYOUT_CALLBACK_URL") || callbackUrl("payout-result"),
  };

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
  const code = firstString(header?.statusCode, response?.ResponseCode, data.ResponseCode, data.statusCode, data.code);

  if (!res.ok || !["0", "00", "000"].includes(String(code ?? ""))) {
    console.error("[payout] KCB rejected the payout:", JSON.stringify(data));
    throw new Error(
      firstString(header?.statusDescription, response?.ResponseDescription, data.errorMessage, data.message) ??
        `KCB Buni payout failed (HTTP ${res.status})`,
    );
  }

  return {
    provider: "kcb_buni",
    accepted: true,
    final: isTrue(env("KCB_BUNI_PAYOUT_IS_FINAL")),
    reference: firstString(
      response?.ConversationID,
      response?.OriginatorConversationID,
      response?.TransactionID,
      data.ConversationID,
      reference,
    ),
    receipt: firstString(response?.TransactionID, data.TransactionID),
    message: firstString(header?.statusDescription, response?.ResponseDescription) ?? "Payout accepted",
    details: data,
  };
}

async function sendPayout(args: {
  orderId: string;
  amountKsh: number;
  vendorPhone: string;
  vendorTillNumber?: string | null;
  vendorName?: string;
  provider: PayoutProvider;
}): Promise<PayoutResult> {
  if (args.provider === "simulation") {
    if (!isTrue(env("PAYOUT_SIMULATION_ENABLED")) && !isTrue(env("PAYMENT_SANDBOX_MODE"))) {
      throw new Error("Simulation payout requested but PAYOUT_SIMULATION_ENABLED is not set");
    }
    const receipt = `SIM-REL-${Date.now().toString(36).toUpperCase()}`;
    return {
      provider: "simulation",
      accepted: true,
      final: true,
      reference: receipt,
      receipt,
      message: args.vendorTillNumber
        ? "Sandbox payout completed (would have gone to vendor till)"
        : "Sandbox payout completed",
      details: { simulated: true },
    };
  }
  if (args.provider === "kcb_buni") return sendKcbBuniPayout(args);
  if (args.vendorTillNumber && b2bConfigured()) {
    return sendDarajaB2bTillPayout({ orderId: args.orderId, amountKsh: args.amountKsh, tillNumber: args.vendorTillNumber });
  }
  return sendDarajaB2c(args);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = env("ALLOWED_ORIGINS")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      if (!allowed.length) return origin ?? "*";
      return allowed.includes(origin ?? "") ? origin : allowed[0];
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["authorization", "x-client-info", "apikey", "content-type"],
  }),
);

app.get("/", (c) =>
  c.json({
    ok: true,
    service: "techtrust-escrow-api",
    paymentProvider: resolveProvider(),
    payoutProvider: resolvePayoutProvider(),
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

/**
 * Deployment self-check: shows what is configured without leaking any values.
 * This endpoint is public, so the callback secret is masked — the full URL to
 * register with the gateway comes from `railway variables`, not from here.
 */
app.get("/config-check", (c) => {
  const has = (name: string) => Boolean(env(name));
  const secret = env("MPESA_CALLBACK_SECRET");
  const shownCallback = callbackUrl("mpesa-callback");
  return c.json({
    ok: true,
    paymentProvider: resolveProvider(),
    payoutProvider: resolvePayoutProvider(),
    sandboxMode: isTrue(env("PAYMENT_SANDBOX_MODE")),
    callbackUrl: shownCallback
      ? secret
        ? shownCallback.replace(encodeURIComponent(secret), "<secret>")
        : shownCallback
      : null,
    callbackSecretSet: has("MPESA_CALLBACK_SECRET"),
    supabase: {
      url: has("SUPABASE_URL"),
      anonKey: has("SUPABASE_PUBLISHABLE_KEY") || has("SUPABASE_ANON_KEY"),
      serviceRoleKey: has("SUPABASE_SERVICE_ROLE_KEY"),
    },
    daraja: {
      consumerKey: has("MPESA_CONSUMER_KEY"),
      consumerSecret: has("MPESA_CONSUMER_SECRET"),
      shortcode: has("MPESA_SHORTCODE"),
      passkey: has("MPESA_PASSKEY"),
      b2cInitiator: has("MPESA_INITIATOR_NAME"),
      b2cSecurityCredential: has("MPESA_SECURITY_CREDENTIAL"),
    },
    kcbBuni: {
      consumerKey: has("KCB_BUNI_CONSUMER_KEY"),
      consumerSecret: has("KCB_BUNI_CONSUMER_SECRET"),
      payoutUrl: has("KCB_BUNI_PAYOUT_URL"),
    },
    darajapay: {
      baseUrl: darajapayBaseUrl(),
      tillNumber: has("DARAJAPAY_TILL_NUMBER"),
    },
  });
});

app.post("/mpesa-stkpush", async (c) => {
  try {
    const user = await getUser(c.req.header("authorization") ?? null);
    const { order_id, phone, amountKsh, amount_ksh, amount } = await readBody(c);
    if (!phone) return json({ success: false, error: "phone is required" }, 400);

    const phoneFmt = formatPhone(String(phone));
    if (!phoneFmt) return json({ success: false, error: "Enter a valid Kenyan number (07XXXXXXXX or 2547XXXXXXXX)" }, 400);

    let order = order_id ? await getOrder(String(order_id)) : null;
    if (!order) {
      order = {
        id: String(order_id || `order-${Date.now()}`),
        customer_id: user?.id || "guest-user",
        vendor_id: "vendor-1",
        total_amount_ksh: Number(amountKsh || amount_ksh || amount || 1),
        payment_status: "pending",
        status: "pending",
      };
    } else if (user?.id && order.customer_id !== user.id && !(await isAdmin(user.id))) {
      return json({ success: false, error: "Forbidden" }, 403);
    }

    const provider = resolveProvider();
    const chargeAmount = resolveChargeAmount(Number(order.total_amount_ksh));
    console.log(`[stkpush] provider=${provider} order=${order.id} phone=${maskPhone(phoneFmt)} amount=${chargeAmount}`);

    // Sandbox short-circuit: settle immediately so the whole escrow flow is testable
    // without a live gateway. Guarded by PAYMENT_SIMULATION_ENABLED.
    if (provider === "simulation") {
      const tx = `SIM-${order.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      await patchOrder(order.id, { mpesa_transaction_id: tx });
      await settleIntoFloat({
        order,
        receipt: `SIM${Date.now().toString().slice(-8)}`,
        transactionId: tx,
        amountKsh,
        provider: "simulation",
        payload: { simulated: true },
      });
      return json({
        success: true,
        provider: "simulation",
        amountKsh,
        CheckoutRequestID: tx,
        MerchantRequestID: tx,
        CustomerMessage: "Sandbox payment confirmed and held in TechTrust Float",
      });
    }

    const result =
      provider === "darajapay"
        ? await requestDarajaPayStk({ orderId: order.id, phone: phoneFmt, amountKsh: chargeAmount })
        : provider === "kcb_buni"
          ? await requestKcbBuniStk({ orderId: order.id, phone: phoneFmt, amountKsh: chargeAmount })
          : await requestDarajaStk({ orderId: order.id, phone: phoneFmt, amountKsh: chargeAmount });

    if (!result.success) {
      await recordPaymentEvent({
        order_id: order.id,
        event_type: "payment_initiation_failed",
        provider: result.provider,
        amount_ksh: amountKsh,
        payload: result.details ?? { error: result.error },
      });
      return json({ success: false, error: result.error, provider: result.provider, details: result.details }, 502);
    }

    // The CheckoutRequestID is the only link between Response 1 and Response 2 —
    // persist it before returning, or the callback can never find this order.
    await patchOrder(order.id, {
      mpesa_transaction_id: result.transactionId,
      payment_provider: result.provider,
      paid_amount_ksh: amountKsh,
      payment_gateway_response: result.details,
    });

    await recordPaymentEvent({
      order_id: order.id,
      event_type: "payment_initiated",
      provider: result.provider,
      amount_ksh: amountKsh,
      reference: result.transactionId,
      payload: result.details,
    });

    return json({
      success: true,
      provider: result.provider,
      amountKsh,
      CheckoutRequestID: result.transactionId,
      MerchantRequestID: result.merchantRequestId,
      CustomerMessage: result.customerMessage,
      // Reminder for any integrator reading this response: keep polling.
      status: "pending",
      note: "STK Push sent. This is not proof of payment — poll GET /payment-status until status is no longer 'pending'.",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[stkpush] error", error);
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

/**
 * Step 2 — Response 2. Poll until `status` is no longer "pending".
 * Falls back to a live gateway query when the callback has not landed yet.
 */
app.get("/payment-status", async (c) => {
  try {
    const user = await requireUser(c);
    const orderId = c.req.query("order_id") ?? c.req.query("id");
    const checkoutId = c.req.query("checkout_id");
    if (!orderId && !checkoutId) return json({ success: false, error: "order_id or checkout_id is required" }, 400);

    const order = orderId ? await getOrder(orderId) : await getOrderByTransaction(String(checkoutId));
    if (!order) return json({ success: false, error: "Order not found" }, 404);
    if (order.customer_id !== user.id && !(await isAdmin(user.id))) {
      return json({ success: false, error: "Forbidden" }, 403);
    }

    const settled = ["paid_float", "released"].includes(order.payment_status);
    let status: "pending" | "paid" | "failed" = settled
      ? "paid"
      : order.payment_status === "failed"
        ? "failed"
        : "pending";

    let current = order;
    if (status === "pending") {
      const reconciled =
        order.payment_provider === "darajapay"
          ? await reconcileDarajaPayStk(order)
          : order.payment_provider === "safaricom_daraja"
            ? await reconcileDarajaStk(order)
            : "pending";
      if (reconciled !== "pending") {
        status = reconciled;
        current = (await getOrder(order.id)) ?? order;
      }
    }

    return json({
      success: true,
      status,
      orderId: current.id,
      checkoutRequestId: current.mpesa_transaction_id ?? null,
      receipt: current.mpesa_receipt_number ?? null,
      amountKsh: current.paid_amount_ksh ?? current.total_amount_ksh,
      paymentStatus: current.payment_status,
      orderStatus: current.status,
      heldInFloat: current.payment_status === "paid_float",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[payment-status] error", error);
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

/** Public gateway callback — this is what actually moves money into Float. */
async function callbackHandler(c: any) {
  if (!callbackSecretOk(c)) {
    console.warn("[callback] rejected: bad or missing secret");
    return json({ ok: false }, 403);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await readBody(c);
    console.log("[callback]", JSON.stringify(payload).slice(0, 800));
  } catch {
    console.warn("[callback] unreadable body");
  }

  try {
    const info = normalizeCallback(payload);
    if (info.kind === "payment") await handlePaymentCallback(info, payload);
    else if (info.kind === "payout") await handlePayoutCallback(info, payload);
    else console.warn("[callback] unrecognised shape", JSON.stringify(payload).slice(0, 500));
  } catch (error) {
    console.error("[callback] processing error", error);
  }

  // Always ACK: a non-200 makes Safaricom retry the same callback for hours.
  return json({ ResultCode: 0, ResultDesc: "Accepted" });
}

app.post("/mpesa-callback", callbackHandler);
app.post("/mpesa-callback/:secret", callbackHandler);

/** B2C result/timeout URLs. Safaricom requires both to be reachable. */
async function payoutResultHandler(c: any) {
  if (!callbackSecretOk(c)) return json({ ok: false }, 403);
  const payload = await readBody(c);
  console.log("[payout-result]", JSON.stringify(payload).slice(0, 800));
  try {
    const info = normalizeCallback(payload);
    if (info.kind === "payout") await handlePayoutCallback(info, payload);
    else if (info.kind === "payment") await handlePaymentCallback(info, payload);
  } catch (error) {
    console.error("[payout-result] processing error", error);
  }
  return json({ ResultCode: 0, ResultDesc: "Accepted" });
}

app.post("/payout-result", payoutResultHandler);
app.post("/payout-result/:secret", payoutResultHandler);

async function payoutTimeoutHandler(c: any) {
  if (!callbackSecretOk(c)) return json({ ok: false }, 403);
  const payload = await readBody(c);
  console.warn("[payout-timeout]", JSON.stringify(payload).slice(0, 800));
  return json({ ResultCode: 0, ResultDesc: "Accepted" });
}

app.post("/payout-timeout", payoutTimeoutHandler);
app.post("/payout-timeout/:secret", payoutTimeoutHandler);

/** Step 3 — customer confirms delivery, Float is released to the vendor. */
app.post("/release-float-payment", async (c) => {
  try {
    const user = await requireUser(c);
    const { orderId } = await readBody(c);
    if (!orderId) return json({ success: false, error: "orderId is required" }, 400);

    const order = await getOrder(String(orderId));
    if (!order) return json({ success: false, error: "Order not found" }, 404);

    const admin = await isAdmin(user.id);
    if (order.customer_id !== user.id && !admin) return json({ success: false, error: "Forbidden" }, 403);
    if (order.payment_status !== "paid_float") {
      return json({ success: false, error: "This payment is not held in Float" }, 409);
    }
    if (!["delivered_awaiting_confirmation", "confirmed", "payment_held"].includes(order.status) && !admin) {
      return json({ success: false, error: "Order is not awaiting your confirmation yet" }, 409);
    }
    if (["pending", "sent"].includes(String(order.payout_status ?? ""))) {
      return json({ success: true, message: "Payout has already been requested", payoutPending: true }, 200);
    }

    const vendor = await getVendor(order.vendor_id);
    const vendorPhone = formatPhone(vendor?.phone ?? "");
    const vendorTillNumber = formatTill(vendor?.till_number);
    const canPayToTill = Boolean(vendorTillNumber) && b2bConfigured();
    if (!vendorPhone && !canPayToTill) {
      return json({ success: false, error: "Vendor payout phone is missing or invalid" }, 409);
    }

    const payoutAmount = Number(
      order.vendor_payout_ksh ?? Number(order.total_amount_ksh) - Number(order.platform_fee_ksh ?? 0),
    );
    if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) {
      return json({ success: false, error: "Vendor payout amount could not be determined" }, 409);
    }

    const provider = resolvePayoutProvider();
    if (!provider) {
      return json(
        { success: false, error: "No payout provider is configured. Set PAYOUT_PROVIDER and its credentials." },
        503,
      );
    }

    // Claim the payout before calling the gateway so a double-click cannot pay twice.
    await patchOrder(order.id, { payout_status: "pending", payout_provider: provider, payout_error: null });

    let result: PayoutResult;
    try {
      result = await sendPayout({
        orderId: order.id,
        amountKsh: payoutAmount,
        vendorPhone: vendorPhone ?? "",
        vendorTillNumber,
        vendorName: vendor?.business_name ?? undefined,
        provider,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await patchOrder(order.id, { payout_status: "failed", payout_error: message });
      await recordPaymentEvent({
        order_id: order.id,
        event_type: "payout_failed",
        provider,
        amount_ksh: payoutAmount,
        payload: { error: message },
      });
      return json({ success: false, error: message }, 502);
    }

    const now = new Date().toISOString();

    if (result.final) {
      await patchOrder(order.id, {
        status: "confirmed",
        payment_status: "released",
        payout_status: "sent",
        payout_provider: result.provider,
        payout_reference: result.reference ?? result.receipt ?? null,
        payout_gateway_response: result.details,
        payout_error: null,
        float_released_at: now,
      });
      await recordPaymentEvent({
        order_id: order.id,
        event_type: "payout_confirmed",
        provider: result.provider,
        amount_ksh: payoutAmount,
        reference: result.reference ?? result.receipt ?? null,
        payload: result.details,
      });
      if (vendor?.user_id) {
        const destination = canPayToTill && vendorTillNumber
          ? `your till ending ${vendorTillNumber.slice(-4)}`
          : `your number ending ${(vendorPhone ?? "").slice(-4)}`;
        await notify(
          vendor.user_id,
          "Float released to your mobile money",
          `Payment of KES ${payoutAmount.toLocaleString()} has been sent to ${destination}. Reference: ${
            result.reference ?? result.receipt
          }.`,
          "payment",
          order.id,
        );
      }
      await rpc("grant_referral_reward", { p_order_id: order.id }).catch((e) =>
        console.warn("[grant_referral_reward]", e),
      );
      return json({
        success: true,
        payoutPending: false,
        payoutProvider: result.provider,
        payoutReference: result.reference ?? result.receipt,
        message: result.message ?? "Payout completed",
      });
    }

    // Accepted but not settled — the gateway will confirm via /payout-result.
    await patchOrder(order.id, {
      payout_status: "sent",
      payout_provider: result.provider,
      payout_reference: result.reference ?? null,
      payout_gateway_response: result.details,
      status: "confirmed",
    });
    await rpc("grant_referral_reward", { p_order_id: order.id }).catch((e) =>
      console.warn("[grant_referral_reward]", e),
    );
    await recordPaymentEvent({
      order_id: order.id,
      event_type: "payout_initiated",
      provider: result.provider,
      amount_ksh: payoutAmount,
      reference: result.reference ?? null,
      payload: result.details,
    });

    return json({
      success: true,
      payoutPending: true,
      payoutProvider: result.provider,
      payoutReference: result.reference,
      message: result.message ?? "Payout sent to the gateway. Funds are released once the gateway confirms.",
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[release-float-payment] error", error);
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

/** Sandbox-only helper the UI uses to walk the escrow flow without a gateway. */
app.post("/simulate-payment", async (c) => {
  try {
    if (!simulationEnabled() && !isTrue(env("PAYMENT_SANDBOX_MODE"))) {
      return json({ success: false, error: "Payment simulation is disabled" }, 403);
    }
    const user = await requireUser(c);
    const { order_id } = await readBody(c);
    if (!order_id) return json({ success: false, error: "order_id is required" }, 400);

    const order = await getOrder(String(order_id));
    if (!order) return json({ success: false, error: "Order not found" }, 404);
    if (order.customer_id !== user.id) return json({ success: false, error: "Forbidden" }, 403);
    if (order.payment_status !== "pending") return json({ success: false, error: "Order already processed" }, 409);

    const amountKsh = resolveChargeAmount(Number(order.total_amount_ksh));
    const tx = `SIM-${order.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const receipt = `SIM${Date.now().toString().slice(-8)}`;
    await patchOrder(order.id, { mpesa_transaction_id: tx });
    await settleIntoFloat({
      order,
      receipt,
      transactionId: tx,
      amountKsh,
      provider: "simulation",
      payload: { simulated: true },
    });

    return json({ success: true, receipt, amountKsh, status: "paid" });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post("/create-vendor-profile", async (c) => {
  try {
    const user = await requireUser(c);
    const payload = await readBody(c);
    if (!payload.userId) return json({ success: false, error: "userId is required" }, 400);
    if (payload.userId !== user.id && !(await isAdmin(user.id))) {
      return json({ success: false, error: "Forbidden" }, 403);
    }

    await rest("vendor_profiles", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: payload.userId,
        business_name: payload.businessName,
        owner_name: payload.ownerName,
        phone: payload.phone,
        email: payload.email,
        city: payload.county ?? payload.city ?? null,
        county: payload.county ?? null,
        sub_county: payload.subCounty ?? null,
        physical_address: payload.physicalAddress,
        gps_latitude: payload.gpsLatitude,
        gps_longitude: payload.gpsLongitude,
        latitude: payload.gpsLatitude,
        longitude: payload.gpsLongitude,
        google_maps_link: payload.googleMapsLink || null,
        shop_photo_urls: payload.shopPhotoUrls || [],
        business_certificate_url: payload.businessCertificateUrl || null,
        verification_status: "pending",
        average_rating: 0,
        completed_transactions_count: 0,
      }),
    });

    try {
      await rest("user_roles", {
        method: "POST",
        headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
        body: JSON.stringify({ user_id: payload.userId, role: "vendor" }),
      });
    } catch (error) {
      if (!String(error).toLowerCase().includes("duplicate")) throw error;
    }

    return json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.post("/notify-vendor-approved", async (c) => {
  try {
    const user = await requireUser(c);
    if (!(await isAdmin(user.id))) return json({ success: false, error: "Forbidden" }, 403);
    const { vendorUserId, businessName } = await readBody(c);
    if (!vendorUserId) return json({ success: false, error: "vendorUserId is required" }, 400);

    await notify(
      vendorUserId,
      "Your TechTrust vendor account has been approved",
      `Congratulations! ${businessName ?? "Your shop"} has been verified and approved on TechTrust. Log in to start listing products and receiving orders.`,
      "vendor_application",
    );

    return json({ success: true, emailSent: false });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

app.notFound((c) => c.json({ success: false, error: "Not found" }, 404));

const port = Number(process.env.PORT ?? 3000);
console.log(`techtrust-escrow-api listening on :${port} (payments: ${resolveProvider()})`);

export default { port, fetch: app.fetch };
