import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

// Demo products for when OpenAI key isn't set or rate limit hit
interface DemoProduct {
  title: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
}

function buildDemoProducts(niche: string, platform: string, minMargin: number, maxPrice: number): object[] {
  const nicheMap: Record<string, DemoProduct[]> = {
    Mode: [
      { title: "Veste en jean oversize femme tendance 2026", supplierPrice: 8.5, salePrice: 24.9, margin: 2.9 },
      { title: "Sac à main bandoulière canvas rétro", supplierPrice: 4.2, salePrice: 14.9, margin: 3.5 },
      { title: "Sneakers chunky femme semelle épaisse", supplierPrice: 12.0, salePrice: 39.9, margin: 3.3 },
      { title: "Robe midi fleurie été légère", supplierPrice: 6.8, salePrice: 22.9, margin: 3.4 },
    ],
    Tech: [
      { title: "Écouteurs sans fil TWS Bluetooth 5.3 ANC", supplierPrice: 5.5, salePrice: 19.9, margin: 3.6 },
      { title: "Chargeur magnétique 3-en-1 iPhone/Android", supplierPrice: 7.0, salePrice: 24.9, margin: 3.6 },
      { title: "Lampe LED bureau pliable USB-C", supplierPrice: 4.8, salePrice: 17.9, margin: 3.7 },
      { title: "Support téléphone voiture magnétique universel", supplierPrice: 2.5, salePrice: 9.9, margin: 4.0 },
    ],
    Maison: [
      { title: "Diffuseur d'huiles essentielles LED 300ml", supplierPrice: 6.2, salePrice: 22.9, margin: 3.7 },
      { title: "Organisateur tiroir modulable cuisine", supplierPrice: 3.8, salePrice: 14.9, margin: 3.9 },
      { title: "Vase pampa décoratif nordique", supplierPrice: 2.9, salePrice: 11.9, margin: 4.1 },
      { title: "Projecteur étoiles galaxie chambre enfant", supplierPrice: 7.5, salePrice: 24.9, margin: 3.3 },
    ],
    Sport: [
      { title: "Legging gainant push-up fitness femme", supplierPrice: 6.5, salePrice: 22.9, margin: 3.5 },
      { title: "Bouteille thermos sport 1L double paroi", supplierPrice: 5.2, salePrice: 19.9, margin: 3.8 },
      { title: "Tapis de yoga antidérapant 6mm", supplierPrice: 7.0, salePrice: 24.9, margin: 3.6 },
      { title: "Résistances élastiques musculation kit 5", supplierPrice: 3.5, salePrice: 14.9, margin: 4.3 },
    ],
  };
  const base = nicheMap[niche] || nicheMap["Mode"];
  const competition = ["Faible", "Moyen", "Élevé"] as const;
  return base
    .filter((p) => p.supplierPrice <= maxPrice && p.margin >= minMargin)
    .map((p, i) => ({
      ...p,
      image: "",
      platform,
      url: `https://fr.aliexpress.com/wholesale?SearchText=${encodeURIComponent(p.title.replace(/\s+/g, "+"))}`,
      trendingScore: Math.floor(Math.random() * 4) + 6,
      competition: competition[i % 3],
      rating: (3.8 + Math.random() * 1.1).toFixed(1),
    }));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    // Rate limit
    const rateResult = checkRateLimit(user.id, "ai.generate");
    if (!rateResult.allowed) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }

    const body = await req.json();
    const { platform = "AliExpress", niche = "Mode", minPrice = 0, maxPrice = 50, minMargin = 2, trend = "trending", keywords = "" } = body;

    // Demo response (works without OpenAI key)
    const demo = buildDemoProducts(niche, platform, parseFloat(minMargin), parseFloat(maxPrice));
    let products = demo;

    // If OpenAI is configured, use it to generate better queries
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const prompt = `Tu es un expert dropshipping. L'utilisateur cherche des produits sur "${platform}" dans la niche "${niche}".
Filtre: prix fournisseur ${minPrice}€-${maxPrice}€, marge ≥ ×${minMargin}, tendance "${trend}"${keywords ? `, mots-clés: "${keywords}"` : ""}.

Génère 8 idées de produits gagnants pour le marché français en 2026.
Pour chaque produit, donne un JSON avec:
- title: titre commercial en français (max 80 chars)
- supplierPrice: prix chez le fournisseur en EUR
- salePrice: prix de vente recommandé en EUR  
- margin: multiplicateur (ex: 3.2)
- competition: "Faible" | "Moyen" | "Élevé"
- trendingScore: score 1-10
- url: URL de recherche AliExpress

Réponds UNIQUEMENT avec un tableau JSON valide.`;

        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 2000,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\[[\s\S]+\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              products = parsed.map((p: Record<string, unknown>) => ({
                ...p,
                image: "",
                platform,
                rating: (3.8 + Math.random() * 1.1).toFixed(1),
              }));
            }
          }
        }
      } catch {
        // Fall through to demo
      }
    }

    return NextResponse.json({ products, demo: !apiKey });
  } catch (e) {
    console.error("[ai-search]", e);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
