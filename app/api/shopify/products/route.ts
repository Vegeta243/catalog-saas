import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const PRODUCTS_QUERY = `
  query getProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          descriptionHtml
          vendor
          productType
          tags
          status
          createdAt
          updatedAt
          images(first: 5) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 5) {
            edges {
              node {
                id
                price
                sku
                inventoryManagement
              }
            }
          }
        }
      }
    }
  }
`;

function gidToId(gid: string): string {
  const match = gid.match(/gid:\/\/shopify\/\w+\/(\d+)/);
  return match ? match[1] : gid;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Get user's active shop
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('shop_domain, access_token')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ 
        products: [],
        message: 'Aucune boutique connectée'
      });
    }

    const { shop_domain, access_token } = shop;

    if (!access_token) {
      return NextResponse.json({ 
        products: [],
        message: 'Token Shopify manquant'
      });
    }

    // Query Shopify API
    const shopifyUrl = `https://${shop_domain}/admin/api/2024-01/graphql.json`;
    
    const response = await fetch(shopifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': access_token,
      },
      body: JSON.stringify({
        query: PRODUCTS_QUERY,
        variables: { first: 50 },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Shopify API error:', error);
      return NextResponse.json({ 
        products: [],
        error: 'Erreur connexion Shopify'
      });
    }

    const data = await response.json();
    
    // Normalize products
    const products = data.data?.products?.edges?.map((edge: any) => {
      const node = edge.node;
      return {
        id: parseInt(gidToId(node.id), 10),
        title: node.title,
        body_html: node.descriptionHtml,
        vendor: node.vendor,
        product_type: node.productType,
        tags: Array.isArray(node.tags) ? node.tags.join(',') : '',
        status: node.status?.toLowerCase() || 'draft',
        created_at: node.createdAt,
        updated_at: node.updatedAt,
        images: node.images?.edges?.map((img: any) => ({
          id: parseInt(gidToId(img.node.id), 10),
          src: img.node.url,
          alt: img.node.altText || node.title,
        })) || [],
        variants: node.variants?.edges?.map((v: any) => ({
          id: parseInt(gidToId(v.node.id), 10),
          price: v.node.price,
          sku: v.node.sku,
          inventory_management: v.node.inventoryManagement,
        })) || [],
      };
    }) || [];

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ 
      products: [],
      error: error instanceof Error ? error.message : 'Erreur serveur'
    }, { status: 500 });
  }
}
