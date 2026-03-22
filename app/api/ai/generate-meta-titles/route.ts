import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const schema = z.object({
  products: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
    })
  ).min(1).max(50),
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, "ai.generate");
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
    const { products } = parsed.data;

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
