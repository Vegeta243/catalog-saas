import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import {
  shopifyQuery,
  ShopifyTokenExpiredError,
  UPDATE_METAFIELD_MUTATION,
  PRODUCT_VARIANTS_BULK_UPDATE,
  toGid,
  gidToId,
} from "@/lib/shopify-graphql";

const TOKEN_EXPIRED = {
  error: "Votre connexion Shopify a expire. Veuillez reconnecter votre boutique.",
  code: "SHOPIFY_TOKEN_EXPIRED",
  reconnect_url: "/dashboard/shops",
};

const NODES_QUERY = `
  query Nodes($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        variants(first: 100) {
          edges {
            node {
              id
              price
            }
          }
        }
      }
    }
  }
`;

const metaUpdateSchema = z.object({
  productIds: z.array(z.string()).min(1).max(250),
  updates: z.object({
    metaTitle: z.string().max(70).optional(),
    metaDescription: z.string().max(320).optional(),
  }),
});

const priceUpdateSchema = z.object({
  productIds: z.array(z.string()).min(1).max(250),
  newPrice: z.string().optional(),
  mode: z.enum(["fixed", "percent", "multiply", "per_product"]).default("fixed"),
  pricesMap: z.record(z.string(), z.string()).optional(),
});

interface NodesData {
  nodes: Array<{
    id: string;
    variants: { edges: { node: { id: string; price: string } }[] };
  } | null>;
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifie." }, { status: 401 });

    const rl = await checkRateLimit(user.id, "shopify.bulk");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de requetes. Reessayez dans un moment." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }

    const body = await req.json();

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
      if (shopError || !shop) return NextResponse.json({ error: "Boutique non connectee." }, { status: 400 });

      const { shop_domain, access_token } = shop;

      const metaResults = await Promise.all(
        productIds.map(async (productId: string) => {
          const gid = toGid("Product", productId);
          const metafields = [
            updates.metaTitle && {
              ownerId: gid,
              namespace: "global",
              key: "title_tag",
              value: updates.metaTitle,
              type: "single_line_text_field",
            },
            updates.metaDescription && {
              ownerId: gid,
              namespace: "global",
              key: "description_tag",
              value: updates.metaDescription,
              type: "multi_line_text_field",
            },
          ].filter(Boolean);

          try {
            await shopifyQuery(shop_domain, access_token, UPDATE_METAFIELD_MUTATION, { metafields });
            return { id: productId, success: true };
          } catch {
            return { id: productId, success: false };
          }
        })
      );

      return NextResponse.json({ success: true, results: metaResults, updated: metaResults.filter((r) => r.success).length });
    }

    const parsed = priceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { productIds, newPrice, mode, pricesMap } = parsed.data;

    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (shopError || !shop) return NextResponse.json({ error: "Boutique non connectee." }, { status: 400 });

    const { shop_domain, access_token } = shop;

    const productGids = productIds.map((id: string) => toGid("Product", id));
    const nodesData = await shopifyQuery<NodesData>(shop_domain, access_token, NODES_QUERY, { ids: productGids });

    const productVariantUpdates: Record<string, { id: string; price: string }[]> = {};

    for (const node of nodesData.nodes) {
      if (!node) continue;
      const numericProductId = gidToId(node.id);
      const variantUpdates: { id: string; price: string }[] = [];

      for (const edge of node.variants.edges) {
        const variantGid = edge.node.id;
        const currentPrice = parseFloat(edge.node.price);
        let targetPrice: number;

        if (mode === "per_product" && pricesMap) {
          const val = pricesMap[numericProductId];
          if (!val) continue;
          targetPrice = parseFloat(val);
        } else if (mode === "fixed") {
          targetPrice = parseFloat(newPrice ?? "0");
        } else if (mode === "percent") {
          targetPrice = currentPrice * (1 + parseFloat(newPrice ?? "0") / 100);
        } else if (mode === "multiply") {
          targetPrice = currentPrice * parseFloat(newPrice ?? "1");
        } else {
          targetPrice = currentPrice;
        }

        variantUpdates.push({ id: variantGid, price: targetPrice.toFixed(2) });
      }

      if (variantUpdates.length > 0) {
        productVariantUpdates[node.id] = variantUpdates;
      }
    }

    const results = await Promise.all(
      Object.entries(productVariantUpdates).map(async ([productGid, variants]) => {
        return shopifyQuery(shop_domain, access_token, PRODUCT_VARIANTS_BULK_UPDATE, {
          productId: productGid,
          variants: variants.map((v) => ({ id: v.id, price: v.price })),
        });
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
  } catch (err) {
    if (err instanceof ShopifyTokenExpiredError) {
      return NextResponse.json(TOKEN_EXPIRED, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export { PUT as POST };