import { NextResponse } from "next/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { aiCache, aiCacheKey } from "@/lib/cache";
import { getCreditCost } from "@/lib/credits";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";

export async function POST(req: Request) {
  try {
    const { product, mode, language = "fr" } = await req.json();

    if (!product) {
      return NextResponse.json({ error: "Produit manquant." }, { status: 400 });
    }

    // Authenticate user from session cookie
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    // Check task quota
    const actionKey = `ai.generate.${mode || "full"}`;
    const taskCost = getCreditCost(actionKey);
    const { data: userData } = await supabase
      .from("users")
      .select("actions_used, actions_limit")
      .eq("id", user.id)
      .single();
    if (userData && userData.actions_used + taskCost > userData.actions_limit) {
      return NextResponse.json({
        error: "limit_exceeded",
        message: "Vous avez atteint votre limite de tâches. Passez à un plan supérieur pour continuer.",
        remaining: Math.max(0, userData.actions_limit - userData.actions_used),
      }, { status: 429 });
    }

    // Rate limiting
    const rateLimitKey = user.id;
    const rateResult = await checkRateLimit(rateLimitKey, "ai.generate");
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
      // Démo mode — contenu simulé réaliste, jamais de termes "SEO"/"optimisé" dans le contenu
      const base = (product.title || "Produit").trim();

      // Titre : vise 50-70 caractères pour score maximum
      const buildTitle = (t: string): string => {
        if (t.length >= 50 && t.length <= 70) return t;
        if (t.length > 70) return t.slice(0, 67) + "...";
        const suffixes = [
          " — Collection 2026, découvrez nos prix exclusifs",
          " | Référence incontournable à prix imbattable",
          " — Le choix des e-commerçants, expédié en 24h",
          " | Profitez de notre sélection du moment",
          " — Conçu pour durer, testé par nos clients",
          " | Disponible maintenant, expédition rapide",
        ];
        for (const s of suffixes) {
          const c = t + s;
          if (c.length >= 50 && c.length <= 70) return c;
          if (c.length <= 70 && c.length > t.length) { /* keep looking for >=50 */ }
        }
        // Construire à exactement 60 chars minimum
        const base = t + " — Découvrez notre sélection du moment maintenant";
        return base.length <= 70 ? base : base.slice(0, 70);
      };

      // Tags : 8 mots-clés métier sans "seo" ni "shopify" générique
      const buildTags = (t: string): string => {
        const words = t.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .split(/\s+/).filter((w) => w.length > 3).slice(0, 4);
        const generics = ["achat-en-ligne", "nouveaute", "tendance", "promotion", "boutique-en-ligne", "made-in-france"];
        return [...new Set([...words, ...generics])].slice(0, 10).join(", ");
      };

      const mockResult: Record<string, string> = {};
      if (mode === "title") {
        mockResult.title = buildTitle(base);
      } else if (mode === "tags") {
        mockResult.tags = buildTags(base);
      } else {
        mockResult.title = buildTitle(base);
        mockResult.description = `<ul><li><strong>Fabrication soignée</strong> — ${base} est conçu pour répondre aux exigences les plus élevées. Chaque détail est pensé pour vous offrir une expérience durable et agréable au quotidien.</li><li><strong>Design contemporain</strong> — Lignes épurées et matériaux de choix : un produit qui s'intègre naturellement dans votre environnement et séduit dès le premier regard.</li><li><strong>Expédition rapide</strong> — Commandez aujourd'hui et recevez votre colis sous 48 à 72 heures en France métropolitaine. Numéro de suivi fourni automatiquement.</li><li><strong>Retour sans souci</strong> — Vous disposez de 30 jours pour retourner votre article si vous n'êtes pas entièrement satisfait. Simple et sans condition.</li><li><strong>Équipe disponible</strong> — Notre service client est joignable du lundi au vendredi pour répondre à toutes vos questions et vous accompagner.</li></ul>`;
        mockResult.keywords = buildTags(base);
        mockResult.meta_description = `Découvrez ${base}. Livraison rapide sous 48-72h. Retour sous 30 jours. Commandez maintenant.`.slice(0, 160);
      }
      // Consume tasks even in demo mode
      if (taskCost > 0) {
        await supabase.rpc("increment_actions", { p_user_id: user.id, p_count: taskCost });
      }
      return NextResponse.json({ success: true, demo: true, taskCost, ...mockResult });
    }

    let prompt = "";

    if (mode === "title") {
      prompt = `Tu es un expert e-commerce. Génère un titre accrocheur pour ce produit Shopify.
Titre actuel : "${product.title}"
Contraintes :
- Exactement entre 50 et 70 caractères
- Commence par le mot-clé principal du produit
- Naturel et commercial, donne envie d'acheter
- INTERDIT absolu : les mots "SEO", "optimisé", "optimisée", "référencement", "livraison gratuite", "livraison offerte", "qualité premium", "premium", "meilleur rapport qualité-prix"
Langue : ${language}. Réponds uniquement avec le titre, sans guillemets ni explication.`;
    } else if (mode === "tags") {
      prompt = `Tu es un expert e-commerce. Génère exactement 10 mots-clés pour ce produit Shopify.
Titre : "${product.title}". Description : "${product.description || ""}"
Contraintes :
- Mots-clés que les acheteurs tapent réellement dans Google ou sur Shopify
- Variez entre : terme générique, spécifique, cas d'usage, audience
- INTERDIT absolu : "SEO", "optimisé", "shopify", "boutique" seul, "premium" seul, "livraison gratuite", "livraison offerte", "qualité premium"
Langue : ${language}. Réponds uniquement avec les mots-clés séparés par des virgules, sans numérotation.`;
    } else {
      prompt = `Tu es un copywriter e-commerce expert. Pour ce produit Shopify :
Titre : "${product.title}"
Description actuelle : "${product.description || "Aucune"}"

Génère :
1. Un titre accrocheur de 55 à 60 caractères exact, qui commence par le mot-clé principal
2. Une description de vente d'au moins 220 mots en HTML avec puces <ul><li>, mettant en avant les bénéfices concrets pour l'acheteur
3. 10 mots-clés que les acheteurs tapent réellement, séparés par des virgules
4. Une meta description de 150 à 160 caractères accrocheuse pour Google, qui résume le produit et donne envie de cliquer

Règles STRICTES pour tout le contenu :
- N'utilise JAMAIS : "SEO", "optimisé", "optimisée", "référencement", "strategiquement", "livraison gratuite", "livraison offerte", "qualité premium", "premium", "meilleur rapport qualité-prix"
- La description doit parler du produit, pas de la boutique
- Ton direct, bénéfices concrets, pas de superlatifs vides
- La meta description doit faire EXACTEMENT entre 150 et 160 caractères

Langue : ${language}. Réponds en JSON : {"title":"...","description":"...","keywords":"...","meta_description":"..."}`;
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
        messages: [
          {
            role: "system",
            content: "Tu es un expert en e-commerce francophone. Tu dois TOUJOURS répondre UNIQUEMENT en français, sans aucune exception. N'utilise JAMAIS de mots anglais, espagnols ou dans une autre langue que le français. Tous tes textes (titres, descriptions, tags, méta-titres, méta-descriptions) doivent être intégralement rédigés en français."
          },
          { role: "user", content: `IMPORTANT : Réponds uniquement en français.\n\n${prompt}` }
        ],
        temperature: 0.7,
        max_tokens: 1200, // Increased for 220+ word descriptions
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

    // Consume tasks after successful generation
    if (taskCost > 0) {
      await supabase.rpc("increment_actions", { p_user_id: user.id, p_count: taskCost });
    }

    await logAction(supabase, {
      userId: user.id,
      actionType: `ai.generate.${mode || "full"}`,
      description: `Titre IA — 1 produit`,
      productsCount: 1,
      creditsUsed: taskCost,
      details: { model: "gpt-4o-mini", mode: mode || "full" },
    });

    return NextResponse.json({
      success: true,
      taskCost,
      remaining: userData ? Math.max(0, userData.actions_limit - userData.actions_used - taskCost) : undefined,
      ...result,
      ...getRateLimitHeaders(rateResult),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
