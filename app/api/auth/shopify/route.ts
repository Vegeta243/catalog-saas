import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createServerClient } from '@supabase/ssr';

// Scopes required by EcomPilot
const SCOPES = [
  'read_products',
  'write_products',
  'read_inventory',
  'write_inventory',
  'read_price_rules',
  'write_price_rules',
  'read_product_listings',
  'read_orders',           // for analytics
  'read_analytics',
].join(',');

function sanitizeShopDomain(shop: string): string {
  // Ensure it ends with .myshopify.com
  const cleaned = shop.replace(/https?:\/\//, '').replace(/\/$/, '');
  if (!cleaned.includes('.')) return cleaned + '.myshopify.com';
  return cleaned;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawShop = searchParams.get('shop');

  if (!rawShop) {
    return NextResponse.json({ error: 'Paramètre shop manquant' }, { status: 400 });
  }

  const shop = sanitizeShopDomain(rawShop);

  // Validate shop domain format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/.test(shop)) {
    return NextResponse.json({ error: 'Domaine shop invalide' }, { status: 400 });
  }

  // Generate nonce (state) for CSRF protection
  const nonce = crypto.randomBytes(16).toString('hex');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectUri = `${siteUrl}/api/auth/shopify/callback`;

  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  if (!apiKey) {
    console.error('[Shopify OAuth] SHOPIFY_API_KEY is not configured!');
    return NextResponse.json({ error: 'Configuration serveur manquante (SHOPIFY_API_KEY). Contactez le support.' }, { status: 500 });
  }

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', apiKey);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', nonce);
  // NOTE: Do NOT use per-user (online) tokens — they expire. Use offline persistent tokens.

  const response = NextResponse.redirect(authUrl.toString());
  // Store nonce in cookie for callback CSRF check (15 min expiry)
  response.cookies.set('shopify_oauth_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 900,
    path: '/',
  });
  response.cookies.set('shopify_oauth_shop', shop, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 900,
    path: '/',
  });

  // Mark as dashboard-initiated so callback redirects back to dashboard
  response.cookies.set('shopify_oauth_source', 'dashboard', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 900,
    path: '/',
  });

  // Store current user ID as backup (in case session cookie isn't readable in callback)
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll() {},
        },
      },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      response.cookies.set('shopify_oauth_uid', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 900,
        path: '/',
      });
    }
  } catch { /* non-fatal */ }

  return response;
}