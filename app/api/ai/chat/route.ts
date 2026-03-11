import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getRateLimitHeaders } from "@/lib/rate-limit";

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.union([z.literal("user"), z.literal("assistant")]),
      content: z.string().max(4000),
    })
  ).min(1).max(20),
  currentPage: z.string().max(200).optional(),
  plan: z.string().max(50).optional(),
});

const SYSTEM_PROMPT = `Tu es l'assistant IA d'EcomPilot, un SaaS e-commerce qui aide les marchands Shopify à optimiser leur catalogue produits. Tu répondras en français, de façon concise, clear et utile.

Fonctionnalités disponibles dans EcomPilot :
- **Modifier en masse** : modifier prix, tags, statuts, titres de plusieurs produits en une fois
- **Optimisation IA** : générer titres SEO, descriptions, méta-titres et méta-descriptions avec GPT-4o-mini
- **Éditeur d'images** : améliorer, recadrer, convertir des visuels produits (JPEG, PNG, WebP)
- **Automatisations** : créer des règles automatiques (baisse de prix, alerte stock, archivage)
- **Calendrier** : planifier des actions marketing
- **Rentabilité** : calculer marges et profits
- **Concurrence** : suivre les concurrents

Sois toujours précis, encourage l'utilisateur à explorer les fonctionnalités et réponds aux questions techniques comme à un expert e-commerce.`;

// Normalize: remove accents, lowercase — so "tâche"="tache", "règle"="regle", etc.
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function has(m: string, ...patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(m));
}

function getSmartDemoReply(msg: string, page?: string, plan?: string): string {
  const m = normalize(msg);

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (/^(bonjour|salut|hello|hi|hey|coucou|bonsoir|yo|ola)/.test(m) || m.length < 4) {
    return `Bonjour ! Je suis l'assistant EcomPilot 👋\n\nJe peux vous aider avec :\n• **Optimisation produits** — titres SEO, descriptions, tags\n• **Modification en masse** — prix, statuts sur plusieurs produits\n• **Images** — redimensionner, convertir, améliorer\n• **Automatisations** — règles automatiques stock/prix\n• **Connexion Shopify** — configuration et sync\n\nQue souhaitez-vous faire ?`;
  }

  // ── Tâches / quota / plan ──────────────────────────────────────────────────
  // Catches: "combien de taches", "taches restantes", "quota", "credits", "forfait", etc.
  if (has(m,
    /tache|credit|quota|action.?restant|restant.?action|il.?me.?reste|combien.*rest|reste.*combien/,
    /plan|forfait|tarif|abonnement|upgrade|downgrade|gratuit|free\b|pro\b|business\b|prix.*(plan|forfait)/,
    /renouvell|mensuel|mois|limite.*(tache|action|credit)/
  )) {
    const planLabel = plan === "free" ? "gratuit" : plan || "gratuit";
    const limits: Record<string, string> = { free: "30 tâches/mois", pro: "200 tâches/mois", business: "1 000 tâches/mois" };
    const currentLimit = limits[planLabel] || "30 tâches/mois";
    return `Vous êtes sur le **plan ${planLabel}** (${currentLimit}).\n\nPour voir vos tâches restantes → menu gauche → **Mon forfait**.\n\n**Tous les plans :**\n• 🆓 **Gratuit** — 30 tâches/mois\n• ⚡ **Pro** — 200 tâches/mois\n• 🚀 **Business** — 1 000 tâches/mois\n\nLes tâches se renouvellent automatiquement chaque mois. Pour en avoir plus, upgradez sur la page **Mon forfait**.`;
  }

  // ── Produits en masse ──────────────────────────────────────────────────────
  if (has(m, /modifier.*(masse|bulk|tous|plusieurs|multiple)/, /masse|bulk-edit|modification.*(masse|groupe)/)) {
    return `Pour modifier vos produits **en masse** 📦 :\n\n1. Allez sur la page **Produits**\n2. Cochez les produits à modifier\n3. La **barre d'actions** apparaît en bas\n4. Modifiez prix, tags, statuts ou générez du contenu IA\n\nOu utilisez directement la page **Modifier en masse** dans le menu pour des changements structurés sur tout votre catalogue.`;
  }

  // ── Prix ───────────────────────────────────────────────────────────────────
  if (has(m, /modifier.*prix|changer.*prix|prix.*(produit|article)|mettre.*(prix|tarif)/)) {
    return `Pour modifier les **prix** :\n\n• **Un seul produit** : cliquez sur le produit → modifiez le prix\n• **Plusieurs produits** : cochez-les → barre d'actions → Modifier les prix\n• **En masse** : page **Modifier en masse** → champ Prix\n\nVous pouvez augmenter/diminuer en % ou définir un prix fixe pour tous les produits sélectionnés.`;
  }

  // ── Produits (général) ────────────────────────────────────────────────────
  if (has(m, /produit|catalogue|fiche|article|listing|synchronis|shopify.*(produit|sync)|importer/)) {
    return `Vos produits Shopify sont synchronisés automatiquement dans EcomPilot.\n\n**Ce que vous pouvez faire :**\n• Modifier titre, description, tags, prix\n• Générer du contenu IA optimisé SEO\n• Modifier en masse plusieurs produits à la fois\n• Voir et améliorer le score SEO de chaque fiche\n\nPage **Produits** dans le menu → sélectionnez un produit pour commencer.`;
  }

  // ── Score SEO ──────────────────────────────────────────────────────────────
  if (has(m, /score.?seo|seo.?score|score.*produit|note.*seo/)) {
    return `Le **score SEO** (0–100) évalue chaque fiche sur 4 critères :\n\n• 📝 **Titre** (25 pts) — idéalement 50–70 caractères\n• 📄 **Description** (40 pts) — 100+ mots recommandés\n• 🏷️ **Tags** (20 pts) — 5+ tags recommandés\n• 🖼️ **Images** (15 pts) — 3+ images = score max\n\nScore > 70 = excellent ✅. Utilisez l'**Optimisation IA** pour améliorer automatiquement les fiches faibles.`;
  }

  // ── Méta / SEO optimisation ────────────────────────────────────────────────
  if (has(m, /meta.?title|meta.?desc|meta.?donnee|metadonnee|balise/)) {
    return `Pour générer vos **méta-titres et méta-descriptions** :\n\n1. Page **Optimisation IA** dans le menu\n2. Sélectionnez vos produits\n3. Cliquez **Générer** → l'IA crée des méta-données optimisées\n4. Vérifiez et appliquez en un clic\n\nLes méta-données sont envoyées directement à Shopify.`;
  }

  // ── IA / Optimisation ─────────────────────────────────────────────────────
  if (has(m, /ia|intelligence.?artific|gpt|optimi|generer|genere|titres?.?seo|description.?(ia|genere|auto)/)) {
    return `**Optimisation IA** — page dédiée dans le menu :\n\n1. Filtrez vos produits par score SEO bas\n2. Cochez ceux à optimiser\n3. Choisissez : titre, description, tags ou **tout optimiser**\n4. L'IA génère du contenu SEO personnalisé\n5. Prévisualisez et appliquez en un clic\n\nChaque optimisation consomme 1 tâche de votre quota mensuel.`;
  }

  // ── Images ────────────────────────────────────────────────────────────────
  if (has(m, /image|photo|visuel|webp|jpeg|jpg|png|redimensi|convertir|recadrer|compresse/)) {
    return `**Éditeur d'images** EcomPilot :\n\n• Formats acceptés : JPEG, PNG, WebP\n• Redimensionnement aux formats standards (Shopify, Instagram, Facebook…)\n• Conversion WebP (recommandé pour la performance web)\n• Compression sans perte de qualité visible\n\nAccédez-y via **Éditeur d'images** dans le menu. Glissez-déposez vos images pour commencer.`;
  }

  // ── Automatisations ───────────────────────────────────────────────────────
  if (has(m, /automat|regle|rule|declencheur|trigger|condition|action.?(auto|planif)|stock.?(bas|alerte|faible)/)) {
    return `**Automatisations** EcomPilot :\n\nCréez des règles qui s'exécutent automatiquement :\n\n• 📉 Stock bas → ajouter un tag "rupture"\n• 💰 Prix sous un seuil → envoyer une alerte\n• 📦 Produit non vendu → archiver après X jours\n• 🗓️ Planification → modifier prix pour une période donnée\n\nPage **Automatisations** → **Nouvelle règle** → définissez la condition et l'action.`;
  }

  // ── Shopify / Connexion ───────────────────────────────────────────────────
  if (has(m, /shopify|connecter.*boutique|ajouter.*boutique|boutique.*(connect|ajouter|install)|oauth|myshopify/)) {
    return `**Connexion Shopify** :\n\n1. Menu gauche → **Mes boutiques** → **Ajouter une boutique**\n2. Entrez votre domaine (ex : ma-boutique ou ma-boutique.myshopify.com)\n3. Cliquez **Ajouter** puis **Connecter** (bouton orange)\n4. Autorisez l'accès dans Shopify\n\nVos produits se synchronisent automatiquement après connexion. Si problème, vérifiez que votre boutique Shopify est active.`;
  }

  // ── Calendrier ────────────────────────────────────────────────────────────
  if (has(m, /calendrier|planifier|schedule|agenda|programmer.*action/)) {
    return `**Calendrier marketing** :\n\nPlanifiez vos actions à l'avance :\n• Modifications de prix pour les soldes\n• Changements de statut / archivage programmés\n• Campagnes produits à date fixe\n\nPage **Calendrier** → **Nouvelle action** → choisissez la date et l'action.`;
  }

  // ── Rentabilité / Marges ──────────────────────────────────────────────────
  if (has(m, /rentab|marge|profit|cout|benefice|revient|commission/)) {
    return `**Rentabilité** EcomPilot :\n\nCalculez vos marges en intégrant :\n• Prix de vente Shopify\n• Coût de revient (que vous saisissez)\n• Frais Shopify et marketing\n\nPage **Rentabilité** → entrez vos coûts → visualisez marges et profits par produit.`;
  }

  // ── Concurrence ───────────────────────────────────────────────────────────
  if (has(m, /concurrent|concurrence|competitor|veille|surveiller|espionn/)) {
    return `**Suivi concurrents** :\n\n• Ajoutez des URL de concurrents à surveiller\n• Recevez des alertes dès qu'un prix change\n• Comparez avec vos propres prix\n\nPage **Concurrence** dans le menu → **Ajouter un concurrent**.`;
  }

  // ── Support / Aide / Bug ──────────────────────────────────────────────────
  if (has(m, /probleme|bug|erreur|marche.?pas|ne.?fonctionne|ticket|support|contacter|aide/)) {
    return `Pour signaler un **problème** ou obtenir de l'aide :\n\n• 📖 **FAQ** — page Aide → FAQ (réponses aux questions fréquentes)\n• 🎫 **Ticket support** — page Aide → Nouvelle demande (réponse sous 24h)\n\nDécrivez votre problème en détail dans le ticket et notre équipe vous répond rapidement.`;
  }

  // ── Compte / Profil ───────────────────────────────────────────────────────
  if (has(m, /compte|profil|avatar|mot.?de.?passe|password|changer.?email|supprimer.?compte|securite/)) {
    return `Pour gérer votre **compte** :\n\n• **Profil** → modifier nom, prénom, avatar\n• **Mot de passe** → page Profil → Sécurité\n• **Email** → contactez le support pour changer votre email\n• **Supprimer le compte** → page Profil → zone danger\n\nAccédez à votre profil via **Mon compte** dans le menu.`;
  }

  // ── Fallback contextuel selon la page courante ─────────────────────────────
  // (seulement si aucun mot-clé n'a matché — fournit un contexte utile)
  const pageCtx = page?.toLowerCase() || "";
  if (pageCtx.includes("products")) {
    return `Je ne suis pas sûr d'avoir compris votre question. Sur la page **Produits**, vous pouvez :\n• Modifier un produit en cliquant dessus\n• Sélectionner plusieurs produits et les modifier en masse\n• Générer du contenu IA pour améliorer le SEO\n\nPouvez-vous reformuler votre question ?`;
  }
  if (pageCtx.includes("ai")) {
    return `Je ne suis pas sûr d'avoir compris. Sur **Optimisation IA**, sélectionnez des produits et cliquez **Générer** pour créer du contenu SEO optimisé.\n\nPouvez-vous me dire ce que vous souhaitez faire exactement ?`;
  }

  // ── Fallback général ───────────────────────────────────────────────────────
  return `Je n'ai pas bien compris votre question 🤔\n\nJe peux vous aider avec :\n• **Tâches restantes / quota** — dites "combien de tâches il me reste"\n• **Optimisation produits** — SEO, descriptions, tags IA\n• **Modification en masse** — prix, statuts, tags\n• **Images** — redimensionner, convertir\n• **Automatisations** — règles automatiques\n• **Connexion Shopify** — ajouter une boutique\n• **Mon forfait** — plans et tarifs\n\nPosez votre question différemment et je ferai de mon mieux !`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const rl = checkRateLimit(user.id, "ai.generate");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans un moment." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

  const parsed = chatSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { messages, currentPage, plan } = parsed.data;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-DEMO") || apiKey.startsWith("sk-test")) {
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const demoReply = getSmartDemoReply(lastUserMsg, currentPage, plan);
    return NextResponse.json({ message: demoReply, demo: true });
  }

  const contextNote = currentPage
    ? `\n\nContexte : L'utilisateur se trouve sur la page "${currentPage}". Son plan actuel est "${plan || "free"}".`
    : "";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT + contextNote },
        ...messages,
      ],
      max_tokens: 400,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erreur IA. Réessayez dans un moment." }, { status: 502 });
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message?.content?.trim() || "Je n'ai pas pu générer de réponse.";

  return NextResponse.json({ message });
}
