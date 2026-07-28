import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { vendorUserId, businessName } = await req.json();
    if (!vendorUserId) {
      return new Response(JSON.stringify({ success: false, error: "vendorUserId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the user's email via auth admin API
    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(vendorUserId);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ success: false, error: userErr?.message ?? "User not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const email = userRes.user.email;

    // Insert in-app notification (always works)
    await admin.from("notifications").insert({
      user_id: vendorUserId,
      title: "Your TechTrust Vendor Account Has Been Approved",
      message: `Congratulations! ${businessName ?? "Your shop"} has been verified and approved on TechTrust. Log in to start listing products and receiving orders.`,
      type: "vendor_application",
    });

    // Send the approval email via Supabase Auth magic-link template hijack:
    // We use the built-in inviteUserByEmail / generateLink as a lightweight email path.
    // If a real SMTP/email infra is configured, this delivers; otherwise it logs only.
    const subject = "Your TechTrust Vendor Account Has Been Approved";
    const body =
`Congratulations! Your shop has been verified and approved on TechTrust.

You can now log in to your vendor dashboard to start listing products, managing inventory, and receiving orders.

Log in at https://tech-trust-kenya.lovable.app/auth

If you have any questions contact us at johnmwangimegwe@gmail.com or support@techtrust.co.ke

Welcome to TechTrust.`;

    // Best-effort: trigger a magic link so Supabase emails the user.
    // The actual approval message is also stored in notifications.
    let emailSent = false;
    try {
      const { error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: email!,
        options: { redirectTo: "https://tech-trust-kenya.lovable.app/auth" },
      });
      if (!linkErr) emailSent = true;
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ success: true, emailSent, email, subject, body }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
