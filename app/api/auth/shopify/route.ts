import { NextResponse } from 'next/server';
import crypto from 'crypto';

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

export async function GET(request: Request) {
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

  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set('client_id', process.env.SHOPIFY_API_KEY!);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', nonce);
  // Request online access token (per-user) for embedded apps
  authUrl.searchParams.set('grant_options[]', 'per-user');

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

  return response;
}