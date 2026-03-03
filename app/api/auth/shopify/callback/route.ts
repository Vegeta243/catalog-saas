import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');
  const hmac = searchParams.get('hmac');

  if (!code || !shop || !hmac) {
    console.error('Missing required parameters:', { code, shop, hmac });
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    // Verify HMAC
    const params = Object.fromEntries(searchParams);
    delete params.hmac;
    const message = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const generatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
      .update(message)
      .digest('hex');

    if (generatedHmac !== hmac) {
      console.error('HMAC verification failed:', { generatedHmac, hmac });
      return NextResponse.json({ error: 'Invalid HMAC' }, { status: 403 });
    }

    // Exchange code for access token
    const accessTokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

    if (!accessTokenResponse.ok) {
      const errorText = await accessTokenResponse.text();
      console.error('Failed to fetch access token:', { status: accessTokenResponse.status, errorText });
      return NextResponse.json({ error: 'Failed to fetch access token' }, { status: 500 });
    }

    const { access_token } = await accessTokenResponse.json();

    // Save to Supabase using service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from('shops').upsert(
      {
        shop_domain: shop,
        access_token,
      },
      {
        onConflict: 'shop_domain',
      }
    );

    if (error) {
      console.error('Failed to save shop to database:', error.message);
      return NextResponse.json({ error: 'Failed to save shop to database', details: error.message }, { status: 500 });
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`);
  } catch (err) {
    console.error('Unexpected error in Shopify callback:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}