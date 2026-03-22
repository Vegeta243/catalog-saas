import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');
  const state = searchParams.get('state');
  const host = searchParams.get('host'); // base64-encoded host, provided for embedded apps

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // ── Helper: redirect to the right error destination based on origin ──
  const source = request.cookies.get('shopify_oauth_source')?.value;
  const isDashboard = source === 'dashboard' || !host;

  function errorRedirect(errCode: string): NextResponse {
    const dest = isDashboard
      ? `${siteUrl}/dashboard/shops?error=${errCode}`
      : `${siteUrl}/shopify-embed?error=${errCode}`;
    const res = NextResponse.redirect(dest);
    res.cookies.delete('shopify_oauth_nonce');
    res.cookies.delete('shopify_oauth_shop');
    res.cookies.delete('shopify_oauth_source');
    res.cookies.delete('shopify_oauth_uid');
    return res;
  }

  if (!code || !shop) {
    console.error('[Shopify OAuth callback] Missing code or shop params');
    return errorRedirect('missing_params');
  }

  // ── CSRF / nonce check ──
  const storedNonce = request.cookies.get('shopify_oauth_nonce')?.value;
  const storedShop  = request.cookies.get('shopify_oauth_shop')?.value;
  if (state && storedNonce && state !== storedNonce) {
    console.error('[Shopify OAuth callback] CSRF nonce mismatch');
    return errorRedirect('csrf');
  }
  if (storedShop && storedShop !== shop) {
    console.error('[Shopify OAuth callback] Shop mismatch:', storedShop, '!=', shop);
    return errorRedirect('shop_mismatch');
  }

  // ── HMAC verification ──
  // Wrapped in try-catch to prevent a crash when SHOPIFY_API_SECRET is not set
  const apiSecret = process.env.SHOPIFY_API_SECRET?.trim();
  if (hmac && apiSecret) {
    try {
      const params = Object.fromEntries(searchParams);
      delete params.hmac;
      const message = Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&');
      const generated = crypto
        .createHmac('sha256', apiSecret)
        .update(message)
        .digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(generated, 'hex'), Buffer.from(hmac, 'hex'))) {
        console.error('[Shopify OAuth callback] HMAC mismatch — possible forgery');
        return errorRedirect('invalid_hmac');
      }
    } catch (e) {
      console.error('[Shopify OAuth callback] HMAC verification threw:', e);
      return errorRedirect('hmac_error');
    }
  } else if (!apiSecret) {
    console.warn('[Shopify OAuth callback] SHOPIFY_API_SECRET not configured — skipping HMAC check');
  }

  // ── Exchange code for access token ──
  const apiKey = process.env.SHOPIFY_API_KEY?.trim();
  if (!apiKey || !apiSecret) {
    console.error('[Shopify OAuth callback] Missing SHOPIFY_API_KEY or SHOPIFY_API_SECRET');
    return errorRedirect('config_missing');
  }

  let access_token: string | null = null;
  let scope = '';
  try {
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[Shopify OAuth callback] Token exchange failed:', tokenRes.status, errText);
      return errorRedirect('token_exchange');
    }
    const tokenData = await tokenRes.json();
    access_token = tokenData.access_token || null;
    scope = tokenData.scope || '';
  } catch (e) {
    console.error('[Shopify OAuth callback] Token exchange network error:', e);
    return errorRedirect('token_exchange');
  }

  if (!access_token) {
    console.error('[Shopify OAuth callback] No access_token in Shopify response');
    return errorRedirect('no_token');
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

  // ── Resolve authenticated user ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  let userId: string | null = null;

  // Attempt 1: read from Supabase session cookie
  try {
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    userId = user?.id || null;
  } catch { /* non-fatal */ }

  // Attempt 2: uid cookie stored during OAuth initiation
  if (!userId) {
    userId = request.cookies.get('shopify_oauth_uid')?.value || null;
  }

  // Attempt 3: look up existing shop row in DB
  if (!userId) {
    try {
      const svc = createClient(supabaseUrl, serviceKey);
      const { data: existingShop } = await svc
        .from('shops')
        .select('user_id')
        .eq('shop_domain', shop)
        .maybeSingle();
      userId = existingShop?.user_id || null;
    } catch { /* non-fatal */ }
  }

  if (!userId) {
    console.error('[Shopify OAuth callback] Could not resolve userId — redirecting to login');
    return NextResponse.redirect(`${siteUrl}/login?error=auth&reason=shopify_oauth`);
  }

  // ── Block if shop already belongs to a DIFFERENT user ──
  try {
    const supabaseCheck = createClient(supabaseUrl, serviceKey);
    const { data: shopOwner } = await supabaseCheck
      .from('shops')
      .select('user_id')
      .eq('shop_domain', shop)
      .eq('is_active', true)
      .maybeSingle();

    if (shopOwner && shopOwner.user_id !== userId) {
      console.warn(`[Shopify OAuth] Shop ${shop} already belongs to ${shopOwner.user_id}, blocking for ${userId}`);
      return NextResponse.redirect(
        `${siteUrl}/dashboard/shops?error=already_connected&shop=${encodeURIComponent(shop)}`
      );
    }
  } catch { /* non-fatal — allow flow to continue */ }

  // ── Save to Supabase ──
  const supabase = createClient(supabaseUrl, serviceKey);

  // Core fields guaranteed to exist in the shops table
  const coreData: Record<string, unknown> = {
    user_id: userId,
    shop_domain: shop,
    access_token,
    shop_name: shopName,
    is_active: true,
    scopes: scope,
  };

  const { error: upsertError } = await supabase
    .from('shops')
    .upsert(coreData, { onConflict: 'user_id,shop_domain' });

  if (upsertError) {
    console.error('[Shopify OAuth callback] Supabase upsert error:', upsertError.message);
    // Retry with absolute minimum fields
    const { error: retryError } = await supabase
      .from('shops')
      .upsert(
        { user_id: userId, shop_domain: shop, access_token, shop_name: shopName, is_active: true },
        { onConflict: 'user_id,shop_domain' },
      );
    if (retryError) {
      console.error('[Shopify OAuth callback] Retry upsert also failed:', retryError.message);
      return errorRedirect('save_failed');
    }
  }

  // ── Success ──
  const successUrl = isDashboard
    ? `${siteUrl}/dashboard/shops?connected=1`
    : `${siteUrl}/shopify-embed?shop=${shop}&host=${host}`;

  const response = NextResponse.redirect(successUrl);
  response.cookies.delete('shopify_oauth_nonce');
  response.cookies.delete('shopify_oauth_shop');
  response.cookies.delete('shopify_oauth_source');
  response.cookies.delete('shopify_oauth_uid');
  return response;
}
