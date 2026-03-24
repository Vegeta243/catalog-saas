import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shopifyCache, shopifyCacheKey } from '@/lib/cache';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import {
  shopifyQuery,
  ShopifyTokenExpiredError,
  PRODUCTS_QUERY,
  gidToId,
} from '@/lib/shopify-graphql';

const TOKEN_EXPIRED_RESPONSE = {
  error: 'Votre connexion Shopify a expiré. Veuillez reconnecter votre boutique.',
  code: 'SHOPIFY_TOKEN_EXPIRED',
  reconnect_url: '/dashboard/shops',
};

interface GqlImage { id: string; url: string; altText: string | null }
interface GqlVariant { id: string; price: string; sku: string | null; inventoryManagement: string | null }
interface GqlProduct {
  id: string; title: string; descriptionHtml: string; vendor: string;
  productType: string; tags: string[]; status: string;
  createdAt: string; updatedAt: string;
  images: { edges: { node: GqlImage }[] };
  variants: { edges: { node: GqlVariant }[] };
}
interface ProductsData {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: { node: GqlProduct }[];
  };
}

function normalizeProduct(node: GqlProduct) {
  const numericId = parseInt(gidToId(node.id), 10);
  return {
    id: numericId,
    title: node.title,
    body_html: node.descriptionHtml,
    vendor: node.vendor,
    product_type: node.productType,
    tags: Array.isArray(node.tags) ? node.tags.join(',') : node.tags,
    status: node.status.toLowerCase(),
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    images: node.images.edges.map((e) => ({
      id: parseInt(gidToId(e.node.id), 10),
      src: e.node.url,
      alt: e.node.altText || node.title,
    })),
    variants: node.variants.edges.map((e) => ({
      id: parseInt(gidToId(e.node.id), 10),
      price: e.node.price,
      sku: e.node.sku,
      inventory_management: e.node.inventoryManagement,
    })),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
  const pageSize = Math.min(Math.max(limitParam, 1), 250);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 });

    const { data: shop, error } = await supabase
      .from('shops')
      .select('shop_domain, access_token, user_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (error || !shop) {
      return NextResponse.json({ error: 'Failed to fetch shop' }, { status: 500 });
    }
    const { shop_domain, access_token, user_id } = shop;

    if (!access_token) {
      return NextResponse.json({
        products: [],
        message: "Boutique connectée sans token — les produits ne peuvent pas être importés pour l'instant.",
      });
    }

    const rateResult = await checkRateLimit(user_id || 'anonymous', 'shopify.products');
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Réessayez dans quelques instants.' },
        { status: 429, headers: getRateLimitHeaders(rateResult) }
      );
    }

    const cacheKey = shopifyCacheKey(shop_domain, 'products-gql', { limit: String(pageSize) });
    const cached = shopifyCache.get(cacheKey);
    if (cached) return NextResponse.json({ ...(cached as object), cached: true });

    const products: ReturnType<typeof normalizeProduct>[] = [];
    let after: string | null = null;
    let hasNextPage = true;

    while (hasNextPage) {
      // eslint-disable-next-line no-await-in-loop
      const result: ProductsData = await shopifyQuery<ProductsData>(
        shop_domain,
        access_token,
        PRODUCTS_QUERY,
        { first: pageSize, after }
      );
      const data = result;
      for (const edge of data.products.edges) {
        products.push(normalizeProduct(edge.node));
      }
      hasNextPage = data.products.pageInfo.hasNextPage;
      after = data.products.pageInfo.endCursor;
    }

    shopifyCache.set(cacheKey, { products });
    return NextResponse.json({ products });
  } catch (err) {
    if (err instanceof ShopifyTokenExpiredError) {
      return NextResponse.json(TOKEN_EXPIRED_RESPONSE, { status: 401 });
    }
    console.error('Unexpected error in products route:', err);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}