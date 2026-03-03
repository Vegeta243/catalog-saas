import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const shop = searchParams.get('shop');

  if (!code || !shop) {
    return NextResponse.json({ error: 'Missing code or shop parameter' }, { status: 400 });
  }

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
    return NextResponse.json({ error: 'Failed to fetch access token' }, { status: 500 });
  }

  const { access_token } = await accessTokenResponse.json();

  const supabase = createClient();
  const { error } = await supabase.from('shops').insert({
    shop_domain: shop,
    access_token,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to save shop to database' }, { status: 500 });
  }

  return NextResponse.redirect('/dashboard');
}