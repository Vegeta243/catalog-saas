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

const BANNED_WORDS_REGEX = /\b(SEO|Optimis[\u00e9\u00e8e]e?s?|Premium|[E\u00c9\u00e9]ditions?|[Ee]lites?|High\s+Quality|Best\s+Seller|Top\s+Produit|Incontournable|Hydrogen|Oxygen|Collection|The\s)/gi

function cleanTitle(title: string): string {
  return title
    .replace(BANNED_WORDS_REGEX, '')
    .replace(/\s*\u2014\s*\u2014/g, ' \u2014')
    .replace(/:\s*\u2014/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:\u2014]+|[\s:\u2014]+$/g, '')
    .trim()
}

function cleanDescription(text: string): string {
  return stripAllHtml(text)
    .replace(/\b(SEO|[Oo]ptimis[\u00e9e]e?\s*(SEO)?|Premium\s+Optimis[\u00e9e]|Top\s+Produit)\b/gi, '')
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
      // Clean cached results that may have been generated before the fix
      if (cached.title) cached.title = cleanTitle(stripAllHtml(cached.title))
      if (cached.description) cached.description = cleanDescription(cached.description)
      if (cached.metaTitle) cached.metaTitle = cleanTitle(stripAllHtml(cached.metaTitle))
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

    const systemPrompt = `Tu es un rédacteur e-commerce francophone expert.

RÈGLE 1 — INTERDIT ABSOLU (violation = réponse rejetée) :
Ces mots ne doivent JAMAIS apparaître dans tes réponses :
SEO, Optimisé, Optimisée, Optimiser, Premium, Édition, Edition, Elite,
High Quality, Best Seller, Top Produit, Incontournable, Collection (seul),
"qualité supérieure" comme phrase vide.

RÈGLE 2 — LANGUE : Français uniquement. Traduis tout nom anglais en français naturel.

RÈGLE 3 — FORMAT DESCRIPTION : Texte brut uniquement.
INTERDIT : <ul> <li> <strong> <p> <br> <em> ou toute balise HTML.

RÈGLE 4 — TITRES : Décris concrètement le produit.
Format : [Type produit] [Caractéristique principale] — [Usage ou public]
Exemple : "Snowboard Freestyle 155cm — Planche Légère pour Débutants"

RÈGLE 5 — JSON uniquement en réponse. Aucun texte hors du JSON.`

    const userPrompt = `Tu vas créer du contenu NOUVEAU pour ce produit.
L'ancien titre et l'ancienne description sont donnés UNIQUEMENT pour comprendre ce qu'est le produit.
Tu ne dois PAS conserver la structure, les mots, ni le style de l'ancien contenu.

PRODUIT (contexte uniquement — ne pas réutiliser ces mots) :
Ancien titre (IGNORE la formulation, retiens seulement ce que c'est) : ${product.title}
Description existante (IGNORE le texte, retiens seulement les caractéristiques) : ${stripHtml(product.body_html || '').slice(0, 300)}
Tags actuels : ${product.tags || 'aucun'}
Prix : ${product.price}€

CE QUE TU DOIS GÉNÉRER (tout en français) :
${options.title ? `
TITRE (obligatoire) :
- Entre 45 et 65 caractères
- Décrit concrètement CE QUE C'EST : type de produit + caractéristique principale + usage ou public cible
- Exemple BON : "Snowboard Freestyle 155cm — Planche Légère pour Débutants"
- Exemple MAUVAIS : "Collection Snowboard — Édition Carving"
- INTERDIT dans le titre : SEO, Optimisé, Premium, Édition, Edition, Elite, Collection, The, Hydrogen, Oxygen (noms de modèles anglais)
` : ''}
${options.description ? `
DESCRIPTION (obligatoire) :
- 200 à 350 mots
- Texte brut UNIQUEMENT — ZÉRO balise HTML, ZÉRO <ul>, ZÉRO <li>, ZÉRO <strong>
- Paragraphes séparés par une ligne vide
- Parle des bénéfices concrets, pour qui c'est, comment l'utiliser
- INTERDIT : SEO, Optimisé, Premium, Édition, "qualité supérieure" comme buzzword vide
` : ''}
${options.tags ? `
TAGS (obligatoire) :
- 8 à 12 mots-clés français séparés par des virgules
- Mots que les vrais acheteurs tapent sur Google
` : ''}

Réponds UNIQUEMENT en JSON valide sans markdown ni explication :
{
  ${options.title ? '"title": "...",' : ''}
  ${options.description ? '"description": "...",' : ''}
  ${options.tags ? '"tags": "..."' : ''}
}`

    // Use gpt-4o for higher instruction-following accuracy
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
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

    // Strip HTML and banned words from all text fields
    if (result.title) result.title = cleanTitle(stripAllHtml(result.title))
    if (result.description) result.description = cleanDescription(result.description)
    if (result.metaTitle) result.metaTitle = cleanTitle(stripAllHtml(result.metaTitle))
    if (result.tags) result.tags = result.tags.replace(/<[^>]*>/g, '').trim()

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
