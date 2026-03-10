import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const { products } = await req.json();
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Liste de produits manquante." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    // Demo mode
    if (!apiKey || apiKey.startsWith("sk-DEMO") || apiKey.startsWith("sk-test")) {
      const metaDescriptions = products.map((p: { id: string; title: string }) => ({
        id: p.id,
        metaDescription: `Découvrez ${p.title}. Qualité premium, livraison rapide. Commandez maintenant et profitez de nos offres exclusives. Satisfait ou remboursé 30 jours.`,
        demo: true,
      }));
      return NextResponse.json({ metaDescriptions, demo: true });
    }

    const metaDescriptions: { id: string; metaDescription: string }[] = [];

    for (const product of products) {
      try {
        const prompt = `Generate an SEO meta description in French for this e-commerce product.
Product: "${product.title}"
Description: "${(product.description || "").replace(/<[^>]*>/g, "").slice(0, 300)}"
Rules:
- Between 140-160 characters exactly
- Include a call to action
- Include main keyword
- Describe the benefit to the customer
- Format: just the meta description text, nothing else`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 200,
            temperature: 0.7,
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "";
        if (text) {
          metaDescriptions.push({ id: product.id, metaDescription: text.slice(0, 170) });
        }
      } catch { /* continue */ }
    }

    return NextResponse.json({ metaDescriptions });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
