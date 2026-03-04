import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { shopifyCache, shopifyCacheKey } from '@/lib/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { parse } from 'url';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') || '50';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('shop_domain, access_token, user_id')
      .single();

    if (error || !shop) {
      console.error('Failed to fetch shop:', error?.message);
      return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
    }

    const { shop_domain, access_token, user_id } = shop;

    const rateResult = checkRateLimit(user_id || 'anonymous', 'shopify.products');
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        { status: 429, headers: getRateLimitHeaders(rateResult) }
      );
    }

    const cacheKey = shopifyCacheKey(shop_domain, 'products', { limit });
    const cached = shopifyCache.get(cacheKey);
    if (cached) {
      return NextResponse.json({ ...cached as object, cached: true });
    }

    let products = [];
    let nextPageUrl = `https://${shop_domain}/admin/api/2026-01/products.json?limit=${limit}&fields=id,title,body_html,vendor,product_type,tags,status,variants,images,created_at,updated_at`;

    while (nextPageUrl) {
      const response = await fetch(nextPageUrl, {
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

      const data = await response.json();
      products = products.concat(data.products);

      // Check for next page in Link header
      const linkHeader = response.headers.get('link');
      const nextLinkMatch = linkHeader?.match(/<([^>]+)>; rel="next"/);
      nextPageUrl = nextLinkMatch ? nextLinkMatch[1] : null;
    }

    // Cache results for 5 minutes
    shopifyCache.set(cacheKey, { products });

    return NextResponse.json({ products });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}