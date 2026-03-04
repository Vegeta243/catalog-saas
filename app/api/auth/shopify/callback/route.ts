import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');
  const state = searchParams.get('state');
  const host = searchParams.get('host'); // base64-encoded host, provided for embedded apps

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!code || !shop || !hmac) {
    return NextResponse.redirect(`${siteUrl}/shopify-embed?error=missing_params`);
  }

  // ── CSRF / nonce check ──
  const storedNonce = request.cookies.get('shopify_oauth_nonce')?.value;
  const storedShop  = request.cookies.get('shopify_oauth_shop')?.value;
  if (state && storedNonce && state !== storedNonce) {
    return NextResponse.redirect(`${siteUrl}/shopify-embed?error=csrf`);
  }
  if (storedShop && storedShop !== shop) {
    return NextResponse.redirect(`${siteUrl}/shopify-embed?error=shop_mismatch`);
  }

  // ── HMAC verification ──
  const params = Object.fromEntries(searchParams);
  delete params.hmac;
  const message = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  const generated = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(message)
    .digest('hex');
  if (generated !== hmac) {
    return NextResponse.redirect(`${siteUrl}/shopify-embed?error=invalid_hmac`);
  }

  // ── Exchange code for access token ──
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(`${siteUrl}/shopify-embed?error=token_exchange`);
  }
  const tokenData = await tokenRes.json();
  const { access_token, associated_user, scope } = tokenData;

  if (!access_token) {
    return NextResponse.redirect(`${siteUrl}/shopify-embed?error=no_token`);
  }

  // ── Fetch shop info from Shopify ──
  let shopName = shop;
  try {
    const shopRes = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: { 'X-Shopify-Access-Token': access_token },
    });
    if (shopRes.ok) {
      const { shop: shopData } = await shopRes.json();
      shopName = shopData?.name || shop;
    }
  } catch { /* non-fatal */ }

  // ── Save to Supabase ──
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: upsertError } = await supabase
    .from('shops')
    .upsert({
      shop_domain: shop,
      access_token,
      shop_name: shopName,
      is_active: true,
      scopes: scope || '',
      last_sync_at: new Date().toISOString(),
      shopify_user_id: associated_user?.id?.toString() || null,
      shopify_user_email: associated_user?.email || null,
    }, { onConflict: 'shop_domain' });

  if (upsertError) {
    console.error('Supabase upsert error:', upsertError.message);
    // Non-fatal — redirect anyway
  }

  // ── Clear OAuth cookies ──
  const redirectUrl = host
    ? `${siteUrl}/shopify-embed?shop=${shop}&host=${host}`
    : `${siteUrl}/dashboard`;

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete('shopify_oauth_nonce');
  response.cookies.delete('shopify_oauth_shop');
  return response;
}