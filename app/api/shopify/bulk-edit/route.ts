import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(req: Request) {
  try {
    const { productIds, field, value } = await req.json();

    if (!productIds || !field || value === undefined) {
      return NextResponse.json({ error: "Données manquantes." }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

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

    const results = await Promise.all(
      productIds.map(async (id: string) => {
        const body: Record<string, unknown> = {};

        if (field === "title") body.title = value;
        else if (field === "body_html") body.body_html = value;
        else if (field === "tags") body.tags = value;
        else if (field === "status") body.status = value;
        else if (field === "metafields_global_title_tag") body.metafields_global_title_tag = value;
        else if (field === "metafields_global_description_tag") body.metafields_global_description_tag = value;

        const response = await fetch(
          `https://${shop_domain}/admin/api/2026-01/products/${id}.json`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": access_token,
            },
            body: JSON.stringify({ product: body }),
          }
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            return NextResponse.json({
              error: 'Votre connexion Shopify a expiré. Veuillez reconnecter votre boutique.',
              code: 'SHOPIFY_TOKEN_EXPIRED',
              reconnect_url: '/dashboard/shops'
            }, { status: 401 });
          }
          const err = await response.text();
          throw new Error(`Erreur Shopify pour le produit ${id}: ${err}`);
        }

        return response.json();
      })
    );

    return NextResponse.json({ success: true, updated: results.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Alias POST → PUT pour compatibilité ascendante
export { PUT as POST };
