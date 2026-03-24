import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";
import {
  shopifyQuery,
  ShopifyTokenExpiredError,
  PRODUCTS_WITH_IMAGES_QUERY,
  shopifyRestRequest,
  gidToId,
} from "@/lib/shopify-graphql";

interface ProductsWithImagesData {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: {
      node: {
        id: string;
        title: string;
        images: { edges: { node: { id: string; url: string; altText: string | null } }[] };
      };
    }[];
  };
}

/* â”€â”€â”€ GET: list all product images from connected Shopify store â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifiÃ©" }, { status: 401 });

    const { data: shop } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!shop?.access_token) {
      return NextResponse.json({ products: [], message: "Boutique non connectÃ©e" });
    }
    const { shop_domain, access_token } = shop;

    // Fetch products with images via GraphQL (paginate up to 100 products)
    const allProducts: { productId: string; productTitle: string; images: { id: string; src: string; alt: string }[] }[] = [];
    let after: string | null = null;
    let hasNextPage = true;
    let fetched = 0;

    while (hasNextPage && fetched < 100) {
      // eslint-disable-next-line no-await-in-loop
      const result: ProductsWithImagesData = await shopifyQuery<ProductsWithImagesData>(shop_domain, access_token, PRODUCTS_WITH_IMAGES_QUERY, { first: 50, after });
      const data = result;

      for (const edge of data.products.edges) {
        const p = edge.node;
        const images = p.images.edges.map((ie) => ({
          id: gidToId(ie.node.id),
          src: ie.node.url,
          alt: ie.node.altText || p.title,
        }));
        if (images.length > 0) {
          allProducts.push({ productId: gidToId(p.id), productTitle: p.title, images });
        }
      }
      fetched += data.products.edges.length;
      hasNextPage = data.products.pageInfo.hasNextPage;
      after = data.products.pageInfo.endCursor;
    }

    return NextResponse.json({ products: allProducts });
  } catch (err) {
    if (err instanceof ShopifyTokenExpiredError) {
      return NextResponse.json({
        error: 'Votre connexion Shopify a expirÃ©. Veuillez reconnecter votre boutique.',
        code: 'SHOPIFY_TOKEN_EXPIRED',
        reconnect_url: '/dashboard/shops',
      }, { status: 401 });
    }
    console.error("GET /api/shopify/images:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/* â”€â”€â”€ POST: upload processed image back to a Shopify product â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifiÃ©" }, { status: 401 });

    const { data: shop } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!shop?.access_token) {
      return NextResponse.json({ error: "Boutique non connectÃ©e" }, { status: 400 });
    }

    const { shop_domain, access_token } = shop;
    const { productId, imageId, imageBase64, filename } = await request.json();

    if (!productId || !imageBase64) {
      return NextResponse.json({ error: "productId and imageBase64 required" }, { status: 400 });
    }

    const b64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;

    // Upload new image via REST (image attachment upload, GraphQL files API is more complex)
    const uploadData = await shopifyRestRequest(
      shop_domain,
      access_token,
      `/products/${productId}/images.json`,
      "POST",
      { image: { attachment: b64, filename: filename || "edited.jpg" } }
    );

    const newImageSrc: string = (uploadData.image as Record<string, unknown>)?.src as string || "";

    if (imageId) {
      await shopifyRestRequest(
        shop_domain,
        access_token,
        `/products/${productId}/images/${imageId}.json`,
        "DELETE"
      ).catch(() => { /* non-fatal */ });
    }

    await logAction(supabase, {
      userId: user.id,
      actionType: "image.upload",
      description: `Image Shopify mise a jour`,
      creditsUsed: 1,
      details: { productId, imageId },
    });

    return NextResponse.json({ success: true, newSrc: newImageSrc });
  } catch (err) {
    if (err instanceof ShopifyTokenExpiredError) {
      return NextResponse.json({
        error: "Votre connexion Shopify a expire. Veuillez reconnecter votre boutique.",
        code: "SHOPIFY_TOKEN_EXPIRED",
        reconnect_url: "/dashboard/shops",
      }, { status: 401 });
    }
    console.error("POST /api/shopify/images:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
