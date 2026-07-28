/**
 * Proves STK Push works, independently of Supabase and of this app's database.
 *
 *   bun run scripts/verify-stk.ts 0712345678
 *
 * It authenticates against Daraja, sends a real STK prompt to the number you
 * pass, then polls STK Push Query until the customer accepts or declines —
 * exactly the two-response cycle the escrow API implements. If this prints
 * "PIN prompt delivered", the gateway half of payments is working and anything
 * still broken is on the Supabase side.
 *
 * Reads credentials from the environment (or server/.env):
 *   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
 */

const BASE = (process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke").replace(/\/+$/, "");
const KEY = process.env.MPESA_CONSUMER_KEY ?? "";
const SECRET = process.env.MPESA_CONSUMER_SECRET ?? "";
const SHORTCODE = process.env.MPESA_SHORTCODE ?? "174379";
const PASSKEY = process.env.MPESA_PASSKEY ?? "";
const CALLBACK =
  process.env.MPESA_CALLBACK_URL ||
  (process.env.PUBLIC_BASE_URL
    ? `${process.env.PUBLIC_BASE_URL.replace(/\/+$/, "")}/mpesa-callback${
        process.env.MPESA_CALLBACK_SECRET ? `/${process.env.MPESA_CALLBACK_SECRET}` : ""
      }`
    : "");

const raw = process.argv[2];
const amount = Number(process.argv[3] ?? 1);

function fail(message: string): never {
  console.error(`\n  FAILED  ${message}\n`);
  process.exit(1);
}

function formatPhone(value: string): string | null {
  const digits = String(value ?? "").replace(/^\+/, "").replace(/\D/g, "");
  if (/^254[71]\d{8}$/.test(digits)) return digits;
  if (/^0[71]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[71]\d{8}$/.test(digits)) return `254${digits}`;
  return null;
}

function timestamp(): string {
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

const missing = [
  ["MPESA_CONSUMER_KEY", KEY],
  ["MPESA_CONSUMER_SECRET", SECRET],
  ["MPESA_PASSKEY", PASSKEY],
].filter(([, v]) => !v).map(([n]) => n);

if (missing.length) fail(`Missing ${missing.join(", ")}. Get them from developer.safaricom.co.ke.`);
if (!raw) fail("Usage: bun run scripts/verify-stk.ts <phone> [amount]");

const phone = formatPhone(raw);
if (!phone) fail(`"${raw}" is not a valid Kenyan mobile number.`);

console.log(`\n  Gateway   ${BASE}`);
console.log(`  Shortcode ${SHORTCODE}`);
console.log(`  Phone     ${phone.slice(0, 4)}XXXXXX${phone.slice(-2)}`);
console.log(`  Amount    KES ${amount}`);
console.log(`  Callback  ${CALLBACK || "(none set — Daraja will not be able to confirm)"}\n`);

// --- 1. OAuth -------------------------------------------------------------
process.stdout.write("  [1/3] Authenticating... ");
const tokenRes = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
  headers: { Authorization: `Basic ${btoa(`${KEY}:${SECRET}`)}` },
});
const tokenBody: any = (await tokenRes.json().catch(() => null)) ?? {};
if (!tokenRes.ok || !tokenBody.access_token) {
  console.log("");
  fail(`OAuth rejected: ${tokenBody.errorMessage ?? tokenBody.error_description ?? `HTTP ${tokenRes.status}`}`);
}
console.log("ok");

// --- 2. STK Push (Response 1) --------------------------------------------
process.stdout.write("  [2/3] Sending STK prompt... ");
const ts = timestamp();
const pushRes = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
  method: "POST",
  headers: { Authorization: `Bearer ${tokenBody.access_token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    BusinessShortCode: SHORTCODE,
    Password: btoa(`${SHORTCODE}${PASSKEY}${ts}`),
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: amount,
    PartyA: phone,
    PartyB: SHORTCODE,
    PhoneNumber: phone,
    CallBackURL: CALLBACK || "https://example.com/mpesa-callback",
    AccountReference: "TT-VERIFY",
    TransactionDesc: "TechTrust STK verification",
  }),
});
const push: any = (await pushRes.json().catch(() => null)) ?? {};
if (!pushRes.ok || push.ResponseCode !== "0") {
  console.log("");
  fail(`Push rejected: ${push.errorMessage ?? push.ResponseDescription ?? `HTTP ${pushRes.status}`}`);
}
console.log("ok");
console.log(`         CheckoutRequestID: ${push.CheckoutRequestID}`);
console.log("\n  PIN prompt delivered. This is Response 1 — no money has moved yet.");
console.log("  Enter your M-Pesa PIN on the handset (or dismiss it to see a failure).\n");

// --- 3. STK Push Query (Response 2) --------------------------------------
console.log("  [3/3] Waiting for Response 2...");
const deadline = Date.now() + 150_000;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 5000));

  const qts = timestamp();
  const queryRes = await fetch(`${BASE}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenBody.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: SHORTCODE,
      Password: btoa(`${SHORTCODE}${PASSKEY}${qts}`),
      Timestamp: qts,
      CheckoutRequestID: push.CheckoutRequestID,
    }),
  });
  const q: any = (await queryRes.json().catch(() => null)) ?? {};
  const code = q.ResultCode !== undefined ? String(q.ResultCode) : undefined;

  // 500.001.1001 means "still being processed" — keep waiting.
  if (code === undefined) {
    const secondsLeft = Math.round((deadline - Date.now()) / 1000);
    process.stdout.write(`\r         still pending... ${secondsLeft}s left   `);
    continue;
  }

  console.log("");
  if (code === "0") {
    console.log(`\n  SUCCESS  Payment completed. ${q.ResultDesc ?? ""}`);
    console.log("  STK Push is fully working. Escrow will settle on the callback.\n");
    process.exit(0);
  }
  console.log(`\n  DECLINED  ResultCode ${code}: ${q.ResultDesc ?? "no description"}`);
  console.log("  The gateway round-trip works — the customer just did not complete it.\n");
  process.exit(0);
}

console.log("\n\n  TIMED OUT  No response within 150s. The prompt was delivered but never answered.\n");
process.exit(0);
