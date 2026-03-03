import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');

  if (!code || !shop || !hmac) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // Verify HMAC
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
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 403 });
  }

  // Exchange code for token
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  const { access_token } = await res.json();

  // Save to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await supabase
    .from('shops')
    .upsert({ shop_domain: shop, access_token }, { onConflict: 'shop_domain' });
  if (error) {
    return NextResponse.json({ error: 'DB error', details: error.message }, { status: 500 });
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`);
}