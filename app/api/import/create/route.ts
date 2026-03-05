import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { products } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Aucun produit à importer." }, { status: 400 });
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
      products.map(async (product: { title: string; description: string; imageUrl: string; price: string }) => {
        try {
          const newProduct: Record<string, unknown> = {
            title: product.title,
            body_html: product.description || "",
            status: "draft",
            variants: [{ price: product.price }],
          };

          if (product.imageUrl) {
            newProduct.images = [{ src: product.imageUrl }];
          }

          const res = await fetch(
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

          if (!res.ok) {
            return { success: false, title: product.title, error: "Échec de l'import" };
          }

          const data = await res.json();
          return { success: true, title: product.title, id: data.product?.id };
        } catch {
          return { success: false, title: product.title, error: "Erreur réseau" };
        }
      })
    );

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: { total: results.length, succeeded, failed },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
