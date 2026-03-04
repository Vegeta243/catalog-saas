import { NextResponse } from "next/server";
import { getCreditCost } from "@/lib/credits";

export async function POST(req: Request) {
  try {
    const { products, language = "fr" } = await req.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Produits manquants." }, { status: 400 });
    }

    if (products.length > 10) {
      return NextResponse.json({ error: "Maximum 10 produits par lot." }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Démo mode — descriptions simulées
      const mockDescriptions = products.map((p: { id: string; title: string }) => ({
        id: p.id,
        description: `<ul><li><strong>Produit populaire</strong> — ${p.title} est l'un de nos best-sellers apprécié par des milliers de clients.</li><li><strong>Fabrication de qualité</strong> — Matériaux sélectionnés pour leur durabilité et leur confort.</li><li><strong>Livraison rapide</strong> — Expédié sous 24h, livré en 48h en France métropolitaine.</li><li><strong>Satisfaction garantie</strong> — Retour gratuit sous 30 jours si vous nêtes pas satisfait.</li><li><strong>Support dédié</strong> — Notre équipe est disponible 7j/7 pour répondre à vos questions.</li></ul>`,
      }));
      return NextResponse.json({ success: true, demo: true, taskCost: 0, descriptions: mockDescriptions });
    }

    const taskCost = getCreditCost("ai.generate.description") * products.length;

    const productsList = products
      .map(
        (p: { id: string; title: string; description?: string; price?: string }, i: number) =>
          `Produit ${i + 1} (ID: ${p.id}):\n- Titre: "${p.title}"\n- Description actuelle: "${p.description || "Aucune"}"\n- Prix: ${p.price || "N/A"}€`
      )
      .join("\n\n");

    const prompt = `Tu es un expert copywriter e-commerce spécialisé Shopify. Génère des descriptions commerciales optimisées SEO pour ces ${products.length} produit(s).

${productsList}

Règles pour chaque description :
- 150 à 250 mots
- Structure avec des puces HTML (<ul><li>)
- Mets en avant les AVANTAGES, pas les caractéristiques techniques
- Ton professionnel mais engageant, qui donne envie d'acheter
- Inclure un appel à l'action subtil
- Optimisé pour le référencement naturel (SEO)

Langue: ${language}
Réponds UNIQUEMENT en JSON valide avec ce format exact, sans texte avant ni après :
[{"id":"...","description":"..."},...]`;

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
        max_tokens: Math.min(products.length * 500, 4000),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Erreur OpenAI: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    let results;
    try {
      // Handle potential markdown code fences
      const cleaned = content.replace(/^```json\s*\n?/i, "").replace(/\n?```\s*$/i, "");
      results = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Erreur de parsing de la réponse IA." }, { status: 500 });
    }

    if (!Array.isArray(results)) {
      return NextResponse.json({ error: "Format de réponse IA invalide." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      taskCost,
      descriptions: results,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
