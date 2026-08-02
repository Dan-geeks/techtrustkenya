
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://okvgadkyknfknqtxnjzz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdmdhZGt5a25ma25xdHhuanp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc2OTI5MiwiZXhwIjoyMDk2MzQ1MjkyfQ.Etxc0ki_DW7A9I-B-qREMQTR5SA9WFdsX0JH3P8CRA0",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const { data } = await supabase.from("profiles").select("*").limit(1);
  console.log("Profiles schema:", data);
}

run();
