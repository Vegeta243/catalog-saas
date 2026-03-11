import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const metaUpdateSchema = z.object({
  productIds: z.array(z.string()).min(1).max(250),
  updates: z.object({
    metaTitle: z.string().max(70).optional(),
    metaDescription: z.string().max(320).optional(),
  }),
});

const priceUpdateSchema = z.object({
  productIds: z.array(z.string()).min(1).max(250),
  newPrice: z.string(),
  mode: z.enum(["fixed", "percent", "multiply"]).default("fixed"),
});

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const rl = checkRateLimit(user.id, "shopify.bulk");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans un moment." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }

    const body = await req.json();

    // Handle meta field updates separately
    if (body.updates && (body.updates.metaTitle !== undefined || body.updates.metaDescription !== undefined)) {
      const parsed = metaUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
      }
      const { productIds, updates } = parsed.data;

      const { data: shop, error: shopError } = await supabase
        .from("shops")
        .select("shop_domain, access_token")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .single();
      if (shopError || !shop) {
        return NextResponse.json({ error: "Boutique non connectée." }, { status: 400 });
      }
      const { shop_domain, access_token } = shop;

      const metaResults = await Promise.all(
        productIds.map(async (productId: string) => {
          const metafields = [
            updates.metaTitle && {
              namespace: "global",
              key: "title_tag",
              value: updates.metaTitle,
              type: "single_line_text_field",
            },
            updates.metaDescription && {
              namespace: "global",
              key: "description_tag",
              value: updates.metaDescription,
              type: "multi_line_text_field",
            },
          ].filter(Boolean);

          const res = await fetch(
            `https://${shop_domain}/admin/api/2026-01/products/${productId}.json`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": access_token,
              },
              body: JSON.stringify({ product: { id: productId, metafields } }),
            }
          );
          return res.ok ? { id: productId, success: true } : { id: productId, success: false };
        })
      );

      return NextResponse.json({ success: true, results: metaResults, updated: metaResults.filter((r) => r.success).length });
    }

    const parsed = priceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { productIds, newPrice, mode } = parsed.data;

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
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

    await logAction(supabase, {
      userId: user.id,
      actionType: "bulk.edit",
      description: `Bulk edit : ${mode} sur ${productIds.length} produit(s)`,
      productsCount: productIds.length,
      creditsUsed: 0,
      details: { field: mode, newPrice },
    });

    return NextResponse.json({ success: true, results, updated: results.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Alias POST → PUT pour compatibilité ascendante
export { PUT as POST };