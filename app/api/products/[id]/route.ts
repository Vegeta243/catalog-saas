import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: productId } = await params;

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

    const res = await fetch(
      `https://${shop_domain}/admin/api/2026-01/products/${productId}.json`,
      {
        method: "DELETE",
        headers: {
          "X-Shopify-Access-Token": access_token,
        },
      }
    );

    if (!res.ok && res.status !== 404) {
      const err = await res.text().catch(() => "");
      console.error("Shopify delete error:", res.status, err);
      return NextResponse.json({ error: "Erreur Shopify lors de la suppression." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("delete product error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
