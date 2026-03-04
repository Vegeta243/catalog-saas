import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { aiCache, aiCacheKey } from "@/lib/cache";
import { getCreditCost } from "@/lib/credits";

export async function POST(req: Request) {
  try {
    const { product, mode, userId, language = "fr" } = await req.json();

    if (!product) {
      return NextResponse.json({ error: "Produit manquant." }, { status: 400 });
    }

    // Rate limiting
    const rateLimitKey = userId || "anonymous";
    const rateResult = checkRateLimit(rateLimitKey, "ai.generate");
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Trop de requêtes. Réessayez dans quelques instants." },
        { status: 429, headers: getRateLimitHeaders(rateResult) }
      );
    }

    // Check cache
    const cacheKey = aiCacheKey(product.id || product.title, mode || "full", language);
    const cached = aiCache.get<Record<string, string>>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, cached: true, ...cached });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Démo mode — réponses simulées quand OPENAI_API_KEY est absent
      const mockResult: Record<string, string> = {};
      if (mode === "title") {
        mockResult.title = `${product.title} — Édition Premium Optimisée SEO`;
      } else if (mode === "tags") {
        const words = (product.title || "").toLowerCase().split(" ").slice(0, 4);
        mockResult.tags = [...words, "shopify", "premium", "tendance", "qualité", "livraison-rapide", "promo"].join(", ");
      } else {
        mockResult.title = `${product.title} — Qualité Premium | Livraison Rapide`;
        mockResult.description = `<ul><li><strong>Qualité exceptionnelle</strong> — Ce produit est conçu pour durer et satisfaire vos clients.</li><li><strong>Design élégant</strong> — Un style moderne qui séduit du premier regard.</li><li><strong>Livraison express</strong> — Réception en 24-48h pour toute commande en France.</li><li><strong>Satisfaction garantie</strong> — Retours acceptés sous 30 jours sans condition.</li><li><strong>Service client</strong> — Notre équipe répond en moins de 2h du lundi au vendredi.</li></ul>`;
        mockResult.keywords = `${product.title?.toLowerCase()}, boutique, qualité premium, livraison gratuite, france, shopify, tendance, mode, promo, achat sécurisé`;
      }
      return NextResponse.json({ success: true, demo: true, taskCost: 0, ...mockResult });
    }

    // Task cost
    const actionKey = `ai.generate.${mode || "description"}`;
    const taskCost = getCreditCost(actionKey);

    let prompt = "";

    if (mode === "title") {
      prompt = `Tu es un expert SEO e-commerce. Génère un titre optimisé SEO pour ce produit Shopify. Le titre actuel est: "${product.title}". Le titre doit faire entre 50 et 70 caractères, être accrocheur et contenir des mots-clés pertinents. Langue: ${language}. Réponds uniquement avec le nouveau titre, sans guillemets ni explication.`;
    } else if (mode === "tags") {
      prompt = `Tu es un expert SEO e-commerce. Génère exactement 10 tags pertinents pour ce produit Shopify. Titre: "${product.title}". Description: "${product.description || ""}". Langue: ${language}. Réponds uniquement avec les tags séparés par des virgules, sans numérotation ni explication.`;
    } else {
      prompt = `Tu es un expert copywriter e-commerce. Pour ce produit Shopify:
Titre: "${product.title}"
Description actuelle: "${product.description || "Aucune"}"

Génère:
1. Un titre SEO optimisé (50-70 caractères)
2. Une description commerciale percutante (150-300 mots), structurée avec des puces HTML (<ul><li>)
3. 10 mots-clés SEO pertinents séparés par des virgules

Langue: ${language}. Réponds en JSON avec ce format exact: {"title":"...","description":"...","keywords":"..."}`;
    }

    // Use gpt-4o-mini by default (10x cheaper than gpt-4o)
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
        max_tokens: 800, // Optimized from 1000 to reduce costs
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: `Erreur OpenAI: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || "";

    let result: Record<string, string>;

    if (mode === "title") {
      result = { title: content };
    } else if (mode === "tags") {
      result = { tags: content };
    } else {
      try {
        result = JSON.parse(content);
      } catch {
        result = { description: content };
      }
    }

    // Cache the result
    aiCache.set(cacheKey, result);

    return NextResponse.json({
      success: true,
      taskCost,
      ...result,
      ...getRateLimitHeaders(rateResult),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
