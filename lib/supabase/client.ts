import { createBrowserClient } from '@supabase/ssr';

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Return a minimal mock so the app doesn't crash when Supabase isn't configured
    return {
      auth: {
        signUp: async () => ({ data: null, error: new Error('Supabase non configuré') }),
        signInWithPassword: async () => ({ data: null, error: new Error('Supabase non configuré') }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: null, error: null, single: async () => ({ data: null, error: null }) }),
        insert: async () => ({ data: null, error: null }),
        update: () => ({ eq: async () => ({ data: null, error: null }) }),
        upsert: async () => ({ data: null, error: null }),
      }),
    } as unknown as ReturnType<typeof createBrowserClient>;
  }

  _client = createBrowserClient(url, key);
  return _client;
}