import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  shopifyQuery,
  ShopifyTokenExpiredError,
  PRODUCT_QUERY,
  CREATE_PRODUCT_MUTATION,
  toGid,
  gidToId,
} from "@/lib/shopify-graphql";

interface ProductData {
  product: {
    id: string; title: string; descriptionHtml: string; vendor: string;
    productType: string; tags: string[]; status: string;
    variants: { edges: { node: { id: string; price: string; sku: string | null; inventoryManagement: string | null } }[] };
  } | null;
}
interface CreateProductData {
  productCreate: {
    product: { id: string; title: string; handle: string; status: string } | null;
    userErrors: { field: string[]; message: string }[];
  };
}

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: "ID produit manquant." }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

    const { data: shop, error: shopError } = await supabase
      .from("shops").select("shop_domain, access_token")
      .eq("user_id", user.id).eq("is_active", true).limit(1).single();
    if (shopError || !shop) return NextResponse.json({ error: "Boutique non connectée." }, { status: 400 });

    const { shop_domain, access_token } = shop;

    // Fetch original product via GraphQL
    const productGid = toGid("Product", productId);
    const { product } = await shopifyQuery<ProductData>(shop_domain, access_token, PRODUCT_QUERY, { id: productGid });
    if (!product) return NextResponse.json({ error: "Impossible de récupérer le produit." }, { status: 404 });

    // Create duplicate via GraphQL
    const input = {
      title: `${product.title} (copie)`,
      descriptionHtml: product.descriptionHtml,
      vendor: product.vendor,
      productType: product.productType,
      tags: product.tags,
      status: "DRAFT",
      variants: product.variants.edges.map((e) => ({
        price: e.node.price,
        sku: e.node.sku ? `${e.node.sku}-copy` : undefined,
        inventoryManagement: e.node.inventoryManagement as "SHOPIFY" | "NOT_MANAGED" | null,
      })),
    };

    const { productCreate } = await shopifyQuery<CreateProductData>(shop_domain, access_token, CREATE_PRODUCT_MUTATION, { input });

    if (productCreate.userErrors.length > 0) {
      return NextResponse.json({ error: productCreate.userErrors.map((e) => e.message).join('; ') }, { status: 422 });
    }

    const created = productCreate.product;
    return NextResponse.json({
      success: true,
      product: {
        id: created ? parseInt(gidToId(created.id), 10) : null,
        title: created?.title,
        handle: created?.handle,
        status: created?.status,
      },
    });
  } catch (err) {
    if (err instanceof ShopifyTokenExpiredError) {
      return NextResponse.json({
        error: 'Votre connexion Shopify a expiré. Veuillez reconnecter votre boutique.',
        code: 'SHOPIFY_TOKEN_EXPIRED',
        reconnect_url: '/dashboard/shops',
      }, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
