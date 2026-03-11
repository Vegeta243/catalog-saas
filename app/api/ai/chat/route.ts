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

function getSmartDemoReply(msg: string, page?: string, plan?: string): string {
  const m = msg.toLowerCase();

  // Greetings
  if (/^(bonjour|salut|hello|hi|hey|coucou|bonsoir)/.test(m) || m.length < 5) {
    return `Bonjour ! Je suis l'assistant EcomPilot 👋\n\nJe peux vous aider avec :\n• **Optimisation produits** — titres SEO, descriptions, tags\n• **Modification en masse** — prix, statuts, tags sur plusieurs produits\n• **Images** — redimensionner, convertir, améliorer\n• **Automatisations** — règles automatiques stock/prix\n• **Connexion Shopify** — configuration et synchronisation\n\nQue souhaitez-vous faire ?`;
  }

  // Products / catalogue
  if (/produit|catalogue|fiche|article|listing/.test(m)) {
    if (/masse|bulk|plusieurs|multiple|tout/.test(m)) {
      return `Pour modifier vos produits **en masse** 📦 :\n\n1. Allez sur la page **Produits**\n2. Cochez les produits à modifier\n3. Utilisez la **barre d'actions** qui apparaît en bas\n4. Modifiez prix, tags, statuts ou générez du contenu IA en un clic\n\nVous pouvez aussi utiliser l'onglet **Modification en masse** pour des changements structurés.`;
    }
    if (/prix|price/.test(m)) {
      return `Pour modifier les **prix** de vos produits :\n\n• **Un produit** : cliquez sur le produit → modifiez le prix directement\n• **Plusieurs produits** : cochez-les → barre d'actions → Modifier les prix\n• **Tous les produits** : page Modification en masse → champ Prix → appliquer\n\nVous pouvez augmenter/diminuer en % ou définir un prix fixe.`;
    }
    return `Vos produits Shopify sont synchronisés automatiquement dans EcomPilot.\n\n**Actions disponibles :**\n• Modifier titre, description, tags, prix\n• Générer du contenu IA optimisé SEO\n• Modifier en masse plusieurs produits simultanément\n• Voir le score SEO de chaque fiche\n\nOù voulez-vous commencer ?`;
  }

  // SEO / optimization
  if (/seo|optim|score|description|titre|title|tag|meta/.test(m)) {
    if (/score/.test(m)) {
      return `Le **score SEO** (0–100) évalue vos fiches produits sur 4 critères :\n\n• 📝 **Titre** (25 pts) — idéalement 50–70 caractères\n• 📄 **Description** (40 pts) — 100+ mots recommandés\n• 🏷️ **Tags** (20 pts) — 5+ tags recommandés\n• 🖼️ **Images** (15 pts) — 3+ images = score max\n\nUn score > 70 est excellent. Utilisez l'IA pour améliorer automatiquement les fiches faibles.`;
    }
    if (/meta/.test(m)) {
      return `Pour générer vos **méta-titres et méta-descriptions** :\n\n1. Allez sur **Optimisation IA**\n2. Sélectionnez vos produits\n3. Cliquez **Générer** → l'IA crée des méta-données optimisées\n4. Vérifiez et appliquez en un clic\n\nLes méta-données sont directement envoyées à Shopify.`;
    }
    return `**Optimisation IA** disponible sur la page dédiée :\n\n1. Sélectionnez les produits à optimiser\n2. Choisissez le mode : titre, description, ou **tout optimiser**\n3. L'IA génère du contenu SEO personnalisé\n4. Prévisualisez et appliquez\n\nChaque optimisation utilise 1 tâche de votre quota ${plan === "free" ? "(30 tâches/mois sur le plan gratuit)" : ""}.`;
  }

  // Images
  if (/image|photo|visuel|webp|jpeg|png|redimensi|convert|recadr/.test(m)) {
    return `**Éditeur d'images** EcomPilot :\n\n• Formats acceptés : JPEG, PNG, WebP\n• Redimensionnement aux formats standards (Shopify, Instagram, Facebook…)\n• Conversion WebP (recommandé pour la performance web)\n• Compression sans perte de qualité\n\nAccédez-y via **Éditeur d'images** dans le menu. Glissez-déposez vos images pour commencer.`;
  }

  // Automation
  if (/automat|règle|rule|stock|alerte|archive|planif|scheduler/.test(m)) {
    return `**Automatisations** EcomPilot :\n\nCréez des règles qui s'exécutent automatiquement :\n\n• 📉 Stock bas → ajouter un tag "rupture"\n• 💰 Prix sous un seuil → envoyer une alerte\n• 📦 Produit non vendu → archiver après X jours\n• 🗓️ Planification → modifier prix pour une période\n\nPage **Automatisations** → **Nouvelle règle** → définir la condition et l'action.`;
  }

  // Shopify connection
  if (/shopify|connect|boutique|shop|oauth|install/.test(m)) {
    return `**Connexion Shopify** :\n\n1. Menu gauche → **Mes boutiques** → **Ajouter une boutique**\n2. Entrez votre domaine (ex : ma-boutique ou ma-boutique.myshopify.com)\n3. Cliquez **Ajouter** puis **Connecter** (bouton orange)\n4. Autorisez l'accès dans Shopify\n\nVos produits se synchronisent automatiquement après la connexion. En cas de problème, vérifiez que votre boutique est active sur Shopify.`;
  }

  // Billing / plan / credits
  if (/plan|tarif|prix|forfait|abonn|crédit|tâche|limit|quota|upgrade|gratuit|free|pro/.test(m)) {
    const planInfo = plan === "free"
      ? "Vous êtes sur le **plan gratuit** (30 tâches/mois)."
      : plan ? `Vous êtes sur le **plan ${plan}**.` : "";
    return `${planInfo}\n\n**Plans disponibles :**\n• 🆓 **Gratuit** — 30 tâches/mois\n• ⚡ **Pro** — 200 tâches/mois\n• 🚀 **Business** — 1 000 tâches/mois\n\nPour changer de plan → **Mon forfait** dans le menu. Vos tâches se renouvellent chaque mois.`.trim();
  }

  // Calendar
  if (/calendrier|calendar|planif|schedule|agenda/.test(m)) {
    return `**Calendrier marketing** :\n\nPlanifiez vos actions à l'avance :\n• Modifications de prix pour les soldes\n• Changements de statut / archivage\n• Campagnes produits\n\nPage **Calendrier** → **Nouvelle action** → choisissez la date et l'action à exécuter.`;
  }

  // Profitability / margins
  if (/rentab|marge|profit|coût|cost|bénéfice|benefit/.test(m)) {
    return `**Rentabilité** EcomPilot :\n\nCalculez vos marges en intégrant :\n• Prix de vente Shopify\n• Coût de revient (que vous saisissez)\n• Frais Shopify et marketing\n\nPage **Rentabilité** → entrez vos coûts → visualisez marges et profits par produit.`;
  }

  // Competitors
  if (/concurren|competitor|veille|spy/.test(m)) {
    return `**Suivi concurrents** :\n\nSurveillance des prix et offres concurrentes :\n• Ajoutez des URL concurrents\n• Recevez des alertes de changement de prix\n• Comparez avec vos propres prix\n\nPage **Concurrence** → **Ajouter un concurrent**.`;
  }

  // Help / support
  if (/aide|help|support|problème|problem|bug|erreur|error/.test(m)) {
    return `Pour obtenir de **l'aide** :\n\n• 📖 **FAQ** — page Aide → FAQ (réponses aux questions fréquentes)\n• 🎫 **Support** — page Aide → Nouvelle demande (ticket répondu sous 24h)\n• 💬 **Ici** — posez votre question dans ce chat\n\nDécrivez votre problème et je ferai de mon mieux pour vous aider !`;
  }

  // Account / profile
  if (/compte|profil|profile|mot de passe|password|email|avatar/.test(m)) {
    return `Pour gérer votre **compte** :\n\n• **Profil** → modifier nom, prénom, avatar\n• **Email** → contactez le support pour changer votre email\n• **Mot de passe** → page Profil → Sécurité → Changer le mot de passe\n• **Supprimer le compte** → page Profil → zone danger\n\nAccédez à votre profil via l'icône en bas du menu.`;
  }

  // Context-based page hints
  if (page) {
    if (page.includes("products")) {
      return `Vous êtes sur la page **Produits**. Astuces :\n\n• Cochez plusieurs produits → barre d'actions pour les modifier en masse\n• Cliquez sur un produit pour voir le détail et optimiser\n• Filtrez par score SEO pour identifier les fiches à améliorer\n\nQue voulez-vous faire avec vos produits ?`;
    }
    if (page.includes("ai")) {
      return `Vous êtes sur **Optimisation IA**. Pour commencer :\n\n1. Filtrez les produits par score SEO bas\n2. Sélectionnez-les\n3. Cliquez **Générer** pour créer du contenu SEO optimal\n4. Prévisualisez et appliquez\n\nL'IA génère titres, descriptions et tags optimisés pour Shopify.`;
    }
    if (page.includes("help")) {
      return `Vous êtes dans le **Centre d'aide**. Je suis là pour vous aider !\n\nPosez votre question et je vous guide. Vous pouvez aussi :\n• Consulter la **FAQ** pour les questions fréquentes\n• Créer un **ticket support** si vous avez un problème technique\n\nQue puis-je faire pour vous ?`;
    }
  }

  // Default fallback
  return `Je suis l'assistant EcomPilot. Je peux vous aider avec :\n\n• 📦 Gestion et optimisation de vos **produits Shopify**\n• 🤖 **Optimisation IA** — titres SEO, descriptions, tags\n• 🖼️ **Éditeur d'images** — redimensionner, convertir\n• ⚙️ **Automatisations** — règles automatiques\n• 💰 **Facturation** — plans et quotas\n• 🔗 **Connexion Shopify**\n\nPosez votre question !`;
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
