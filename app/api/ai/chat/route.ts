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
  tasksRemaining: z.number().int().min(0).optional(),
  tasksTotal: z.number().int().min(0).optional(),
});

const SYSTEM_PROMPT = `Tu es l'assistant IA d'EcomPilot, un SaaS e-commerce qui aide les marchands Shopify à optimiser leur catalogue produits. Tu répondras en français, de façon concise, claire et utile.

Fonctionnalités disponibles dans EcomPilot :
- **Modifier en masse** : modifier prix, tags, statuts, titres de plusieurs produits en une fois
- **Optimisation IA** : générer titres SEO, descriptions, méta-titres et méta-descriptions avec GPT-4o-mini
- **Éditeur d'images** : améliorer, recadrer, convertir des visuels produits (JPEG, PNG, WebP)
- **Automatisations** : créer des règles automatiques (baisse de prix, alerte stock, archivage)
- **Calendrier** : planifier des actions marketing
- **Rentabilité** : calculer marges et profits
- **Concurrence (BETA)** : suivre les concurrents et leurs prix
- **Recherche IA (Pro+)** : trouver des produits gagnants avec l'IA sur AliExpress, CJ, Temu, Amazon
- **Création boutique IA (Scale)** : créer une boutique Shopify complète automatiquement
- **Parrainage** : inviter des amis et gagner 1 mois offert par filleul converti

Recommandations d'upgrade selon le plan :
- Free (30 tâches/mois) → Starter (19€, 1000 tâches)
- Starter → Pro (49€, 20000 tâches, 10 boutiques)
- Pro → Scale (129€, 100000 tâches, boutiques illimitées + création boutique IA)

Sois toujours précis, encourage l'utilisateur à explorer les fonctionnalités et réponds aux questions techniques comme un expert e-commerce et dropshipping.`;

// Normalize: remove accents, lowercase — so "tâche"="tache", "règle"="regle", etc.
function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function has(m: string, ...patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(m));
}

function getSmartDemoReply(msg: string, page?: string, plan?: string, tasksRemaining?: number, tasksTotal?: number): string {
  const m = normalize(msg);

  // ── Greetings ──────────────────────────────────────────────────────────────
  if (/^(bonjour|salut|hello|hi|hey|coucou|bonsoir|yo|ola)/.test(m) || m.length < 4) {
    return `Bonjour ! Je suis l'assistant EcomPilot 👋\n\nJe peux vous aider avec :\n• **Optimisation produits** — titres SEO, descriptions, tags\n• **Modification en masse** — prix, statuts sur plusieurs produits\n• **Images** — redimensionner, convertir, améliorer\n• **Automatisations** — règles automatiques stock/prix\n• **Connexion Shopify** — configuration et sync\n\nQue souhaitez-vous faire ?`;
  }

  // ── Tâches / quota / plan ──────────────────────────────────────────────────
  if (has(m,
    /tache|credit|quota|action.?restant|restant.?action|il.?me.?reste|combien.*rest|reste.*combien/,
    /\bplan\b|forfait|tarif|abonnement|upgrade|downgrade|gratuit|free\b|pro\b|business\b|prix.*(\bplan\b|forfait)/,
    /renouvell|mensuel|mois|limite.*(tache|action|credit)/
  )) {
    // Derive display plan from tasksTotal if plan field is stale
    const derivedPlan = (() => {
      if (plan && plan !== "free") return plan;
      if (tasksTotal !== undefined) {
        if (tasksTotal >= 100000) return "scale";
        if (tasksTotal >= 20000) return "pro";
        if (tasksTotal >= 1000) return "starter";
      }
      return plan || "free";
    })();
    const displayPlan = derivedPlan.charAt(0).toUpperCase() + derivedPlan.slice(1);
    const remainingStr = tasksRemaining !== undefined ? tasksRemaining.toLocaleString("fr-FR") : "—";
    const totalStr = tasksTotal !== undefined ? tasksTotal.toLocaleString("fr-FR") : "—";
    const limits: Record<string, string> = {
      free: "30 tâches/mois", starter: "1 000 tâches/mois",
      pro: "20 000 tâches/mois", scale: "100 000 tâches/mois",
    };
    const planLimit = limits[derivedPlan] || `${totalStr} tâches/mois`;
    return `Vous êtes sur le **plan ${displayPlan}** (${planLimit}).\n\nVos tâches restantes ce mois : **${remainingStr} tâches** sur ${totalStr}.\nRenouvellement automatique le 1er du mois.\n\nPour voir le détail → menu gauche → **Mon forfait**.`;
  }

  // ── Produits en masse ──────────────────────────────────────────────────────
  if (has(m, /modifier.*(masse|bulk|tous|plusieurs|multiple)/, /masse|bulk.?edit|modification.*(masse|groupe)/)) {
    return `Pour modifier vos produits **en masse** 📦 :\n\n1. Allez sur la page **Produits**\n2. Cochez les produits à modifier\n3. La **barre d'actions** apparaît en bas\n4. Modifiez prix, tags, statuts ou générez du contenu IA\n\nOu utilisez directement la page **Modifier en masse** dans le menu pour des changements structurés sur tout votre catalogue.`;
  }

  // ── Prix ───────────────────────────────────────────────────────────────────
  if (has(m, /modifier.*prix|changer.*prix|prix.*(produit|article)|mettre.*(prix|tarif)/)) {
    return `Pour modifier les **prix** :\n\n• **Un seul produit** : cliquez sur le produit → modifiez le prix\n• **Plusieurs produits** : cochez-les → barre d'actions → Modifier les prix\n• **En masse** : page **Modifier en masse** → champ Prix\n\nVous pouvez augmenter/diminuer en % ou définir un prix fixe pour tous les produits sélectionnés.`;
  }

  // ── Score SEO ──────────────────────────────────────────────────────────────
  if (has(m, /score.?seo|seo.?score|score.*produit|note.*seo/)) {
    return `Le **score SEO** (0–100) évalue chaque fiche sur 4 critères :\n\n• 📝 **Titre** (25 pts) — idéalement 50–70 caractères\n• 📄 **Description** (40 pts) — 100+ mots recommandés\n• 🏷️ **Tags** (20 pts) — 5+ tags recommandés\n• 🖼️ **Images** (15 pts) — 3+ images = score max\n\nScore > 70 = excellent ✅. Utilisez l'**Optimisation IA** pour améliorer automatiquement les fiches faibles.`;
  }

  // ── Méta / SEO optimisation ────────────────────────────────────────────────
  if (has(m, /meta.?title|meta.?desc|meta.?donnee|metadonnee|balise/)) {
    return `Pour générer vos **méta-titres et méta-descriptions** :\n\n1. Page **Optimisation IA** dans le menu\n2. Sélectionnez vos produits\n3. Cliquez **Générer** → l'IA crée des méta-données optimisées\n4. Vérifiez et appliquez en un clic\n\nLes méta-données sont envoyées directement à Shopify.`;
  }

  // ── IA / Optimisation — BEFORE generic "produit" to catch "optimiser fiches" ─
  if (has(m, /\bia\b|intelligence.?artific|gpt|optimi|generer|genere|titre.?seo|description.?(ia|genere|auto)|ameliorer.*(fiche|produit)/)) {
    return `**Optimisation IA** — page dédiée dans le menu :\n\n1. Filtrez vos produits par score SEO bas\n2. Cochez ceux à optimiser\n3. Choisissez : titre, description, tags ou **tout optimiser**\n4. L'IA génère du contenu SEO personnalisé\n5. Prévisualisez et appliquez en un clic\n\nChaque optimisation consomme 1 tâche de votre quota mensuel.`;
  }

  // ── Rentabilité — BEFORE generic "produit" to catch "coût de revient produit" ─
  if (has(m, /rentab|marge|profit|cout|benefice|revient|commission/)) {
    return `**Rentabilité** EcomPilot :\n\nCalculez vos marges en intégrant :\n• Prix de vente Shopify\n• Coût de revient (que vous saisissez)\n• Frais Shopify et marketing\n\nPage **Rentabilité** → entrez vos coûts → visualisez marges et profits par produit.`;
  }

  // ── Produits (général) ────────────────────────────────────────────────────
  if (has(m, /produit|catalogue|fiche|article|listing|synchronis|shopify.*(produit|sync)|importer/)) {
    return `Vos produits Shopify sont synchronisés automatiquement dans EcomPilot.\n\n**Ce que vous pouvez faire :**\n• Modifier titre, description, tags, prix\n• Générer du contenu IA optimisé SEO\n• Modifier en masse plusieurs produits à la fois\n• Voir et améliorer le score SEO de chaque fiche\n\nPage **Produits** dans le menu → sélectionnez un produit pour commencer.`;
  }

  // ── Images ────────────────────────────────────────────────────────────────
  if (has(m, /image|photo|visuel|redimensionn|convertir|webp|jpeg|png|recadr|format.*(image|photo)|editeur.*(image|photo)/)) {
    return `**Éditeur d'images** EcomPilot :\n\n• **Redimensionner** vos images produits en un clic\n• **Convertir** au format WebP, JPEG ou PNG\n• **Recadrer** pour respecter les ratios Shopify\n• **Améliorer** la qualité et la luminosité\n\nPage **Éditeur d'images** dans le menu → importez vos images ou appliquez les modifications directement depuis la fiche produit.\n\nChaque modification consomme 1 tâche.`;
  }

  // ── Automatisations ───────────────────────────────────────────────────────
  if (has(m, /automat|workflow|declench|trigger|regle(?!.*seo)|alerte|programmer.*(action|règle)|action.*(auto|condition)/)) {
    return `**Automatisations** EcomPilot :\n\nCréez des règles qui s'exécutent automatiquement :\n• 📉 **Alerte stock bas** → notification quand un produit est presque épuisé\n• 💰 **Baisse de prix auto** → réduire les prix après X jours sans vente\n• 📦 **Archivage auto** → archiver les produits hors stock depuis longtemps\n\nPage **Automatisations** dans le menu → **Nouvelle règle** → configurez conditions et actions.\n\n*Disponible à partir du plan Starter.*`;
  }

  // ── Shopify (connexion / boutique) ────────────────────────────────────────
  if (has(m, /connecter|reconnect|ajouter.*(boutique|shop|magasin)|integr.*(shopify|boutique)|boutique.*(ajout|connect|config)|shopify.*(connect|ajout|integr|config)/)) {
    return `**Connecter votre boutique Shopify** :\n\n1. Menu → **Mes boutiques** → **Ajouter une boutique**\n2. Entrez votre URL Shopify (ex: ma-boutique.myshopify.com)\n3. Autorisez EcomPilot dans votre espace Shopify\n4. La synchronisation démarre automatiquement\n\nVos produits, prix et stocks sont ensuite synchronisés en temps réel.\n\n*Si votre boutique est déjà connectée et dysfonctionne, utilisez le bouton **Reconnecter** sur la page Mes boutiques.*`;
  }

  // ── Calendrier ────────────────────────────────────────────────────────────
  if (has(m, /calendrier|planifi|programmer.*(action|vente|promo)|schedule|prevu|prévu|campagne/)) {
    return `**Calendrier** EcomPilot :\n\nPlanifiez vos actions marketing à l'avance :\n• 📅 Programmez des changements de prix (soldes, promos)\n• 🔔 Planifiez des optimisations IA en masse\n• 📊 Visualisez toutes vos actions sur le calendrier mensuel\n\nPage **Calendrier** dans le menu → cliquez sur une date → ajoutez une action planifiée.`;
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

  const rl = await checkRateLimit(user.id, "ai.generate");
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
  const { messages, currentPage } = parsed.data;
  let { plan, tasksRemaining, tasksTotal } = parsed.data;

  // Fetch fresh user context from DB for a richer, accurate system prompt
  try {
    const [{ data: userData }, { data: shopData }, { count: productCount }] = await Promise.all([
      supabase.from("users").select("plan, actions_used, actions_limit").eq("id", user.id).single(),
      supabase.from("shops").select("name").eq("user_id", user.id).limit(1).single(),
      supabase.from("import_history").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    if (userData) {
      plan = userData.plan || plan || "free";
      const used = userData.actions_used || 0;
      const limit = userData.actions_limit || 30;
      tasksTotal = limit;
      tasksRemaining = Math.max(0, limit - used);
    }
    const shopName = shopData?.name;
    const products = productCount ?? 0;
    // Attach these to local vars for contextNote below
    (parsed.data as { _shopName?: string })._shopName = shopName || undefined;
    (parsed.data as { _products?: number })._products = products;
  } catch { /* non-blocking */ }

  const shopName = (parsed.data as { _shopName?: string })._shopName;
  const productCount2 = (parsed.data as { _products?: number })._products;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-DEMO") || apiKey.startsWith("sk-test")) {
    const lastUserMsg = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const demoReply = getSmartDemoReply(lastUserMsg, currentPage, plan, tasksRemaining, tasksTotal);
    return NextResponse.json({ message: demoReply, demo: true });
  }

  const planStr = plan || "free";
  const remainStr = tasksRemaining !== undefined ? `${tasksRemaining}/${tasksTotal}` : "inconnu";
  const shopStr = shopName ? `Boutique principale : "${shopName}". ` : "";
  const productsStr = productCount2 !== undefined ? `Produits importés : ${productCount2}. ` : "";
  const pageStr = currentPage ? `Page courante : "${currentPage}". ` : "";
  const contextNote = `\n\nContexte utilisateur : Plan "${planStr}", tâches restantes ce mois : ${remainStr}. ${shopStr}${productsStr}${pageStr}Utilisez ces informations pour personnaliser vos réponses.`;

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
