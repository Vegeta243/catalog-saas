import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shopifyCache, shopifyCacheKey } from '@/lib/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = url.searchParams.get('limit') || '50';

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });
    }

    const { data: shop, error } = await supabase
      .from('shops')
      .select('shop_domain, access_token, user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !shop) {
      console.error('Failed to fetch shop:', error?.message);
      return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
    }

    const { shop_domain, access_token, user_id } = shop;

    if (!access_token) {
      return NextResponse.json({ products: [], message: 'Boutique connectée sans token — les produits ne peuvent pas être importés pour l\'instant.' });
    }

    const rateResult = await checkRateLimit(user_id || 'anonymous', 'shopify.products');
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

    const products: Record<string, unknown>[] = [];
    let nextPageUrl: string | null = `https://${shop_domain}/admin/api/2026-01/products.json?limit=${limit}&fields=id,title,body_html,vendor,product_type,tags,status,variants,images,created_at,updated_at`;

    while (nextPageUrl !== null) {
      const currentUrl: string = nextPageUrl;
      nextPageUrl = null;

      const response: Response = await fetch(currentUrl, {
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
      for (const p of data.products) {
        products.push(p as Record<string, unknown>);
      }

      // Check for next page in Link header
      const linkHeader: string | null = response.headers.get('link');
      if (linkHeader) {
        const nextLinkMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
        if (nextLinkMatch?.[1]) {
          nextPageUrl = nextLinkMatch[1];
        }
      }
    }

    // Cache results for 5 minutes
    shopifyCache.set(cacheKey, { products });

    return NextResponse.json({ products });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}