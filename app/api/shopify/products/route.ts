import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get the current user's shop
    const { data: shop, error } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .single();

    if (error || !shop) {
      console.error('Failed to fetch shop:', error?.message);
      return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
    }

    const { shop_domain, access_token } = shop;

    // Fetch products from Shopify
    const response = await fetch(`https://${shop_domain}/admin/api/2026-01/products.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': access_token,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch products from Shopify:', errorText);
      return NextResponse.json({ error: 'Failed to fetch products from Shopify' }, { status: 500 });
    }

    const products = await response.json();
    return NextResponse.json(products);
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}