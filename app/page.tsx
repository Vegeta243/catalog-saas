"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap, PackageSearch, Sparkles, Bot, BarChart3, Image as ImageIcon,
  FileDown, Bell, Clock, ArrowRight, Check, Shield, Import,
  ChevronDown, TrendingUp, Rocket, Heart, Target, Users,
  Crown, ChevronRight, Play, Lock,
} from "lucide-react";

const PAIN_POINTS = [
  { emoji: "�", title: "Chaque jour sans optimisation, c'est une vente perdue", desc: "Un titre approximate, une description vide — et le client part chez un concurrent. Vous le savez. Vous n'avez juste pas le temps." },
  { emoji: "😩", title: "3 mois que vous repoussez ces 200 descriptions", desc: "Elles ne s'écriront pas toutes seules. Et chaque semaine qui passe, c'est autant de visibilité et de revenus en moins." },
  { emoji: "🤯", title: "Vous portez tout ça seul·e", desc: "Prix, stock, images, tags, descriptions — tout repose sur vous. Ce n'est pas de la gestion, c'est de l'épuisement." },
  { emoji: "📉", title: "Vous bossez dur. La boutique ne décolle pas.", desc: "Ce n'est pas un manque d'effort. C'est un catalogue sous-optimisé qui freine chaque client à chaque page produit." },
  { emoji: "⏰", title: "Le temps volé à votre vrai métier", desc: "Chaque heure passée à reformater, copier-coller ou corriger manuellement est une heure de moins pour vendre, créer et grandir." },
];

const STEPS = [
  { step: "1", title: "Connectez votre boutique Shopify", desc: "Installation en 30 secondes. Vos produits se synchronisent automatiquement. Aucune donnée n'est modifiée sans votre validation.", icon: Zap },
  { step: "2", title: "L'IA analyse et optimise tout", desc: "Descriptions percutantes, titres recherchés, tags pertinents — générés en un clic. Vous validez avant d'appliquer.", icon: Bot },
  { step: "3", title: "Votre catalogue travaille pour vous", desc: "Automatisations, alertes, suivi visibilité. Plus de tâches manuelles. Concentrez-vous sur ce qui compte : vendre.", icon: Rocket },
];

const FEATURES = [
  { icon: PackageSearch, title: "Édition en masse ultra-rapide", desc: "Modifiez prix, titres, descriptions et tags sur des centaines de produits en quelques clics. Fini le copier-coller." },
  { icon: Import, title: "Import AliExpress & CJ en 1 clic", desc: "Importez des produits depuis n'importe quelle URL fournisseur. Marge automatique, description IA incluse." },
  { icon: Sparkles, title: "Descriptions IA percutantes", desc: "Générez des descriptions qui vendent, adaptées à votre audience. Par lot de 10, 50 ou 200 produits." },
  { icon: TrendingUp, title: "SEO Shopify optimisé", desc: "Titres SEO, meta descriptions, tags structurés — faites remonter vos produits dans Google et la recherche interne Shopify." },
  { icon: BarChart3, title: "Score visibilité par produit", desc: "Visualisez la santé de chaque fiche produit. Identifiez en un coup d'œil ce qui manque." },
  { icon: Zap, title: "Automatisations intelligentes", desc: "Règles de prix, promotions programmées, ajustements automatiques. Votre catalogue s'optimise pendant que vous dormez." },
  { icon: ImageIcon, title: "Traitement d'images en masse", desc: "Compression, redimensionnement, watermark — en un seul clic sur toutes vos images produit." },
  { icon: FileDown, title: "Export CSV complet", desc: "Exportez votre catalogue entier en un fichier structuré. Sauvegarde, analyse, migration — tout est possible." },
  { icon: Bell, title: "Alertes stock et performance", desc: "Soyez prévenu quand un produit est en rupture ou quand un score chute. Ne ratez plus aucune opportunité." },
  { icon: Clock, title: "Historique de toutes les actions", desc: "Retrouvez chaque modification, chaque optimisation. Traçabilité complète de votre catalogue." },
];

const PLANS = [
  {
    id: "starter", name: "Starter", badge: "🥉",
    monthlyPrice: 39, yearlyPrice: 29, popular: false,
    target: "Pour les petites boutiques qui démarrent",
    fit: "Vous avez moins de 500 produits et cherchez à gagner du temps sur les tâches répétitives.",
    features: ["1 boutique Shopify", "Jusqu'à 500 produits", "Édition en masse complète", "Import produits : 20/mois", "1 000 tâches IA/mois", "Export CSV", "Alertes stock bas", "Support email (48h)", "50 actions gratuites pour démarrer"],
  },
  {
    id: "pro", name: "Pro", badge: "🥇",
    monthlyPrice: 89, yearlyPrice: 69, popular: true,
    target: "Pour les boutiques en croissance",
    fit: "Vous gérez un catalogue important et voulez automatiser votre croissance avec l'IA.",
    features: ["Jusqu'à 3 boutiques", "Produits illimités", "Tout Starter +", "Import illimité AliExpress & CJ", "20 000 tâches IA/mois", "Automatisations avancées", "Traitement images en masse", "Score visibilité par produit", "Alertes personnalisées", "Support prioritaire (24h)", "Démarrage immédiat • sans engagement"],
  },
  {
    id: "scale", name: "Scale", badge: "🏆",
    monthlyPrice: 179, yearlyPrice: 139, popular: false,
    target: "Pour les boutiques à grande échelle",
    fit: "Vous gérez plusieurs boutiques et avez besoin de performances maximales.",
    features: ["Boutiques illimitées", "Tout Pro +", "100 000 tâches IA/mois", "Automatisations illimitées", "Performance gros catalogues", "Support dédié (4h)", "Accès anticipé nouveautés", "Accès immédiat dès le paiement"],
  },
];

const FAQ_ITEMS = [
  { q: "Est-ce que mes produits sont modifiés sans mon accord ?", a: "Non, jamais. EcomPilot génère des suggestions que vous validez avant d'appliquer. Chaque modification passe par votre approbation — produit par produit ou en masse. Vous gardez le contrôle total." },
  { q: "Combien de temps faut-il pour tout mettre en place ?", a: "30 secondes pour connecter votre boutique. Vos produits se synchronisent automatiquement. En 5 minutes, vous pouvez déjà générer vos premières descriptions IA et modifier vos prix en masse." },
  { q: "C'est quoi exactement une action gratuite ?", a: "Chaque génération IA (titre, description, tags) ou import de produit compte pour 1 action. Vous démarrez avec 50 actions gratuites, sans carte bancaire. Une fois la limite atteinte, vous choisissez un plan adapté à vos besoins pour continuer." },
  { q: "Est-ce que ça fonctionne bien pour le dropshipping ?", a: "Absolument. EcomPilot est conçu pour les dropshippers : import direct depuis AliExpress et CJ Dropshipping, génération IA de descriptions uniques, ajustement automatique des marges." },
  { q: "Puis-je annuler à tout moment ?", a: "Oui, en 1 clic depuis votre tableau de bord. Aucun engagement, aucun frais caché. Si vous annulez, vous gardez l'accès jusqu'à la fin de votre période payée." },
  { q: "Quelle est la différence avec les apps Shopify classiques ?", a: "Les apps Shopify font une seule chose. EcomPilot centralise tout : édition en masse, IA, images, import, automatisations, score de visibilité. Un seul outil à la place de 5 apps séparées." },
  { q: "Faut-il une carte bancaire pour commencer ?", a: "Non. Vous démarrez gratuitement avec vos 50 premières actions, sans renseigner de carte. Vous n'en avez besoin que lorsque vous choisissez un plan payant, après avoir constaté la valeur de l'outil par vous-même." },
  { q: "Que se passe-t-il quand on atteint la limite des 50 actions ?", a: "Un message clair s'affiche pour vous proposer de passer à un plan payant. Vos données et votre boutique restent intactes. Vous choisissez votre plan et continuez là où vous vous êtes arrêté(e), immédiatement." },
];

const TESTIMONIALS = [
  { name: "Sophie M.", role: "Boutique mode", context: "Scénario illustratif", quote: "Optimiser des centaines de fiches produit en quelques heures, pas en plusieurs semaines : voilà ce qu’EcomPilot rend possible." },
  { name: "Marc L.", role: "Dropshipping multi-boutiques", context: "Scénario illustratif", quote: "L’import fournisseur couplé à la génération IA de descriptions uniques change complètement la gestion d’un catalogue." },
  { name: "Camille D.", role: "Artisanat", context: "Scénario illustratif", quote: "Le score visibilité par produit permet d’identifier exactement ce qui manque pour améliorer sa présence en ligne." },
];

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ══════ HEADER ══════ */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" style={{ color: "#fff" }} />
            </div>
            <span className="text-xl font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#problemes" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: "#475569" }}>Pourquoi ?</a>
            <a href="#fonctionnalites" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: "#475569" }}>Fonctionnalités</a>
            <a href="#tarifs" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: "#475569" }}>Tarifs</a>
            <a href="#faq" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: "#475569" }}>FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleNavigate("/login")}
              className="hidden sm:block px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
              style={{ color: "#0f172a" }}
            >
              Se connecter
            </button>
            <button
              onClick={() => handleNavigate("/login?tab=signup")}
              className="px-3 sm:px-5 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md shadow-blue-500/20 hover:-translate-y-0.5 whitespace-nowrap"
              style={{ color: "#fff" }}
            >
              <span className="hidden sm:inline">Essayer gratuitement →</span>
              <span className="sm:hidden">Essai gratuit</span>
            </button>
          </div>
        </div>
      </header>

      {/* ══════ HERO ══════ */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30" />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Sparkles className="w-3.5 h-3.5" /> Le copilote IA &bull; SEO &bull; Catalogue Shopify
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] mb-8" style={{ color: "#0f172a" }}>
            Laisse l&apos;IA travailler
            <br className="hidden sm:block" />
            <span style={{ color: "#2563eb" }}> à ta place.</span>
          </h1>
          <p className="text-lg md:text-2xl max-w-3xl mx-auto mb-6 leading-relaxed font-medium" style={{ color: "#0f172a" }}>
            Optimise ton catalogue Shopify, écrit les descriptions, gère le SEO.{" "}
            <span className="underline decoration-blue-500 decoration-2 underline-offset-4">En 30 secondes</span>{" "}
            au lieu de <span className="underline decoration-red-400 decoration-2 underline-offset-4">3 heures</span>.
          </p>
          <p className="text-lg max-w-2xl mx-auto mb-10 leading-relaxed" style={{ color: "#64748b" }}>
            SEO optimisé, descriptions percutantes en masse, automatisations intelligentes — la plateforme
            qui transforme votre catalogue en machine à vendre.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
            <button
              onClick={() => handleNavigate("/login?tab=signup")}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-bold flex items-center gap-3 transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
              style={{ color: "#fff" }}
            >
              Commencer l&apos;essai gratuit <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavigate("/login")}
              className="px-8 py-4 border-2 border-gray-300 hover:border-blue-400 rounded-xl text-base font-semibold transition-all hover:bg-blue-50/30 flex items-center gap-2"
              style={{ color: "#0f172a" }}
            >
              <Lock className="w-4 h-4" /> J&apos;ai déjà un compte
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 mb-12">
            <p className="flex items-center gap-1 text-sm" style={{ color: "#64748b" }}>
              <Shield className="w-4 h-4" style={{ color: "#059669" }} /> Sans carte bancaire • 50 actions offertes
            </p>
            <p className="flex items-center gap-1 text-sm" style={{ color: "#64748b" }}>
              <Check className="w-4 h-4" style={{ color: "#059669" }} /> Résiliation en 1 clic
            </p>
            <p className="flex items-center gap-1 text-sm" style={{ color: "#64748b" }}>
              <Clock className="w-4 h-4" style={{ color: "#059669" }} /> Configuration en 30 secondes
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="relative">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-300/30 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 text-xs" style={{ color: "#94a3b8" }}>app.ecompilot.fr/dashboard</span>
              </div>
              <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 sm:p-6 text-left">
                  <p className="text-sm font-medium" style={{ color: "#2563eb" }}>Produits gérés</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "#0f172a" }}>1 247</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: "#059669" }}>+12% ce mois</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 text-left">
                  <p className="text-sm font-medium" style={{ color: "#059669" }}>Temps économisé</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "#0f172a" }}>48h</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: "#059669" }}>ce mois</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 sm:p-6 text-left">
                  <p className="text-sm font-medium" style={{ color: "#7c3aed" }}>IA générées</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "#0f172a" }}>382</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: "#059669" }}>descriptions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SOCIAL PROOF BAR ══════ */}
      <section className="py-6 border-y border-gray-100" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 px-6">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5" style={{ color: "#2563eb" }} />
            <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>IA GPT-4o intégrée</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: "#059669" }} />
            <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>Compatible Shopify</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: "#d97706" }} />
            <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>Sécurisé & RGPD</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>Annulation sans frais</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5" style={{ color: "#059669" }} />
            <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>Paiement sécurisé Stripe</span>
          </div>
        </div>
      </section>

      {/* ══════ PAIN POINTS ══════ */}
      <section id="problemes" className="py-24 px-6" style={{ backgroundColor: "#fafafa" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#dc2626" }}>Le problème</p>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6" style={{ color: "#0f172a" }}>
              Vous reconnaissez-vous ?
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>
              Cochez une seule case — et vous savez déjà qu’EcomPilot est fait pour vous.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-red-200 hover:-translate-y-1 transition-all cursor-default group">
                <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform">{p.emoji}</span>
                <h4 className="text-sm font-bold mb-1.5 leading-tight" style={{ color: "#0f172a" }}>{p.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <button
              onClick={() => handleNavigate("/login?tab=signup")}
              className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-red-500/20"
              style={{ color: "#fff" }}
            >
              Arrêter de perdre du temps — essayer maintenant <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#2563eb" }}>La solution</p>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6" style={{ color: "#0f172a" }}>
              Comment ça marche ?
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>
              Trois étapes. Cinq minutes. Et votre catalogue commence à travailler pour vous.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative bg-gradient-to-b from-blue-50/80 to-white border border-blue-100 rounded-2xl p-8 text-center hover:shadow-lg transition-all">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold" style={{ color: "#fff" }}>
                    {s.step}
                  </div>
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-6 mt-4 flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
                    <Icon className="w-8 h-8" style={{ color: "#2563eb" }} />
                  </div>
                  <h3 className="text-lg font-bold mb-3" style={{ color: "#0f172a" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section id="fonctionnalites" className="py-24 px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#2563eb" }}>Fonctionnalités</p>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6" style={{ color: "#0f172a" }}>
              Tout ce dont vous avez besoin.<br />Au même endroit.
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>
              Un seul outil pour gérer, optimiser et automatiser votre catalogue Shopify. Plus besoin de jongler entre 5 apps.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: "#eff6ff" }}>
                    <Icon className="w-6 h-6" style={{ color: "#2563eb" }} />
                  </div>
                  <h4 className="text-base font-bold mb-2" style={{ color: "#0f172a" }}>{f.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <button
              onClick={() => handleNavigate("/login?tab=signup")}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
              style={{ color: "#fff" }}
            >
              Accéder à toutes les fonctionnalités <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════ TARIFS (moved up before testimonials) ══════ */}
      <section id="tarifs" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#2563eb" }}>Tarifs</p>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6" style={{ color: "#0f172a" }}>
              Des prix simples. Pas de surprise.
            </h2>
            <p className="text-lg mb-8" style={{ color: "#64748b" }}>
              Commencez avec <strong>50 actions gratuites</strong> — sans carte bancaire. Passez à un plan payant quand vous êtes convaincu(e).
            </p>
            <div className="inline-flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-full px-2 py-1.5">
              <button
                onClick={() => setBillingPeriod("monthly")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billingPeriod === "monthly" ? "bg-blue-600 shadow-md" : "hover:bg-white"}`}
                style={{ color: billingPeriod === "monthly" ? "#fff" : "#475569" }}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingPeriod("yearly")}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${billingPeriod === "yearly" ? "bg-blue-600 shadow-md" : "hover:bg-white"}`}
                style={{ color: billingPeriod === "yearly" ? "#fff" : "#475569" }}
              >
                Annuel <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: billingPeriod === "yearly" ? "rgba(255,255,255,0.2)" : "#dcfce7", color: billingPeriod === "yearly" ? "#fff" : "#16a34a" }}>-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {PLANS.map((plan) => {
              const price = billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              return (
                <div key={plan.id} className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col transition-all hover:shadow-xl ${plan.popular ? "border-blue-500 shadow-lg shadow-blue-500/10 scale-[1.02]" : "border-gray-200 hover:-translate-y-1"}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-blue-600 rounded-full text-xs font-bold tracking-wide flex items-center gap-1" style={{ color: "#fff" }}>
                      <Crown className="w-3 h-3" /> LE PLUS POPULAIRE
                    </div>
                  )}
                  <div className="mb-6">
                    <span className="text-2xl mr-2">{plan.badge}</span>
                    <h3 className="text-xl font-bold inline" style={{ color: "#0f172a" }}>{plan.name}</h3>
                    <p className="text-sm mt-2" style={{ color: "#64748b" }}>{plan.target}</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-5xl font-extrabold" style={{ color: "#0f172a" }}>{price}€</span>
                    <span className="text-sm" style={{ color: "#64748b" }}>/mois</span>
                    {billingPeriod === "yearly" && (
                      <p className="text-xs mt-1 font-medium" style={{ color: "#059669" }}>soit {plan.yearlyPrice * 12}€/an au lieu de {plan.monthlyPrice * 12}€</p>
                    )}
                    {billingPeriod === "monthly" && (
                      <p className="text-xs mt-1" style={{ color: "#059669" }}>ou {plan.yearlyPrice}€/mois en annuel <span className="font-bold" style={{ color: "#dc2626" }}>(-20%)</span></p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                        <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#059669" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="p-3 rounded-xl mb-6" style={{ backgroundColor: "#f0fdf4" }}>
                    <p className="text-xs leading-relaxed" style={{ color: "#166534" }}>{plan.fit}</p>
                  </div>
                  <button
                    onClick={() => {
                      const pId = plan.id;
                      const billing = billingPeriod;
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('ecompilot_pending_plan', pId);
                        localStorage.setItem('ecompilot_pending_billing', billing);
                      }
                      handleNavigate(`/login?tab=signup&plan=${pId}&billing=${billing}`);
                    }}
                    className={`block text-center py-4 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20" : "bg-gray-900 hover:bg-gray-800"}`}
                    style={{ color: "#fff" }}
                  >
                    Démarrer gratuitement
                  </button>
                </div>
              );
            })}
          </div>

          {/* Already have account CTA */}
          <div className="text-center mt-8">
            <button
              onClick={() => handleNavigate("/login")}
              className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
              style={{ color: "#64748b" }}
            >
              <Users className="w-4 h-4" /> Déjà cliente ou client ? Se connecter
            </button>
          </div>
        </div>
      </section>

      {/* ══════ UPGRADE SECTION ══════ */}
      <section className="py-20 px-6" style={{ backgroundColor: "#0f172a" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ backgroundColor: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
              <Crown className="w-3.5 h-3.5" /> Montez en puissance
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#fff" }}>
              Commencez petit, grandissez sans limite.
            </h2>
            <p className="text-lg" style={{ color: "#94a3b8" }}>
              Votre plan s&apos;adapte à votre croissance. Changez d&apos;offre en un clic, sans perdre vos données.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { plan: "Starter → Pro", icon: "🚀", trigger: "Vous dépassez 500 produits ou avez besoin de plus d'IA", benefits: ["×6 tâches IA (300/mois)", "Import illimité AliExpress & CJ", "Jusqu'à 3 boutiques", "Support prioritaire 24h"] },
              { plan: "Pro → Scale", icon: "🏆", trigger: "Vous gérez plusieurs boutiques ou voulez des performances maximales", benefits: ["×3.3 tâches IA (1 000/mois)", "Boutiques illimitées", "Automatisations illimitées", "Support dédié en 4h"] },
              { plan: "Annuel (-20%)", icon: "💰", trigger: "Vous utilisez EcomPilot depuis plus d'un mois", benefits: ["20% d'économies garanties", "Même plan, moins cher", "Changement en 1 clic", "Accès anticipé nouveautés"] },
            ].map((u) => (
              <div key={u.plan} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all">
                <span className="text-3xl mb-4 block">{u.icon}</span>
                <h3 className="text-lg font-bold mb-2" style={{ color: "#fff" }}>{u.plan}</h3>
                <p className="text-xs mb-4" style={{ color: "#94a3b8" }}>{u.trigger}</p>
                <ul className="space-y-2">
                  {u.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-sm" style={{ color: "#34d399" }}>
                      <Check className="w-3.5 h-3.5 shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleNavigate("/login?tab=signup")}
                  className="mt-6 w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ backgroundColor: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}
                >
                  Démarrer et monter en grade →
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <button
              onClick={() => handleNavigate("/login?tab=signup")}
              className="inline-flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/30"
              style={{ color: "#fff" }}
            >
              Choisir mon plan et démarrer <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════ EMOTIONAL SECTION ══════ */}
      <section className="py-24 px-6" style={{ backgroundColor: "#fff" }}>
        <div className="max-w-4xl mx-auto text-center">
          <Heart className="w-12 h-12 mx-auto mb-8" style={{ color: "#f43f5e" }} />
          <h2 className="text-3xl md:text-5xl font-extrabold mb-8 leading-tight" style={{ color: "#0f172a" }}>
            Vous n&apos;avez pas lancé votre boutique<br />pour passer vos nuits à écrire des fiches produit.
          </h2>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto mb-6" style={{ color: "#475569" }}>
            Vous l&apos;avez lancée pour <span style={{ color: "#2563eb" }} className="font-bold">créer quelque chose qui compte</span>. Pour prouver que vous pouvez vivre de votre passion. Pour construire un business qui génère des revenus pendant que vous dormez.
          </p>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto mb-12" style={{ color: "#475569" }}>
            <span className="font-bold" style={{ color: "#dc2626" }}>Chaque heure passée à copier-coller des descriptions</span>, c&apos;est une heure de moins pour trouver de nouveaux fournisseurs, lancer une campagne, ou tout simplement profiter de votre vie.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[
              { stat: "3h → 5min", label: "Pour optimiser 50 fiches produit", color: "#2563eb", bg: "#eff6ff" },
              { stat: "×2.5", label: "Valeur perçue avec de vraies descriptions", color: "#059669", bg: "#f0fdf4" },
              { stat: "0€", label: "Requis pour démarrer — sans carte bancaire", color: "#7c3aed", bg: "#faf5ff" },
            ].map((s) => (
              <div key={s.stat} className="rounded-2xl p-6" style={{ backgroundColor: s.bg }}>
                <p className="text-4xl font-extrabold mb-2" style={{ color: s.color }}>{s.stat}</p>
                <p className="text-sm font-medium" style={{ color: "#374151" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleNavigate("/login?tab=signup")}
              className="inline-flex items-center gap-2 px-10 py-5 bg-blue-600 hover:bg-blue-700 rounded-xl text-lg font-bold transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/25"
              style={{ color: "#fff" }}
            >
              <Target className="w-5 h-5" /> Reprendre le contrôle — 50 actions offertes
            </button>
            <button
              onClick={() => handleNavigate("/login")}
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-gray-200 hover:border-blue-300 rounded-xl text-base font-semibold transition-all hover:bg-blue-50"
              style={{ color: "#475569" }}
            >
              Me connecter à mon compte
            </button>
          </div>
        </div>
      </section>

      {/* ══════ TESTIMONIALS ══════ */}
      <section className="py-24 px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#2563eb" }}>Ce qu’EcomPilot rend possible</p>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6" style={{ color: "#0f172a" }}>
              Des résultats concrets pour votre boutique.
            </h2>
            <p className="text-sm" style={{ color: "#94a3b8" }}>Scénarios illustratifs basés sur l&apos;usage typique de l&apos;outil. Ces exemples ne constituent pas des témoignages réels. Les résultats varient selon votre catalogue et votre utilisation.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all">
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                  {t.context}
                </span>
                <p className="text-base leading-relaxed mb-6 italic" style={{ color: "#374151" }}>&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{t.name}</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ FAQ ══════ */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#2563eb" }}>FAQ</p>
            <h2 className="text-4xl font-extrabold mb-6" style={{ color: "#0f172a" }}>Questions fréquentes</h2>
            <p className="text-lg" style={{ color: "#64748b" }}>Tout ce que vous devez savoir avant de vous lancer.</p>
          </div>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden hover:border-blue-200 transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base font-semibold pr-4" style={{ color: "#0f172a" }}>{item.q}</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`} style={{ color: "#94a3b8" }} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 border-t border-gray-100">
                    <p className="text-sm leading-relaxed pt-4" style={{ color: "#475569" }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CTA FINAL ══════ */}
      <section className="py-24 px-6 relative overflow-hidden" style={{ backgroundColor: "#0f172a" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-indigo-900/20" />
        <div className="max-w-3xl mx-auto text-center relative">
          <Rocket className="w-12 h-12 mx-auto mb-8" style={{ color: "#60a5fa" }} />
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight" style={{ color: "#fff" }}>
            Votre catalogue mérite<br />mieux que du copier-coller.
          </h2>
          <p className="text-xl mb-4 leading-relaxed" style={{ color: "#94a3b8" }}>
            Rejoignez les marchands qui ont choisi de travailler plus intelligemment.
          </p>
          <p className="text-lg mb-10 font-medium" style={{ color: "#60a5fa" }}>
            50 actions gratuites · Aucune carte requise · Accès immédiat
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleNavigate("/login?tab=signup")}
              className="inline-flex items-center gap-3 px-10 py-5 bg-white hover:bg-gray-50 rounded-xl text-lg font-bold transition-all hover:-translate-y-0.5 shadow-lg"
              style={{ color: "#0f172a" }}
            >
              Commencer gratuitement <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNavigate("/login")}
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 rounded-xl text-base font-semibold transition-all hover:bg-white/5"
              style={{ color: "#94a3b8" }}
            >
              <ChevronRight className="w-4 h-4" /> Me connecter
            </button>
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-gray-200 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" style={{ color: "#fff" }} />
              </div>
              <span className="text-lg font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></span>
              <span className="text-xs ml-2" style={{ color: "#94a3b8" }}>Le copilote de votre catalogue Shopify</span>
            </div>
            <div className="flex items-center gap-6 text-sm" style={{ color: "#64748b" }}>
              <Link href="/cgu" className="hover:text-blue-600 transition-colors">CGU</Link>
              <Link href="/politique-confidentialite" className="hover:text-blue-600 transition-colors">Confidentialité</Link>
              <Link href="/mentions-legales" className="hover:text-blue-600 transition-colors">Mentions légales</Link>
              <a href="mailto:contact@ecompilot.fr" className="hover:text-blue-600 transition-colors">Contact</a>
              <button onClick={() => handleNavigate("/login")} className="hover:text-blue-600 transition-colors">Se connecter</button>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-xs" style={{ color: "#94a3b8" }}>© 2026 EcomPilot — Tous droits réservés. Paiement sécurisé par Stripe.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
