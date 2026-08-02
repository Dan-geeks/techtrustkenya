
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://okvgadkyknfknqtxnjzz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdmdhZGt5a25ma25xdHhuanp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc2OTI5MiwiZXhwIjoyMDk2MzQ1MjkyfQ.Etxc0ki_DW7A9I-B-qREMQTR5SA9WFdsX0JH3P8CRA0",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const email = "johnmwangimegwe@gmail.com";
  
  let hasMore = true;
  let page = 1;
  let foundUser = null;
  while (hasMore) {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (listError) {
      console.error("List error:", listError);
      process.exit(1);
    }
    const existing = usersData.users.find(u => u.email === email);
    if (existing) {
      foundUser = existing;
      break;
    }
    if (usersData.users.length < 100) hasMore = false;
    page++;
  }
  
  if (foundUser) {
    console.log("Found user ID:", foundUser.id);
    
    // Remove admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", foundUser.id)
      .eq("role", "admin");
      
    if (roleError) {
      console.error("Error removing admin role:", roleError);
    } else {
      console.log("Successfully removed admin role from", foundUser.id);
    }
  } else {
    console.error("Could not find the user", email);
  }
}

run();
