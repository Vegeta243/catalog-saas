import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const schema = z.object({
  ids: z.array(z.string()).min(1).max(250),
});

export async function DELETE(req: Request) {
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

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { ids } = parsed.data;

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

    let deleted = 0;
    let errors = 0;

    // Sequential with small delay to respect Shopify rate limits
    for (const productId of ids) {
      try {
        const res = await fetch(
          `https://${shop_domain}/admin/api/2026-01/products/${productId}.json`,
          {
            method: "DELETE",
            headers: { "X-Shopify-Access-Token": access_token },
          }
        );
        if (res.ok || res.status === 404) {
          deleted++;
        } else {
          errors++;
        }
        // Respect Shopify rate limit (max 40 req/s on standard plan)
        if (ids.length > 5) {
          await new Promise((r) => setTimeout(r, 50));
        }
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ success: true, deleted, errors });
  } catch (error) {
    console.error("bulk delete error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression." }, { status: 500 });
  }
}
