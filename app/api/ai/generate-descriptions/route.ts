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
      // Démo mode — descriptions détaillées centrées sur le produit
      const mockDescriptions = products.map((p: { id: string; title: string }) => ({
        id: p.id,
        description: `<ul><li><strong>Fabrication soignée</strong> — ${p.title} est conçu pour répondre aux exigences les plus élevées. Chaque détail compte pour vous garantir une expérience durable et agréable à chaque utilisation.</li><li><strong>Matériaux sélectionnés</strong> — Nous avons choisi des matériaux de premier choix pour ce produit, alliant résistance, confort et esthétique. Un investissement qui tient dans le temps.</li><li><strong>Expédition sous 24h</strong> — Votre commande est préparée en 24 heures et livrée en 48 à 72 heures en France métropolitaine. Numéro de suivi inclus.</li><li><strong>Retour gratuit</strong> — Vous disposez de 30 jours pour retourner l'article si vous n'êtes pas entièrement satisfait. Procédure simple, sans conditions.</li><li><strong>Équipe disponible</strong> — Notre service client est joignable du lundi au vendredi pour répondre à toutes vos questions avant ou après achat.</li></ul>`,
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

    const prompt = `Tu es un copywriter e-commerce expert en vente en ligne. Génère des descriptions commerciales pour ces ${products.length} produit(s) Shopify.

${productsList}

Règles pour chaque description :
- 150 à 250 mots
- Structure HTML avec puces (<ul><li>)
- Commence chaque puce par un AVANTAGE concret pour l'acheteur, pas une caractéristique technique
- Ton direct et engageant, vocabulaire de tous les jours
- Appel à l'action naturel sur la dernière puce
- STRICTEMENT INTERDIT dans le texte généré : "SEO", "optimisé", "optimisée", "référencement", "stratégie", le mot "qualité" seul sans contexte spécifique

Langue : ${language}
Réponds UNIQUEMENT en JSON valide sans texte avant ni après :
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
