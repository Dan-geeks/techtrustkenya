// Public mobile-money callback receiver.
// Handles Safaricom Daraja STK callbacks, KCB Buni STK-like callbacks, and
// B2C payout result callbacks when the payout result URL points here.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

function jsonOk(body: Record<string, unknown> = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonError(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
  const lower = names.map((name) => name.toLowerCase());
  return items.find((i) => lower.includes(String(i.Name ?? i.Key ?? "").toLowerCase()))?.Value;
}

// Normalise callbacks from Safaricom Daraja and KCB Buni into a common shape.
// KCB Buni may send a flat top-level object, a nested { response, header } object,
// or a Daraja-style { Body: { stkCallback: ... } } — all are handled here.
function normalizeCallback(payload: Record<string, unknown>): CallbackInfo {
  // Daraja STK push callback: { Body: { stkCallback: { ... } } }
  const body = payload.Body as Record<string, unknown> | undefined;
  const stk = (body?.stkCallback ?? payload.stkCallback) as Record<string, unknown> | undefined;
  if (stk) {
    const items = callbackItems(stk.CallbackMetadata);
    return {
      kind: "payment",
      provider: "mobile_money",
      resultCode: firstString(stk.ResultCode),
      resultDescription: firstString(stk.ResultDesc),
      transactionId: firstString(stk.CheckoutRequestID),
      merchantRequestId: firstString(stk.MerchantRequestID),
      receipt: firstString(itemValue(items, "MpesaReceiptNumber", "ReceiptNumber", "TransID")),
      amountKsh: toNumber(itemValue(items, "Amount", "TransactionAmount")),
    };
  }

  // Daraja B2C / payout result callback: { Result: { ... } }
  const result = (payload.Result ?? payload.result) as Record<string, unknown> | undefined;
  if (result) {
    const params = resultParameters(result.ResultParameters);
    return {
      kind: "payout",
      provider: "mobile_money",
      resultCode: firstString(result.ResultCode),
      resultDescription: firstString(result.ResultDesc),
      transactionId: firstString(result.OriginatorConversationID, result.ConversationID, result.TransactionID),
      merchantRequestId: firstString(result.ConversationID),
      receipt: firstString(result.TransactionID, itemValue(params, "TransactionReceipt", "ReceiptNo")),
      amountKsh: toNumber(itemValue(params, "TransactionAmount", "Amount")),
    };
  }

  // KCB Buni callback — nested { response: { ... }, header: { ... } } shape
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

  // KCB Buni fallback — flat payload with a status/transactionId at root level
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

async function recordPaymentEvent(
  admin: ReturnType<typeof createClient>,
  event: Record<string, unknown>,
) {
  const { error } = await admin.from("order_payment_events").insert(event);
  if (error) console.warn("order_payment_events insert skipped", error.message);
}

async function markOrderPaid(
  admin: ReturnType<typeof createClient>,
  orderId: string,
  receipt: string,
  transactionId: string,
  amountKsh?: number,
  provider?: string,
) {
  const withMetadata = await admin.rpc("mark_order_paid", {
    _order_id: orderId,
    _receipt: receipt,
    _mpesa_tx: transactionId,
    _paid_amount_ksh: amountKsh ?? null,
    _payment_provider: provider ?? null,
  });
  if (!withMetadata.error) return withMetadata;

  console.warn("mark_order_paid metadata signature failed, retrying legacy signature", withMetadata.error.message);
  return await admin.rpc("mark_order_paid", {
    _order_id: orderId,
    _receipt: receipt,
    _mpesa_tx: transactionId,
  });
}

async function handlePaymentCallback(
  admin: ReturnType<typeof createClient>,
  info: CallbackInfo,
  payload: Record<string, unknown>,
) {
  const lookupId = info.transactionId ?? info.merchantRequestId;
  if (!lookupId) {
    console.warn("Payment callback missing transaction id", JSON.stringify(payload));
    return;
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, payment_status")
    .eq("mpesa_transaction_id", lookupId)
    .maybeSingle();
  if (!order) {
    console.warn("Order not found for payment callback", lookupId);
    return;
  }

  // Idempotency: skip if already fully paid to avoid double-processing
  if (order.payment_status === "paid_float") {
    console.log(`[mpesa-callback] duplicate callback for order ${order.id}, already paid_float — skipping`);
    return;
  }

  const success = String(info.resultCode ?? "") === "0";
  await recordPaymentEvent(admin, {
    order_id: order.id,
    event_type: success ? "payment_confirmed" : "payment_failed",
    provider: info.provider ?? "mobile_money",
    amount_ksh: info.amountKsh ?? null,
    reference: lookupId,
    payload,
  });

  if (success) {
    const receipt = info.receipt ?? lookupId;
    const { error: rpcErr } = await markOrderPaid(
      admin,
      order.id,
      receipt,
      lookupId,
      info.amountKsh,
      info.provider,
    );
    if (rpcErr) console.error("mark_order_paid error", rpcErr);
    return;
  }

  if (order.payment_status === "pending") {
    await admin
      .from("orders")
      .update({ payment_status: "failed", status: "cancelled", payment_gateway_response: payload })
      .eq("id", order.id);
  }
}

async function handlePayoutCallback(
  admin: ReturnType<typeof createClient>,
  info: CallbackInfo,
  payload: Record<string, unknown>,
) {
  const candidates = [info.transactionId, info.merchantRequestId, info.receipt].filter(Boolean) as string[];
  let order: Record<string, unknown> | null = null;
  for (const candidate of candidates) {
    const { data } = await admin
      .from("orders")
      .select("id, vendor_id, vendor_payout_ksh")
      .eq("payout_reference", candidate)
      .maybeSingle();
    if (data) {
      order = data;
      break;
    }
  }

  if (!order) {
    console.warn("Order not found for payout callback", JSON.stringify(candidates));
    return;
  }

  const success = String(info.resultCode ?? "") === "0";
  await recordPaymentEvent(admin, {
    order_id: order.id,
    event_type: success ? "payout_confirmed" : "payout_failed",
    provider: info.provider ?? "mobile_money",
    amount_ksh: info.amountKsh ?? order.vendor_payout_ksh ?? null,
    reference: info.receipt ?? info.transactionId ?? null,
    payload,
  });

  if (success) {
    await admin
      .from("orders")
      .update({
        payment_status: "released",
        payout_status: "sent",
        payout_reference: info.receipt ?? info.transactionId ?? null,
        payout_gateway_response: payload,
        float_released_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    return;
  }

  await admin
    .from("orders")
    .update({
      payout_status: "failed",
      payout_error: info.resultDescription ?? "Payout failed",
      payout_gateway_response: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Log every incoming callback immediately for production debugging
  const method = req.method;
  let rawBody = "";
  try {
    rawBody = await req.text();
    const truncated = rawBody.length > 500 ? rawBody.slice(0, 500) + "…" : rawBody;
    console.log(`[mpesa-callback] method=${method} body=${truncated}`);
  } catch {
    console.log(`[mpesa-callback] method=${method} body=<unreadable>`);
  }

  try {
    let payload: Record<string, unknown> = {};
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      console.warn("[mpesa-callback] Could not parse JSON body");
      return jsonError({ success: false, error: "Invalid JSON body" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const info = normalizeCallback(payload);

    if (info.kind === "payment") {
      await handlePaymentCallback(admin, info, payload);
    } else if (info.kind === "payout") {
      await handlePayoutCallback(admin, info, payload);
    } else {
      console.warn("Unknown callback shape", JSON.stringify(payload));
    }

    return jsonOk();
  } catch (e) {
    console.error("mpesa-callback error", e);
    return jsonOk();
  }
});
