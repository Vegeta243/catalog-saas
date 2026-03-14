import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = 'elliottshilenge5@gmail.com';
  const password = '2413A2413a';

  // Check if user already exists
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find((u) => u.email === email);

  if (found) {
    console.log('User already exists:', found.id);
    // Update password just in case
    const { error } = await supabase.auth.admin.updateUserById(found.id, { password });
    if (error) console.error('Password update error:', error.message);
    else console.log('Password updated ✅');
    // Ensure profile has admin role
    await upsertProfile(found.id, email);
    return;
  }

  // Create user
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    console.error('Create user error:', error.message);
    process.exit(1);
  }

  console.log('User created:', data.user.id);
  await upsertProfile(data.user.id, email);
}

async function upsertProfile(userId: string, email: string) {
  // Try to upsert into profiles table if it exists
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    username: 'Dushane243',
    role: 'admin',
    plan: 'pro',
    first_name: 'Dushane',
  }, { onConflict: 'id' });

  if (error) console.warn('Profile upsert warning (table may not exist):', error.message);
  else console.log('Profile upserted with role=admin ✅');
}

main().catch(console.error);
