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
      const metaTitles = products.map((p: { id: string; title: string }) => ({
        id: p.id,
        metaTitle: `${p.title.slice(0, 50)} — Livraison rapide`,
        demo: true,
      }));
      return NextResponse.json({ metaTitles, demo: true });
    }

    const metaTitles: { id: string; metaTitle: string }[] = [];

    for (const product of products) {
      try {
        const prompt = `Generate an SEO meta title in French for this e-commerce product.
Product: "${product.title}"
Description: "${(product.description || "").replace(/<[^>]*>/g, "").slice(0, 200)}"
Rules:
- Maximum 60 characters
- Include main keyword naturally
- Compelling and click-worthy
- No clickbait
- Format: just the meta title text, nothing else`;

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 80,
            temperature: 0.7,
          }),
        });

        if (!res.ok) continue;
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim() || "";
        if (text) {
          metaTitles.push({ id: product.id, metaTitle: text.slice(0, 70) });
        }
      } catch { /* continue */ }
    }

    return NextResponse.json({ metaTitles });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
