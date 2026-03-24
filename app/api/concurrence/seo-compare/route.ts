import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const { competitor_id, my_keywords, competitor_snapshot } = body;

  if (!competitor_id) return NextResponse.json({ error: "competitor_id requis." }, { status: 400 });

  // Verify competitor ownership
  const { data: comp } = await supabase
    .from("competitors")
    .select("name, url")
    .eq("id", competitor_id)
    .eq("user_id", user.id)
    .single();

  if (!comp) return NextResponse.json({ error: "Concurrent introuvable." }, { status: 404 });

  // Build SEO context from snapshot
  const seoData = competitor_snapshot?.seo || {};
  const products = competitor_snapshot?.products || [];

  const prompt = `Tu es un expert SEO e-commerce. Compare le SEO d'un marchand et de son concurrent.

MARCHAND (moi):
- Mots-clés ciblés: ${my_keywords || "Non spécifié"}

CONCURRENT: ${comp.name} (${comp.url})
- Title tag: ${seoData.title_tag || "Non détecté"}
- Meta description: ${seoData.has_meta_description ? "Oui" : "Non"}
- Nb H1: ${seoData.h1_count ?? "?"}
- Produits: ${products.slice(0, 10).map((p: { title: string }) => p.title).join(", ") || "Non disponible"}

Réponds en JSON avec ces clés exactes:
{
  "competitor_strengths": ["liste de 3 points forts SEO du concurrent"],
  "my_opportunities": ["liste de 3 opportunités SEO pour moi"],
  "keyword_gaps": ["2-4 mots-clés que le concurrent cible et que je rate"],
  "quick_wins": ["2-3 actions SEO rapides à faire maintenant"],
  "score": {
    "competitor": 0-100,
    "me": 0-100
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 700,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch (e: unknown) {
    // Fallback without AI
    return NextResponse.json({
      competitor_strengths: [
        seoData.title_tag ? `Title tag optimisé: "${seoData.title_tag}"` : "Title tag non détecté",
        seoData.has_meta_description ? "Meta description présente" : "Meta description absente",
        `${seoData.h1_count || 0} balise(s) H1 détectée(s)`,
      ],
      my_opportunities: [
        "Optimiser vos balises title pour chaque page produit",
        "Ajouter des meta descriptions uniques",
        "Enrichir votre maillage interne",
      ],
      keyword_gaps: ["Comparez vos titres produits aux leurs pour identifier les gaps"],
      quick_wins: [
        "Vérifiez que chaque page produit a un title unique",
        "Ajoutez des balises alt à vos images produits",
      ],
      score: { competitor: 50, me: 50 },
      error: "Fallback (OpenAI indisponible)",
    });
  }
}
