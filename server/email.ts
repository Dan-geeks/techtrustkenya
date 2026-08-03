// TechTrust — transactional email.
//
// Same approach and the same env-var names as DarajaPay's welcome-email.js, so
// one Resend key serves both products. Nothing here is allowed to break the
// flow that triggered it: every send is best-effort and returns a result object
// instead of throwing, because a signup or a completed payment must never fail
// because an email did not go out.
//
// Environment (set on Railway):
//   RESEND_API_KEY   required — without it every send is a no-op that logs.
//   RESEND_FROM      defaults to "TechTrust <onboarding@resend.dev>". Change to
//                    "TechTrust <noreply@techtrustkenya.co.ke>" once the domain
//                    is verified in Resend. Until a domain is verified Resend
//                    only delivers to the account owner's own address.
//   SUPPORT_EMAIL    defaults to support@techtrustkenya.co.ke — used as reply-to.
//   SITE_URL         defaults to https://techtrustkenya.web.app — link target.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function resendKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim() || undefined;
}

function fromAddress(): string {
  return process.env.RESEND_FROM?.trim() || "TechTrust <onboarding@resend.dev>";
}

function supportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || "support@techtrustkenya.co.ke";
}

function siteUrl(): string {
  return (process.env.SITE_URL?.trim() || "https://techtrustkenya.web.app").replace(/\/+$/, "");
}

export function emailConfigured(): boolean {
  return !!resendKey();
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch] as string),
  );
}

function ksh(amount: unknown): string {
  const n = Number(amount);
  return Number.isFinite(n) ? `KES ${Math.round(n).toLocaleString("en-KE")}` : "KES 0";
}

// A single-boot dedupe. Signups fire once per person, but a client retrying or
// an auth listener re-emitting the same state should not send twice.
const recentlySent = new Set<string>();

export type SendResult = { ok: boolean; skipped?: string; error?: string };

async function send(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
  dedupeKey?: string;
}): Promise<SendResult> {
  const to = args.to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "invalid recipient address" };
  }

  const key = resendKey();
  if (!key) {
    // Deliberately not an error: the platform runs fine without email, and
    // this log is how you notice the key is missing.
    console.warn(`[EMAIL] RESEND_API_KEY not set — would have sent "${args.subject}" to ${to}`);
    return { ok: false, skipped: "RESEND_API_KEY not set" };
  }

  if (args.dedupeKey) {
    if (recentlySent.has(args.dedupeKey)) return { ok: true, skipped: "already sent this boot" };
    recentlySent.add(args.dedupeKey);
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress(),
        to: [to],
        reply_to: supportEmail(),
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });
    const body = await res.text();
    if (!res.ok) {
      // The usual one: 403 validation_error when the sending domain is not yet
      // verified and the recipient isn't the Resend account owner.
      if (args.dedupeKey) recentlySent.delete(args.dedupeKey);
      console.error(`[EMAIL] Resend ${res.status} for ${to}: ${body}`);
      return { ok: false, error: `Resend ${res.status}: ${body}` };
    }
    console.log(`[EMAIL] sent "${args.subject}" to ${to}`);
    return { ok: true };
  } catch (error) {
    if (args.dedupeKey) recentlySent.delete(args.dedupeKey);
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[EMAIL] send failed for ${to}: ${message}`);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Shared shell so every message looks like the same product
// ---------------------------------------------------------------------------

function layout(args: { heading: string; intro: string; body: string; cta?: { label: string; href: string } }): string {
  const cta = args.cta
    ? `<tr><td style="padding:24px 32px 8px;" align="center">
         <a href="${escapeHtml(args.cta.href)}" style="display:inline-block;background:#0F3D8C;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;">${escapeHtml(args.cta.label)}</a>
       </td></tr>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-top:3px solid #0F3D8C;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:32px 32px 8px;">
            <p style="margin:0 0 20px;font-size:13px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#0F3D8C;">TechTrust Kenya</p>
            <h1 style="margin:0 0 8px;font-size:23px;font-weight:700;color:#0f172a;">${escapeHtml(args.heading)}</h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">${args.intro}</p>
          </td></tr>
          <tr><td style="padding:0 32px;">${args.body}</td></tr>
          ${cta}
          <tr><td style="padding:20px 32px 32px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
              Questions? Reply to this email or write to
              <a href="mailto:${escapeHtml(supportEmail())}" style="color:#0F3D8C;text-decoration:none;">${escapeHtml(supportEmail())}</a>.
            </p>
            <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">
              TechTrust Kenya — every payment is held in Float until you confirm your device.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function panel(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([k, v]) =>
        `<tr>
           <td style="padding:6px 0;font-size:14px;color:#64748b;">${escapeHtml(k)}</td>
           <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;text-align:right;">${escapeHtml(v)}</td>
         </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
            <tr><td style="padding:16px 20px;"><table role="presentation" width="100%">${cells}</table></td></tr>
          </table>`;
}

// ---------------------------------------------------------------------------
// 1. Welcome — a new customer or vendor account
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(args: {
  email: string;
  name?: string;
  role?: "customer" | "vendor" | string;
}): Promise<SendResult> {
  const isVendor = args.role === "vendor";
  const name = (args.name ?? "").trim().slice(0, 80);
  const greeting = name ? `Welcome, ${name}!` : "Welcome to TechTrust!";

  const customerBody = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0F3D8C;letter-spacing:0.04em;text-transform:uppercase;">How Float protects you</p>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#475569;"><strong style="color:#0f172a;">1.</strong> Pay with M-Pesa. Your money goes into Float, not to the seller.</p>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#475569;"><strong style="color:#0f172a;">2.</strong> Inspect the device at the shop or on delivery.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;"><strong style="color:#0f172a;">3.</strong> Confirm the order. Only then is the seller paid.</p>
      </td></tr>
    </table>`;

  const vendorBody = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0F3D8C;letter-spacing:0.04em;text-transform:uppercase;">Getting your shop live</p>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#475569;"><strong style="color:#0f172a;">1.</strong> Finish verification — ID, business certificate and shop photos.</p>
        <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#475569;"><strong style="color:#0f172a;">2.</strong> Add your first listing with real specs and photos.</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;"><strong style="color:#0f172a;">3.</strong> Buyers pay into Float; you are paid out once they confirm.</p>
      </td></tr>
    </table>`;

  const intro = isVendor
    ? "Your vendor account is created. A verified shop on TechTrust sells faster, because buyers know their money is protected until they confirm the device."
    : "Your account is ready. TechTrust holds every payment in <strong>Float</strong> until you have the device in your hands and confirm it.";

  const text = isVendor
    ? `${greeting}\n\nYour TechTrust vendor account is created.\n\nGetting your shop live\n1. Finish verification - ID, business certificate and shop photos.\n2. Add your first listing with real specs and photos.\n3. Buyers pay into Float; you are paid out once they confirm.\n\nOpen your dashboard: ${siteUrl()}/vendor/dashboard\n\nQuestions? ${supportEmail()}\n\n- TechTrust Kenya`
    : `${greeting}\n\nYour TechTrust account is ready. We hold every payment in Float until you confirm the device.\n\nHow Float protects you\n1. Pay with M-Pesa. Your money goes into Float, not to the seller.\n2. Inspect the device at the shop or on delivery.\n3. Confirm the order. Only then is the seller paid.\n\nStart browsing: ${siteUrl()}/browse\n\nQuestions? ${supportEmail()}\n\n- TechTrust Kenya`;

  return send({
    to: args.email,
    dedupeKey: `welcome:${args.email.trim().toLowerCase()}`,
    subject: isVendor ? "Your TechTrust vendor account is ready" : "Welcome to TechTrust Kenya",
    html: layout({
      heading: greeting,
      intro,
      body: isVendor ? vendorBody : customerBody,
      cta: isVendor
        ? { label: "Open your dashboard", href: `${siteUrl()}/vendor/dashboard` }
        : { label: "Start browsing", href: `${siteUrl()}/browse` },
    }),
    text,
  });
}

// ---------------------------------------------------------------------------
// 2. Payment received — to the buyer
// ---------------------------------------------------------------------------

export async function sendOrderPaidEmail(args: {
  email: string;
  name?: string;
  orderId: string;
  amountKsh: number;
  receipt?: string | null;
  productName?: string | null;
  vendorName?: string | null;
}): Promise<SendResult> {
  const short = `#${args.orderId.slice(0, 8).toUpperCase()}`;
  const rows: Array<[string, string]> = [["Order", short]];
  if (args.productName) rows.push(["Item", args.productName]);
  if (args.vendorName) rows.push(["Seller", args.vendorName]);
  rows.push(["Amount held in Float", ksh(args.amountKsh)]);
  if (args.receipt) rows.push(["M-Pesa receipt", args.receipt]);

  return send({
    to: args.email,
    dedupeKey: `order-paid:${args.orderId}`,
    subject: `Payment received — order ${short} is protected by Float`,
    html: layout({
      heading: "Your payment is held in Float",
      intro:
        "We have received your M-Pesa payment. The seller does <strong>not</strong> have your money — it stays in Float until you inspect the device and confirm the order.",
      body:
        panel(rows) +
        `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#475569;">
           Next: collect or receive the device, check it over, then hit <strong>Confirm receipt</strong> on the order page.
           If something is wrong, raise a dispute from the same page and we will step in before any money moves.
         </p>`,
      cta: { label: "Track this order", href: `${siteUrl()}/orders/${args.orderId}` },
    }),
    text: `Payment received - order ${short}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nYour money is held in Float. The seller is paid only after you inspect the device and confirm the order.\n\nTrack it: ${siteUrl()}/orders/${args.orderId}\n\n- TechTrust Kenya`,
  });
}

// ---------------------------------------------------------------------------
// 3. New sale — to the vendor
// ---------------------------------------------------------------------------

export async function sendVendorSaleEmail(args: {
  email: string;
  businessName?: string | null;
  orderId: string;
  amountKsh: number;
  payoutKsh?: number | null;
  productName?: string | null;
}): Promise<SendResult> {
  const short = `#${args.orderId.slice(0, 8).toUpperCase()}`;
  const rows: Array<[string, string]> = [["Order", short]];
  if (args.productName) rows.push(["Item", args.productName]);
  rows.push(["Customer paid", ksh(args.amountKsh)]);
  if (args.payoutKsh != null) rows.push(["Your payout", ksh(args.payoutKsh)]);

  return send({
    to: args.email,
    dedupeKey: `vendor-sale:${args.orderId}`,
    subject: `New paid order ${short} — prepare the device`,
    html: layout({
      heading: "You have a paid order",
      intro: `${escapeHtml(args.businessName || "Your shop")} has a new order and the customer has already paid. The funds are held in Float and released to you once the customer confirms the device.`,
      body:
        panel(rows) +
        `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#475569;">
           Get the device ready and mark the order confirmed in your dashboard so the customer knows it is on the way.
         </p>`,
      cta: { label: "Open your orders", href: `${siteUrl()}/vendor/dashboard?tab=Orders` },
    }),
    text: `New paid order ${short}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nThe funds are held in Float and released once the customer confirms the device.\n\nOpen your orders: ${siteUrl()}/vendor/dashboard?tab=Orders\n\n- TechTrust Kenya`,
  });
}
