import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const schema = z.object({
  type: z.enum(["title", "description"]),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  price: z.string().optional(),
  product_type: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const rl = checkRateLimit(user.id, "ai.generate");
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans un moment." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      );
    }

    const { id: productId } = await params;

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { type, title, description, price, product_type } = parsed.data;
    const cleanDescription = (description || "").replace(/<[^>]*>/g, "").trim();
    const apiKey = process.env.OPENAI_API_KEY;

    // Demo mode
    if (!apiKey || apiKey.startsWith("sk-DEMO") || apiKey.startsWith("sk-test")) {
      const demoTitle = `${title.slice(0, 45)} — Livraison rapide`;
      const demoDesc = `Découvrez ${title.slice(0, 30)}. Qualité premium, livraison rapide. Commandez et profitez de nos offres exclusives.`;
      return NextResponse.json({
        generated: type === "title" ? demoTitle.slice(0, 60) : demoDesc.slice(0, 160),
        demo: true,
      });
    }

    const prompt =
      type === "title"
        ? `Tu es un expert SEO e-commerce.
Génère un meta titre optimisé pour ce produit Shopify.

Produit : ${title}
Description : ${cleanDescription.slice(0, 300)}
Catégorie : ${product_type || "E-commerce"}

Règles STRICTES :
- Maximum 60 caractères (compte exactement)
- Inclure le mot-clé principal du produit
- Être accrocheur et incitatif au clic
- Pas de majuscules inutiles
- Format : [Mot-clé principal] — [Bénéfice] | [Marque]

Retourne UNIQUEMENT le meta titre, rien d'autre.
Pas d'explication, pas de guillemets.`
        : `Tu es un expert SEO e-commerce.
Génère une meta description optimisée pour ce produit.

Produit : ${title}
Description : ${cleanDescription.slice(0, 500)}
Prix : ${price || "N/A"}€
Catégorie : ${product_type || "E-commerce"}

Règles STRICTES :
- Entre 140 et 160 caractères (compte exactement)
- Inclure le mot-clé principal naturellement
- Mentionner 1-2 bénéfices concrets
- Inclure un appel à l'action (Découvrez, Commandez...)
- Ne pas commencer par "Ce produit..."

Retourne UNIQUEMENT la meta description.
Pas d'explication, pas de guillemets.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: type === "title" ? 100 : 220,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("OpenAI error:", err);
      return NextResponse.json({ error: "Erreur OpenAI" }, { status: 502 });
    }

    const data = await res.json();
    let generated = data.choices?.[0]?.message?.content?.trim() || "";

    // Strip surrounding quotes if present
    generated = generated.replace(/^["«»]+|["«»]+$/g, "").trim();

    // Enforce max length
    const maxLen = type === "title" ? 60 : 160;
    if (generated.length > maxLen + 15) {
      // Try to cut at a word boundary within maxLen
      generated = generated.slice(0, maxLen).replace(/\s+\S*$/, "").trim();
    }

    // Auto-save to Shopify metafields
    const { data: shop } = await supabase
      .from("shops")
      .select("shop_domain, access_token")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (shop) {
      const metafieldKey = type === "title" ? "title_tag" : "description_tag";
      const metafieldType = type === "title" ? "single_line_text_field" : "multi_line_text_field";
      await fetch(
        `https://${shop.shop_domain}/admin/api/2026-01/products/${productId}.json`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": shop.access_token,
          },
          body: JSON.stringify({
            product: {
              id: productId,
              metafields: [
                {
                  namespace: "global",
                  key: metafieldKey,
                  value: generated,
                  type: metafieldType,
                },
              ],
            },
          }),
        }
      ).catch(() => { /* non-blocking: Shopify sync failure shouldn't break the response */ });
    }

    return NextResponse.json({ generated });
  } catch (error) {
    console.error("generate-seo error:", error);
    return NextResponse.json({ error: "Erreur génération IA" }, { status: 500 });
  }
}
