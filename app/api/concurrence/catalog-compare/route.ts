import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export async function POST(request: NextRequest) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await request.json();
  const { competitor_id, my_products, competitor_snapshot } = body;

  if (!competitor_id) return NextResponse.json({ error: "competitor_id requis." }, { status: 400 });

  const { data: comp } = await supabase
    .from("competitors")
    .select("name, url")
    .eq("id", competitor_id)
    .eq("user_id", user.id)
    .single();

  if (!comp) return NextResponse.json({ error: "Concurrent introuvable." }, { status: 404 });

  const compProducts = competitor_snapshot?.products || [];
  const myProductList = Array.isArray(my_products) ? my_products : [];

  const prompt = `Tu es un expert e-commerce. Analyse les gaps de catalogue entre deux boutiques.

MA BOUTIQUE:
${myProductList.slice(0, 20).join("\n") || "Produits non fournis"}

CONCURRENT: ${comp.name}
${compProducts.slice(0, 20).map((p: { title: string; price?: number }) => `- ${p.title}${p.price ? ` (${p.price}€)` : ""}`).join("\n") || "Produits non disponibles"}

Réponds en JSON avec ces clés:
{
  "missing_categories": ["catégories que le concurrent a et pas moi (max 4)"],
  "unique_to_me": ["catégories que j'ai et pas le concurrent (max 3)"],
  "price_positioning": "string décrivant le positionnement prix (ex: Le concurrent est 15% moins cher en moyenne)",
  "recommendations": ["3 recommandations d'ajout produit prioritaires"],
  "opportunity_score": 0-100
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 600,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      missing_categories: ["Comparez vos catalogues manuellement"],
      unique_to_me: ["Identifiez vos produits différenciants"],
      price_positioning: `Le concurrent propose ${compProducts.length} produits détectés`,
      recommendations: [
        "Analysez les best-sellers du concurrent",
        "Identifiez les produits manquants dans votre catalogue",
        "Ajoutez des produits complémentaires à votre catalogue actuel",
      ],
      opportunity_score: 60,
      error: "Fallback (OpenAI indisponible)",
    });
  }
}
