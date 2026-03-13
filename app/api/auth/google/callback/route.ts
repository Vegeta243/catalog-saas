import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `${reqUrl.protocol}//${reqUrl.host}`;

  const { searchParams } = reqUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  function fail(code: string) {
    const res = NextResponse.redirect(`${siteUrl}/login?error=${code}`);
    res.cookies.delete('google_oauth_state');
    res.cookies.delete('google_oauth_redirect');
    return res;
  }

  if (errorParam) return fail('google_denied');

  // CSRF check
  const storedState = request.cookies.get('google_oauth_state')?.value;
  if (!state || !storedState || state !== storedState) return fail('google_csrf');
  if (!code) return fail('google_no_code');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('google_config');

  const redirectAfter = request.cookies.get('google_oauth_redirect')?.value || '/dashboard';
  const callbackUri = `${siteUrl}/api/auth/google/callback`;

  // ── Exchange code for Google tokens ──────────────────────────────────────
  let accessToken: string;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      console.error('[Google OAuth] Token exchange failed:', await tokenRes.text());
      return fail('google_token');
    }
    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;
    if (!accessToken) return fail('google_token');
  } catch (e) {
    console.error('[Google OAuth] Token exchange network error:', e);
    return fail('google_token');
  }

  // ── Get Google user info ──────────────────────────────────────────────────
  let googleEmail: string;
  let googleFirstName: string;
  let googleLastName: string;
  let googleAvatar: string;
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) return fail('google_userinfo');
    const g = await userRes.json();
    googleEmail = (g.email || '').toLowerCase().trim();
    googleFirstName = g.given_name || g.name?.split(' ')[0] || '';
    googleLastName = g.family_name || '';
    googleAvatar = g.picture || '';
    if (!googleEmail) return fail('google_no_email');
  } catch {
    return fail('google_userinfo');
  }

  // ── Supabase admin client ─────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) return fail('google_config');
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Find or create Supabase auth user ────────────────────────────────────
  let userId: string;
  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email: googleEmail,
    email_confirm: true,
    user_metadata: {
      first_name: googleFirstName,
      last_name: googleLastName,
      avatar_url: googleAvatar,
      provider: 'google',
    },
  });

  if (!createErr && createData.user) {
    userId = createData.user.id;
    // Ensure public.users record exists for the new user
    await admin.from('users').upsert(
      { id: userId, plan: 'free', actions_used: 0 },
      { onConflict: 'id' },
    );
  } else {
    // User already exists — find by email
    const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = listData?.users?.find(
      (u) => u.email?.toLowerCase() === googleEmail,
    );
    if (!existing) {
      console.error('[Google OAuth] Could not find or create user:', googleEmail);
      return fail('google_no_user');
    }
    userId = existing.id;
    // Update metadata so name/avatar stay fresh
    await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...existing.user_metadata,
        first_name: googleFirstName || existing.user_metadata?.first_name,
        last_name: googleLastName || existing.user_metadata?.last_name,
        avatar_url: googleAvatar || existing.user_metadata?.avatar_url,
      },
    });
  }

  // ── Generate a magic-link to create a session (PKCE-safe) ────────────────
  // Supabase SSR uses PKCE by default → the magic link verify endpoint
  // will redirect to redirectTo with a `code` param → /auth/callback handles it.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: googleEmail,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectAfter)}`,
    },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('[Google OAuth] generateLink failed:', linkErr);
    return fail('google_session');
  }

  const response = NextResponse.redirect(linkData.properties.action_link);
  response.cookies.delete('google_oauth_state');
  response.cookies.delete('google_oauth_redirect');
  return response;
}
