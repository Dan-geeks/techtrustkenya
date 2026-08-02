import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const {
      userId,
      businessName,
      ownerName,
      phone,
      email,
      city,
      county,
      subCounty,
      physicalAddress,
      gpsLatitude,
      gpsLongitude,
      googleMapsLink,
      shopPhotoUrls,
      businessCertificateUrl,
      tillNumber,
      whatsapp,
      offersRepairs
    } = payload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: profileError } = await supabase
      .from("vendor_profiles")
      .upsert({
        user_id: userId,
        business_name: businessName,
        owner_name: ownerName,
        phone: phone,
        email: email,
        city: county ?? city ?? null,
        county: county ?? null,
        sub_county: subCounty ?? null,
        physical_address: physicalAddress,
        gps_latitude: gpsLatitude,
        gps_longitude: gpsLongitude,
        google_maps_link: googleMapsLink || null,
        shop_photo_urls: shopPhotoUrls || [],
        business_certificate_url: businessCertificateUrl || null,
        till_number: tillNumber || null,
        offers_repairs: offersRepairs || false,
        verification_status: "pending",
        average_rating: 0,
        completed_transactions_count: 0,
      }, { onConflict: "user_id" });

    if (profileError) {
      return new Response(
        JSON.stringify({ success: false, error: profileError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "vendor" });

    // Ignore error if the role already exists (e.g. code 23505 unique violation)
    if (roleError && roleError.code !== '23505' && !roleError.message?.includes('duplicate key value')) {
      return new Response(
        JSON.stringify({ success: false, error: roleError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
