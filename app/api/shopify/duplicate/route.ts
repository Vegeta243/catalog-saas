import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { productId } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: "ID produit manquant." }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: "Boutique non connectée." }, { status: 400 });
    }

    const { shop_domain, access_token } = shop;

    // Fetch the original product
    const getRes = await fetch(
      `https://${shop_domain}/admin/api/2026-01/products/${productId}.json`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": access_token,
        },
      }
    );

    if (!getRes.ok) {
      return NextResponse.json({ error: "Impossible de récupérer le produit." }, { status: 500 });
    }

    const { product } = await getRes.json();

    // Create a copy
    const newProduct = {
      title: `${product.title} (copie)`,
      body_html: product.body_html,
      vendor: product.vendor,
      product_type: product.product_type,
      tags: product.tags,
      status: "draft",
      variants: product.variants?.map((v: Record<string, unknown>) => ({
        price: v.price,
        sku: v.sku ? `${v.sku}-copy` : undefined,
        inventory_management: v.inventory_management,
      })),
    };

    const createRes = await fetch(
      `https://${shop_domain}/admin/api/2026-01/products.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": access_token,
        },
        body: JSON.stringify({ product: newProduct }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json({ error: `Erreur lors de la duplication: ${errText}` }, { status: 500 });
    }

    const created = await createRes.json();
    return NextResponse.json({ success: true, product: created.product });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
