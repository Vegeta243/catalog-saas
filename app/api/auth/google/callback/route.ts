import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const reqUrl = new URL(request.url);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || `${reqUrl.protocol}//${reqUrl.host}`).replace(/\/$/, '');

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

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return fail('google_config');

  const redirectAfter = request.cookies.get('google_oauth_redirect')?.value || '/dashboard';
  const callbackUri = `${siteUrl}/api/auth/google/callback`;

  // ── Exchange code for Google tokens ──────────────────────────────────────
  let googleAccessToken: string;
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
    googleAccessToken = tokenData.access_token;
    if (!googleAccessToken) return fail('google_token');
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
      headers: { Authorization: `Bearer ${googleAccessToken}` },
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
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !serviceKey || !anonKey) return fail('google_config');
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

  // ── Generate OTP then verify server-side (avoids PKCE requirement) ────────
  // The old approach was: generateLink → redirect user to magic link →
  // Supabase redirects to /auth/callback → exchangeCodeForSession (FAILS: no PKCE verifier).
  // New approach: verify the OTP directly on the server with flowType:'implicit',
  // get the session tokens, set SSR cookies, redirect straight to dashboard.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: googleEmail,
  });

  if (linkErr || !linkData?.properties?.email_otp) {
    console.error('[Google OAuth] generateLink failed:', linkErr);
    return fail('google_session');
  }

  // Verify OTP server-side using implicit flow (no PKCE challenge/verifier needed)
  const implicitClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, flowType: 'implicit' },
  });
  const { data: otpData, error: otpErr } = await implicitClient.auth.verifyOtp({
    email: googleEmail,
    token: linkData.properties.email_otp,
    type: 'email',
  });

  if (otpErr || !otpData?.session) {
    console.error('[Google OAuth] verifyOtp failed:', otpErr);
    return fail('google_session');
  }

  // ── Set Supabase SSR cookies and redirect to dashboard ───────────────────
  const destination = `${siteUrl}${redirectAfter.startsWith('/') ? redirectAfter : '/' + redirectAfter}`;
  const response = NextResponse.redirect(destination);
  response.cookies.delete('google_oauth_state');
  response.cookies.delete('google_oauth_redirect');

  // Write the session into SSR cookies so middleware + server components work
  const ssrClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() { return []; },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options));
      },
    },
  });

  const { error: setErr } = await ssrClient.auth.setSession({
    access_token: otpData.session.access_token,
    refresh_token: otpData.session.refresh_token,
  });

  if (setErr) {
    console.error('[Google OAuth] setSession failed:', setErr);
    return fail('google_session');
  }

  return response;
}
