// TechTrust — transactional SMS.
//
// Africa's Talking, which is the practical choice for Kenyan numbers: M-Pesa
// customers read SMS, and many will not open email at all.
//
// Same contract as email.ts: every send is best-effort and returns a result
// object instead of throwing. A payment must never fail because an SMS did not
// go out, and nothing here is on the critical path of settling money.
//
// Environment (set on Railway):
//   AT_API_KEY      required — without it every send is a logged no-op.
//   AT_USERNAME     defaults to "sandbox". Use your live username in production;
//                   "sandbox" only delivers to Africa's Talking simulator numbers.
//   AT_SENDER_ID    optional alphanumeric sender ID / short code. Unset means
//                   the shared pool number, which is fine for testing but shows
//                   an unfamiliar sender.

const AT_ENDPOINT_LIVE = "https://api.africastalking.com/version1/messaging";
const AT_ENDPOINT_SANDBOX = "https://api.sandbox.africastalking.com/version1/messaging";

function apiKey(): string | undefined {
  return process.env.AT_API_KEY?.trim() || undefined;
}

function username(): string {
  return process.env.AT_USERNAME?.trim() || "sandbox";
}

function endpoint(): string {
  return username() === "sandbox" ? AT_ENDPOINT_SANDBOX : AT_ENDPOINT_LIVE;
}

export function smsConfigured(): boolean {
  return !!apiKey();
}

/**
 * Kenyan MSISDN in the +254 form Africa's Talking expects. Returns null for
 * anything that is not plausibly a Kenyan mobile number, so we never burn
 * credits on junk.
 */
export function toMsisdn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  let local: string;
  if (digits.startsWith("254")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  else local = digits;
  // Kenyan mobiles are 9 digits after the country code and start 7 or 1.
  if (!/^[71]\d{8}$/.test(local)) return null;
  return `+254${local}`;
}

export type SmsResult = { ok: boolean; skipped?: string; error?: string };

const recentlySent = new Set<string>();

export async function sendSms(args: { to: string; message: string; dedupeKey?: string }): Promise<SmsResult> {
  const msisdn = toMsisdn(args.to);
  if (!msisdn) return { ok: false, error: `not a valid Kenyan number: ${args.to}` };

  const key = apiKey();
  if (!key) {
    console.warn(`[SMS] AT_API_KEY not set — would have texted ${msisdn}: ${args.message.slice(0, 60)}…`);
    return { ok: false, skipped: "AT_API_KEY not set" };
  }

  if (args.dedupeKey) {
    if (recentlySent.has(args.dedupeKey)) return { ok: true, skipped: "already sent this boot" };
    recentlySent.add(args.dedupeKey);
  }

  try {
    const body = new URLSearchParams({
      username: username(),
      to: msisdn,
      message: args.message,
      ...(process.env.AT_SENDER_ID?.trim() ? { from: process.env.AT_SENDER_ID.trim() } : {}),
    });

    const res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        apiKey: key,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });

    const text = await res.text();
    if (!res.ok) {
      if (args.dedupeKey) recentlySent.delete(args.dedupeKey);
      console.error(`[SMS] Africa's Talking ${res.status} for ${msisdn}: ${text}`);
      return { ok: false, error: `AfricasTalking ${res.status}: ${text}` };
    }

    // A 200 can still carry per-recipient failures ("InsufficientBalance",
    // "UserInBlacklist"), so the body has to be inspected rather than trusted.
    let delivered = true;
    try {
      const parsed = JSON.parse(text);
      const recipients = parsed?.SMSMessageData?.Recipients ?? [];
      if (Array.isArray(recipients) && recipients.length > 0) {
        delivered = recipients.some((r: any) => String(r?.status).toLowerCase() === "success");
        if (!delivered) {
          if (args.dedupeKey) recentlySent.delete(args.dedupeKey);
          const why = recipients.map((r: any) => r?.status).join(", ");
          console.error(`[SMS] rejected for ${msisdn}: ${why}`);
          return { ok: false, error: `rejected: ${why}` };
        }
      }
    } catch {
      // Unparseable 200 — assume it went, but say so in the log.
      console.warn(`[SMS] unparseable response for ${msisdn}: ${text.slice(0, 200)}`);
    }

    console.log(`[SMS] sent to ${msisdn}`);
    return { ok: true };
  } catch (error) {
    if (args.dedupeKey) recentlySent.delete(args.dedupeKey);
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[SMS] send failed for ${msisdn}: ${message}`);
    return { ok: false, error: message };
  }
}

const ksh = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? `KES ${Math.round(v).toLocaleString("en-KE")}` : "KES 0";
};

/** Buyer, after an order payment lands in Float. */
export function orderPaidSms(args: { amountKsh: number; receipt?: string | null; orderId: string }) {
  const ref = `#${args.orderId.slice(0, 8).toUpperCase()}`;
  return (
    `TechTrust: We received ${ksh(args.amountKsh)} for order ${ref}. ` +
    `${args.receipt ? `M-Pesa ${args.receipt}. ` : ""}` +
    `Your money is held in Float - the seller is paid only after you get the item and confirm it.`
  );
}

/** Vendor, after an order payment lands in Float. */
export function vendorSaleSms(args: { amountKsh: number; orderId: string }) {
  const ref = `#${args.orderId.slice(0, 8).toUpperCase()}`;
  return (
    `TechTrust: New PAID order ${ref} for ${ksh(args.amountKsh)}. ` +
    `Funds are held in Float and released once the customer confirms. Prepare the device.`
  );
}

/** Customer, after paying a repair quote into Float. */
export function repairPaidSms(args: { amountKsh: number; receipt?: string | null; repairId: string; device?: string | null }) {
  const ref = `#${args.repairId.slice(0, 8).toUpperCase()}`;
  return (
    `TechTrust: We received ${ksh(args.amountKsh)} for repair ${ref}` +
    `${args.device ? ` (${args.device})` : ""}. ` +
    `${args.receipt ? `M-Pesa ${args.receipt}. ` : ""}` +
    `Held in Float until you collect the device and confirm the repair.`
  );
}

/** Technician, after the customer pays. */
export function repairPaidVendorSms(args: { amountKsh: number; repairId: string; device?: string | null }) {
  const ref = `#${args.repairId.slice(0, 8).toUpperCase()}`;
  return (
    `TechTrust: Repair ${ref}${args.device ? ` (${args.device})` : ""} has been PAID - ` +
    `${ksh(args.amountKsh)} held in Float. You can start work; payment is released when the customer confirms.`
  );
}
