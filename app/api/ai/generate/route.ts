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

const BANNED_TITLE_PHRASES = [
  /livraison\s+rapide(\s+\d+h)?/gi,
  /livraison\s+\d+h/gi,
  /exp[eé]di[eé]\s+en\s+\d+h/gi,
  /satisfait\s+ou\s+rembours[eée]/gi,
  /qualit[eée]\s+sup[eée]rieure/gi,
  /meilleur\s+prix/gi,
  /top\s+qualit[eée]/gi,
  /\b(SEO|Optimis[\u00e9\u00e8e]e?s?|Premium|[E\u00c9\u00e9]ditions?|[Ee]lites?|High\s+Quality|Best\s+Seller|Top\s+Produit|Incontournable|Hydrogen|Oxygen|Collection|The\s)\b/gi,
]

function cleanTitle(title: string): string {
  let clean = stripAllHtml(title)
  for (const pattern of BANNED_TITLE_PHRASES) {
    clean = clean.replace(pattern, "")
  }
  return clean
    .replace(/\s*—\s*—/g, " —")
    .replace(/\s*—\s*$/g, "")
    .replace(/^\s*—\s*/g, "")
    .replace(/:\s*—/g, ":")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function cleanDescription(text: string): string {
  return stripAllHtml(text)
    .replace(/\b(SEO|[Oo]ptimis[\u00e9e]e?\s*(SEO)?|Premium\s+Optimis[\u00e9e]|Top\s+Produit)\b/gi, '')
    .replace(/\s{3,}/g, '\n\n')
    .trim()
}

function sanitizeResult(result: Record<string, string>): Record<string, string> {
  if (!result) return result
  const htmlStrip = (s: string) => s
    .replace(/<\/?[^>]+(>|$)/gi, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s{2,}/g, "\n\n")
    .trim()
  const sloganStrip = (s: string) => {
    for (const pattern of BANNED_TITLE_PHRASES) {
      s = s.replace(new RegExp(pattern.source, pattern.flags), "")
    }
    return s.replace(/\s{2,}/g, " ").trim()
  }
  if (result.title) result.title = sloganStrip(htmlStrip(result.title))
  if (result.description) result.description = sloganStrip(htmlStrip(result.description))
  if (result.metaTitle) result.metaTitle = sloganStrip(htmlStrip(result.metaTitle))
  if (result.metaDescription) result.metaDescription = sloganStrip(htmlStrip(result.metaDescription))
  if (result.tags) result.tags = htmlStrip(result.tags)
  return result
}

const CACHE_VERSION = "v3"

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

    // Check cache — CACHE_VERSION at module level busts stale entries
    const cacheKey = `${CACHE_VERSION}_${aiCacheKey(product.id || product.title, mode || "full", language)}`;
    const cached = aiCache.get<Record<string, string>>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, cached: true, ...sanitizeResult(cached) });
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
        mockResult.description = `${base} est conçu pour répondre aux besoins des utilisateurs exigeants. Chaque détail a été pensé pour allier confort, durabilité et praticité au quotidien.\n\nSes lignes épurées et ses matériaux soigneusement sélectionnés lui permettent de s'intégrer naturellement dans n'importe quel environnement, que ce soit à la maison ou en déplacement.\n\nIdéal pour un usage régulier, il convient aussi bien aux débutants qui cherchent un premier équipement fiable qu'aux utilisateurs avancés qui souhaitent un produit performant sur la durée.\n\nSa prise en main est immédiate : aucun réglage complexe, aucun outil requis. Il suffit de le déballer et de l'utiliser directement.\n\nBien entretenu, ce produit vous accompagnera pendant des années. Consultez notre FAQ pour toute question sur l'entretien ou la compatibilité avec vos équipements existants.`;
        mockResult.keywords = buildTags(base);
        mockResult.meta_description = `Découvrez ${base}. Conçu pour durer, facile à utiliser, adapté à tous les profils. Commandez maintenant.`.slice(0, 160);
      }
      // Consume tasks even in demo mode
      if (taskCost > 0) {
        await supabase.rpc("increment_actions", { p_user_id: user.id, p_count: taskCost });
      }
      return NextResponse.json({ success: true, demo: true, taskCost, ...sanitizeResult(mockResult) });
    }

    const options = {
      title: mode !== 'tags',
      description: mode !== 'title' && mode !== 'tags',
      tags: mode !== 'title',
    }

    const systemPrompt = `Tu es un rédacteur e-commerce francophone expert en SEO naturel.

RÈGLE 1 — INTERDIT ABSOLU dans les titres et descriptions (violation = réponse rejetée) :
Mots et phrases interdits : SEO, Optimisé, Optimisée, Premium, Édition, Edition, Elite,
High Quality, Best Seller, Top Produit, Incontournable, "Livraison rapide",
"Livraison 24h", "Satisfait ou remboursé", "Qualité supérieure", "Meilleur prix"

RÈGLE 2 — LANGUE : Français uniquement.

RÈGLE 3 — DESCRIPTIONS : Texte brut UNIQUEMENT.
INTERDIT ABSOLU : <ul> <li> <strong> <p> <br> <em> <h1> <h2> ou toute balise HTML.
Le texte doit être des phrases normales séparées par des sauts de ligne.
Si tu génères une balise HTML, ta réponse sera INVALIDE.

RÈGLE 4 — TITRES SEO naturel :
Un bon titre SEO décrit le produit physiquement pour que Google comprenne ce que c'est.
Il n'est PAS un slogan publicitaire.

RÈGLE 5 — JSON uniquement. Aucun texte hors du JSON.`

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
TITRE :
- Entre 45 et 65 caractères
- Format : [Type de produit exact] [Caractéristique mesurable] — [Usage concret ou public]
- Exemple BON : "Snowboard All-Mountain 158cm Homme — Carving et Freestyle"
- Exemple BON : "Planche de Snowboard Débutant 150cm — Stable et Légère"
- INTERDIT dans le titre : "Livraison rapide", "24h", "Satisfait ou remboursé", tout slogan commercial
- INTERDIT dans le titre : SEO, Optimisé, Premium, Édition, Elite, Collection, The
- Décris UNIQUEMENT ce qu'est le produit physiquement — pas comment il est livré ni ses avantages marketing
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

    // Nuclear sanitize — strip HTML and slogans from every field
    const sanitized = sanitizeResult(result)

    // Cache the sanitized result
    aiCache.set(cacheKey, sanitized);

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
      details: { model: "gpt-4o", mode: mode || "full" },
    });

    return NextResponse.json({
      success: true,
      taskCost,
      remaining: userData ? Math.max(0, userData.actions_limit - userData.actions_used - taskCost) : undefined,
      ...sanitized,
      ...getRateLimitHeaders(rateResult),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
