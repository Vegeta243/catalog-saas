import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { product, mode } = await req.json();

    if (!product) {
      return NextResponse.json({ error: "Produit manquant." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API OpenAI non configurée. Ajoutez OPENAI_API_KEY dans .env.local" }, { status: 500 });
    }

    let prompt = "";

    if (mode === "title") {
      prompt = `Tu es un expert SEO e-commerce. Génère un titre optimisé SEO pour ce produit Shopify. Le titre actuel est: "${product.title}". Le titre doit faire entre 50 et 70 caractères, être accrocheur et contenir des mots-clés pertinents. Réponds uniquement avec le nouveau titre, sans guillemets ni explication.`;
    } else if (mode === "tags") {
      prompt = `Tu es un expert SEO e-commerce. Génère exactement 10 tags pertinents pour ce produit Shopify. Titre: "${product.title}". Description: "${product.description || ""}". Réponds uniquement avec les tags séparés par des virgules, sans numérotation ni explication.`;
    } else {
      prompt = `Tu es un expert copywriter e-commerce. Pour ce produit Shopify:
Titre: "${product.title}"
Description actuelle: "${product.description || "Aucune"}"

Génère:
1. Un titre SEO optimisé (50-70 caractères)
2. Une description commerciale percutante (150-300 mots), structurée avec des puces HTML (<ul><li>)
3. 10 mots-clés SEO pertinents séparés par des virgules

Réponds en JSON avec ce format exact: {"title":"...","description":"...","keywords":"..."}`;
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Erreur OpenAI: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    if (mode === "title") {
      return NextResponse.json({ success: true, title: content });
    } else if (mode === "tags") {
      return NextResponse.json({ success: true, tags: content });
    } else {
      try {
        const parsed = JSON.parse(content);
        return NextResponse.json({ success: true, ...parsed });
      } catch {
        return NextResponse.json({ success: true, description: content });
      }
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
