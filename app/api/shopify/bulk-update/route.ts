import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(req: Request) {
  try {
    const { productIds, newPrice, mode } = await req.json();

    if (!productIds || !newPrice) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
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
      return NextResponse.json({ error: "Boutique non connectée. Veuillez connecter votre boutique Shopify." }, { status: 400 });
    }

    const { shop_domain, access_token } = shop;

    // For percent mode, we need to first get current prices
    let priceUpdates: { id: string; price: string }[] = [];

    if (mode === "percent") {
      // Get current products to calculate new prices
      const productsRes = await fetch(
        `https://${shop_domain}/admin/api/2026-01/products.json?ids=${productIds.join(",")}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": access_token,
          },
        }
      );
      if (productsRes.ok) {
        const data = await productsRes.json();
        for (const product of data.products || []) {
          for (const variant of product.variants || []) {
            const currentPrice = parseFloat(variant.price);
            const percent = parseFloat(newPrice);
            const updatedPrice = (currentPrice * (1 + percent / 100)).toFixed(2);
            priceUpdates.push({ id: variant.id, price: updatedPrice });
          }
        }
      }
    } else if (mode === "multiply") {
      const productsRes = await fetch(
        `https://${shop_domain}/admin/api/2026-01/products.json?ids=${productIds.join(",")}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": access_token,
          },
        }
      );
      if (productsRes.ok) {
        const data = await productsRes.json();
        for (const product of data.products || []) {
          for (const variant of product.variants || []) {
            const currentPrice = parseFloat(variant.price);
            const multiplier = parseFloat(newPrice);
            const updatedPrice = (currentPrice * multiplier).toFixed(2);
            priceUpdates.push({ id: variant.id, price: updatedPrice });
          }
        }
      }
    } else {
      // Fixed price mode - apply to all variants of selected products
      const productsRes = await fetch(
        `https://${shop_domain}/admin/api/2026-01/products.json?ids=${productIds.join(",")}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": access_token,
          },
        }
      );
      if (productsRes.ok) {
        const data = await productsRes.json();
        for (const product of data.products || []) {
          for (const variant of product.variants || []) {
            priceUpdates.push({ id: variant.id, price: parseFloat(newPrice).toFixed(2) });
          }
        }
      }
    }

    // Apply all price updates in parallel
    const results = await Promise.all(
      priceUpdates.map(async ({ id, price }) => {
        const response = await fetch(
          `https://${shop_domain}/admin/api/2026-01/variants/${id}.json`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": access_token,
            },
            body: JSON.stringify({
              variant: { price },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur lors de la mise à jour du variant ${id}`);
        }

        return response.json();
      })
    );

    return NextResponse.json({ success: true, results, updated: results.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Alias POST → PUT pour compatibilité ascendante
export { PUT as POST };