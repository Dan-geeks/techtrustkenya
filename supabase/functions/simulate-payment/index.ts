// Demo-only payment simulator: marks a pending order as paid_float so the Float
// flow can be demonstrated without a real mobile-money transaction. This should
// only be enabled in sandbox/dev projects.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function ok(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isTrue(value: string | undefined | null): boolean {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").toLowerCase());
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
    if (!isTrue(Deno.env.get("PAYMENT_SANDBOX_MODE")) && !isTrue(Deno.env.get("PAYMENT_SIMULATION_ENABLED"))) {
      return ok({ success: false, error: "Payment simulation is disabled" });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return ok({ success: false, error: "Unauthorized" });

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return ok({ success: false, error: "Unauthorized" });

    const { order_id } = await req.json().catch(() => ({}));
    if (!order_id) return ok({ success: false, error: "order_id required" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: order } = await admin
      .from("orders")
      .select("id, customer_id, payment_status, total_amount_ksh")
      .eq("id", order_id)
      .maybeSingle();

    if (!order) return ok({ success: false, error: "Order not found" });
    if (order.customer_id !== u.user.id) return ok({ success: false, error: "Forbidden" });
    if (order.payment_status !== "pending") {
      return ok({ success: false, error: "Order already processed" });
    }

    const fakeReceipt = `SIM${Date.now().toString().slice(-8)}`;
    const fakeTx = `SIM-${order_id.slice(0, 8)}`;
    const paidAmount = Number(Deno.env.get("PAYMENT_TEST_AMOUNT_KSH") ?? order.total_amount_ksh);
    const withMetadata = await admin.rpc("mark_order_paid", {
      _order_id: order_id,
      _receipt: fakeReceipt,
      _mpesa_tx: fakeTx,
      _paid_amount_ksh: Number.isFinite(paidAmount) ? paidAmount : null,
      _payment_provider: "simulation",
    });
    const legacy = withMetadata.error
      ? await admin.rpc("mark_order_paid", {
          _order_id: order_id,
          _receipt: fakeReceipt,
          _mpesa_tx: fakeTx,
        })
      : withMetadata;
    const rpcErr = legacy.error;
    if (rpcErr) return ok({ success: false, error: rpcErr.message });

    await recordPaymentEvent(admin, {
      order_id,
      event_type: "payment_confirmed",
      provider: "simulation",
      amount_ksh: Number.isFinite(paidAmount) ? paidAmount : null,
      reference: fakeTx,
      payload: { simulated: true, receipt: fakeReceipt },
    });

    return ok({ success: true, receipt: fakeReceipt, amountKsh: paidAmount });
  } catch (e) {
    return ok({ success: false, error: e instanceof Error ? e.message : String(e) });
  }
});
