
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://okvgadkyknfknqtxnjzz.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdmdhZGt5a25ma25xdHhuanp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc2OTI5MiwiZXhwIjoyMDk2MzQ1MjkyfQ.Etxc0ki_DW7A9I-B-qREMQTR5SA9WFdsX0JH3P8CRA0",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const email = "labcoatsxd@gmail.com";
  const password = "1Danielmwendwamusau";

  // Create user
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError) {
    console.log("User creation error:", userError.message);
    if (userError.message.includes("registered") || userError.message.includes("already exists")) {
      console.log("User already exists, fetching user ID...");
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
        await makeAdmin(foundUser.id);
        await supabase.auth.admin.updateUserById(foundUser.id, { password });
        console.log("Updated password.");
        return;
      } else {
        console.error("Could not find the existing user in listUsers");
      }
    } else {
      process.exit(1);
    }
  } else {
    console.log("Created new user:", userData.user.id);
    await makeAdmin(userData.user.id);
  }
}

async function makeAdmin(userId: string) {
  // Upsert role
  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id, role" });

  if (roleError) {
    console.error("Error assigning admin role:", roleError);
    process.exit(1);
  }
  
  console.log("Successfully assigned admin role to", userId);
}

run();
