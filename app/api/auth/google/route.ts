import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || `${new URL(request.url).protocol}//${new URL(request.url).host}`;
    return NextResponse.redirect(`${origin}/login?error=google_config`);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || `${new URL(request.url).protocol}//${new URL(request.url).host}`;
  const callbackUri = `${origin}/api/auth/google/callback`;

  // CSRF nonce
  const state = crypto.randomBytes(16).toString('hex');

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', callbackUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);
  googleAuthUrl.searchParams.set('access_type', 'online');
  googleAuthUrl.searchParams.set('prompt', 'select_account');

  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  response.cookies.set('google_oauth_redirect', redirectTo.slice(0, 200), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return response;
}
