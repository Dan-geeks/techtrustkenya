import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://okvgadkyknfknqtxnjzz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_P3_iBAP4vHhiUkjiKlGr_A_rqoDE3GZ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const email = 'johnmwangimegwe@gmail.com';
  const password = 'AdminPassword123!';
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('User created:', data.user?.id);
    console.log('Email:', email);
    console.log('Password:', password);
  }
}

run();
