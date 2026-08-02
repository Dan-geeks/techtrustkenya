import { createClient } from "@supabase/supabase-js";
const supabase = createClient("https://okvgadkyknfknqtxnjzz.supabase.co", "sb_publishable_P3_iBAP4vHhiUkjiKlGr_A_rqoDE3GZ");
async function run() {
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email");
  const profileIds = profiles.map(p => p.id);
  
  const { data: products } = await supabase.from("products").select("id, brand, model_name, vendor_id").in("vendor_id", profileIds);
  console.log("Real Vendor Products:");
  for (const product of products) {
    const owner = profiles.find(p => p.id === product.vendor_id);
    console.log(`Product: ${product.brand} ${product.model_name} (Owned by Vendor: ${owner.full_name || owner.email || owner.id})`);
  }
}
run();
