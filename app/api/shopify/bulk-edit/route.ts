import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PUT(req: Request) {
  try {
    const { productIds, field, value } = await req.json();

    if (!productIds || !field || value === undefined) {
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
