import { NextResponse } from "next/server";
import OpenAI from "openai";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { aiCache, aiCacheKey } from "@/lib/cache";
import { getCreditCost } from "@/lib/credits";
import { createClient } from "@/lib/supabase/server";
import { logAction } from "@/lib/log-action";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
}

function stripAllHtml(text: string): string {
  return text
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

function plainTextToHtml(text: string): string {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map(p => `<p>${p.trim()}</p>`)
    .join('')
}

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
        mockResult.description = `Fabrication soignée — ${base} est conçu pour répondre aux exigences les plus élevées. Chaque détail est pensé pour vous offrir une expérience durable et agréable au quotidien.\n\nDesign contemporain — Lignes épurées et matériaux de choix : un produit qui s'intègre naturellement dans votre environnement et séduit dès le premier regard.\n\nExpédition rapide — Commandez aujourd'hui et recevez votre colis sous 48 à 72 heures en France métropolitaine. Numéro de suivi fourni automatiquement.\n\nRetour sans souci — Vous disposez de 30 jours pour retourner votre article si vous n'êtes pas entièrement satisfait. Simple et sans condition.\n\nÉquipe disponible — Notre service client est joignable du lundi au vendredi pour répondre à toutes vos questions et vous accompagner.`;
        mockResult.keywords = buildTags(base);
        mockResult.meta_description = `Découvrez ${base}. Livraison rapide sous 48-72h. Retour sous 30 jours. Commandez maintenant.`.slice(0, 160);
      }
      // Consume tasks even in demo mode
      if (taskCost > 0) {
        await supabase.rpc("increment_actions", { p_user_id: user.id, p_count: taskCost });
      }
      return NextResponse.json({ success: true, demo: true, taskCost, ...mockResult });
    }

    const options = {
      title: mode !== 'tags',
      description: mode !== 'title' && mode !== 'tags',
      tags: mode !== 'title',
    }

    const systemPrompt = `Tu es un expert en e-commerce francophone.

RÈGLES STRICTES — VIOLATION = RÉPONSE INVALIDE :
1. Langue : FRANÇAIS UNIQUEMENT. Zéro mot anglais sauf noms techniques inévitables.
2. Interdiction absolue de ces mots dans les titres ET descriptions :
   "SEO", "Optimisé", "Optimisée", "Premium", "Edition", "Édition", "Elite",
   "High Quality", "Best Seller", "Top Produit", "Incontournable"
3. Titres : décrire le produit concrètement comme un vrai vendeur français.
   BON : "Snowboard Freestyle 155cm pour Débutants — Planche Légère"
   MAUVAIS : "Collection Snowboard Hydrogen — Édition Premium"
4. Descriptions : texte brut UNIQUEMENT.
   INTERDIT : <ul> <li> <strong> <p> <br> ou toute balise HTML.
   AUTORISÉ : texte normal avec des sauts de ligne.
5. Tags : mots-clés que les acheteurs français tapent réellement sur Google.`

    const userPrompt = `Produit à optimiser :
Titre actuel : ${product.title}
Description actuelle : ${stripHtml(product.body_html || '')}
Tags actuels : ${product.tags || 'aucun'}
Prix : ${product.price}€

Génère en français :
${options.title ? `- TITRE : 50-70 caractères, mots-clés naturels que les acheteurs cherchent sur Google.fr, PAS de mention "SEO" ou "Premium Optimisé" dans le titre` : ''}
${options.description ? `- DESCRIPTION : 200-350 mots en texte brut (ZÉRO balise HTML), paragraphes séparés par \\n\\n, parle des avantages concrets, matériaux, pour qui c'est fait, pourquoi l'acheter` : ''}
${options.tags ? `- TAGS : 8-12 mots-clés français séparés par des virgules, ce que les acheteurs tapent vraiment` : ''}

RAPPEL : Texte brut uniquement. Aucune balise HTML. Tout en français.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  ${options.title ? '"title": "...",' : ''}
  ${options.description ? '"description": "...",' : ''}
  ${options.tags ? '"tags": "..."' : ''}
}`

    // Use gpt-4o-mini by default (10x cheaper than gpt-4o)
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }  // force JSON output
    });

    const content = completion.choices?.[0]?.message?.content?.trim() || "";

    let result: Record<string, string>;

    try {
      result = JSON.parse(content);
    } catch {
      result = { description: content };
    }

    // Strip any HTML tags the model may have generated despite instructions
    if (result.description) result.description = stripAllHtml(result.description)
    if (result.title) result.title = stripAllHtml(result.title)

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
