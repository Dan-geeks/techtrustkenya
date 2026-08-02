import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okvgadkyknfknqtxnjzz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rdmdhZGt5a25ma25xdHhuanp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc2OTI5MiwiZXhwIjoyMDk2MzQ1MjkyfQ.Etxc0ki_DW7A9I-B-qREMQTR5SA9WFdsX0JH3P8CRA0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  const email = 'johnmwangimegwe@gmail.com';
  const password = 'AdminPassword123!';
  
  // 1. Get the user
  const { data: { users }, error: getUserError } = await supabase.auth.admin.listUsers();
  
  if (getUserError) {
    console.error('Failed to get users:', getUserError);
    return;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.error('User not found:', email);
    return;
  }
  
  console.log('Found user:', user.id);
  
  // 2. Update password
  const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: password
  });
  
  if (updateError) {
    console.error('Failed to update password:', updateError);
    return;
  }
  
  console.log('Password updated successfully');
  
  // 3. Promote to admin
  // We need to upsert or update user_roles
  const { data: roleData, error: roleError } = await supabase
    .from('user_roles')
    .upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id,role' });
    
  if (roleError) {
    console.error('Failed to update user_roles:', roleError);
    return;
  }
  
  console.log('Promoted to admin successfully');
}

run();
