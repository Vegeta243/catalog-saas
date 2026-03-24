import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  shopifyQuery,
  ShopifyTokenExpiredError,
  UPDATE_PRODUCT_MUTATION,
  UPDATE_METAFIELD_MUTATION,
  toGid,
} from "@/lib/shopify-graphql";

const TOKEN_EXPIRED = {
  error: 'Votre connexion Shopify a expiré. Veuillez reconnecter votre boutique.',
  code: 'SHOPIFY_TOKEN_EXPIRED',
  reconnect_url: '/dashboard/shops',
};

export async function PUT(req: Request) {
  try {
    const { productIds, field, value } = await req.json();

    if (!productIds || !field || value === undefined) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

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

    const SEO_FIELDS: Record<string, { namespace: string; key: string; type: string }> = {
      metafields_global_title_tag: { namespace: "global", key: "title_tag", type: "single_line_text_field" },
      metafields_global_description_tag: { namespace: "global", key: "description_tag", type: "multi_line_text_field" },
    };

    const results = await Promise.all(
      (productIds as string[]).map(async (id: string) => {
        const gid = toGid("Product", id);

        if (field in SEO_FIELDS) {
          const { namespace, key, type } = SEO_FIELDS[field];
          await shopifyQuery(shop_domain, access_token, UPDATE_METAFIELD_MUTATION, {
            metafields: [{ ownerId: gid, namespace, key, value: String(value), type }],
          });
        } else {
          const inputMap: Record<string, unknown> = { id: gid };
          if (field === "title") inputMap.title = value;
          else if (field === "body_html") inputMap.descriptionHtml = value;
          else if (field === "tags") inputMap.tags = Array.isArray(value) ? value : (value as string).split(",").map((t: string) => t.trim());
          else if (field === "status") inputMap.status = (value as string).toUpperCase();
          await shopifyQuery(shop_domain, access_token, UPDATE_PRODUCT_MUTATION, { input: inputMap });
        }

        return { id, success: true };
      })
    );

    return NextResponse.json({ success: true, updated: results.length });
  } catch (err) {
    if (err instanceof ShopifyTokenExpiredError) {
      return NextResponse.json(TOKEN_EXPIRED, { status: 401 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// Alias POST → PUT pour compatibilité ascendante
export { PUT as POST };
