"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap, PackageSearch, Sparkles, Bot, BarChart3,
  FileDown, Clock, ArrowRight, Check, Shield, Import,
  ChevronDown, TrendingUp, Rocket, Heart, Target, Users,
  Crown, ChevronRight, Lock,
} from "lucide-react";

const PAIN_POINTS = [
  { emoji: "📦", title: "Chaque jour sans optimisation, c'est une vente perdue", desc: "Un titre approximatif, une description vide — et le client part chez un concurrent." },
  { emoji: "😩", title: "3 mois que vous repoussez ces 200 descriptions", desc: "Elles ne s'écriront pas toutes seules. Chaque semaine perdue = revenus en moins." },
  { emoji: "🤯", title: "Vous portez tout ça seul·e", desc: "Prix, stock, images, tags, descriptions — tout repose sur vous. C'est de l'épuisement." },
  { emoji: "📉", title: "Vous bossez dur. La boutique ne décolle pas.", desc: "Ce n'est pas un manque d'effort. C'est un catalogue sous-optimisé qui freine chaque client." },
  { emoji: "⏰", title: "Le temps volé à votre vrai métier", desc: "Chaque heure à copier-coller est une heure de moins pour vendre, créer et grandir." },
];

const STEPS = [
  { step: "1", title: "Connectez votre boutique Shopify", desc: "Installation en 30 secondes. Vos produits se synchronisent automatiquement.", icon: Zap },
  { step: "2", title: "L'IA analyse et optimise tout", desc: "Descriptions percutantes, titres recherchés, tags pertinents — générés en un clic.", icon: Bot },
  { step: "3", title: "Votre catalogue travaille pour vous", desc: "Automatisations, alertes, suivi visibilité. Concentrez-vous sur vendre.", icon: Rocket },
];

const FEATURES = [
  { icon: PackageSearch, title: "Édition en masse ultra-rapide", desc: "Modifiez prix, titres, descriptions et tags sur des centaines de produits en quelques clics. Fini le copier-coller." },
  { icon: Import, title: "Import AliExpress en 1 clic", desc: "Importez des produits depuis n'importe quelle URL fournisseur. Marge automatique, description IA incluse." },
  { icon: Sparkles, title: "Descriptions IA percutantes", desc: "Générez des descriptions qui vendent, adaptées à votre audience. Par lot de 10, 50 ou 200 produits." },
  { icon: TrendingUp, title: "SEO Shopify optimisé", desc: "Titres SEO, meta descriptions, tags structurés — faites remonter vos produits dans Google." },
  { icon: BarChart3, title: "Score visibilité par produit", desc: "Visualisez la santé de chaque fiche produit. Identifiez en un coup d'œil ce qui manque." },
];

const PLANS = [
  {
    id: "free", name: "Gratuit", badge: "🆓",
    monthlyPrice: 0, yearlyPrice: 0, popular: false,
    target: "Pour découvrir EcomPilot sans engagement",
    fit: "30 actions offertes dès l'inscription. Sans carte bancaire, sans délai.",
    features: ["1 boutique Shopify", "30 actions IA offertes", "Édition en masse de base", "Score SEO par produit", "Support communauté"],
  },
  {
    id: "starter", name: "Starter", badge: "🥉",
    monthlyPrice: 19, yearlyPrice: 13, popular: false,
    target: "Pour les boutiques qui démarrent",
    fit: "Moins de 500 produits et vous voulez gagner du temps sur les tâches répétitives.",
    features: ["1 boutique Shopify", "Jusqu'à 500 produits", "Édition en masse complète", "Import produits : 20/mois", "1 000 tâches IA/mois", "Export CSV", "Support email (48h)"],
  },
  {
    id: "pro", name: "Pro", badge: "🥇",
    monthlyPrice: 49, yearlyPrice: 34, popular: true,
    target: "Pour les boutiques en croissance",
    fit: "Vous gérez un catalogue important et automatisez votre croissance avec l'IA.",
    features: ["Jusqu'à 3 boutiques", "Produits illimités", "Tout Starter +", "Import illimité AliExpress", "20 000 tâches IA/mois", "Automatisations avancées", "Traitement images en masse", "Support prioritaire (24h)"],
  },
  {
    id: "scale", name: "Scale", badge: "🏆",
    monthlyPrice: 129, yearlyPrice: 90, popular: false,
    target: "Pour les boutiques à grande échelle",
    fit: "Vous gérez plusieurs boutiques et avez besoin de performances maximales.",
    features: ["Boutiques illimitées", "Tout Pro +", "100 000 tâches IA/mois", "Automatisations illimitées", "Support dédié (4h)", "Accès anticipé nouveautés"],
  },
];

const FAQ_ITEMS = [
  { q: "Est-ce que mes produits sont modifiés sans mon accord ?", a: "Non, jamais. EcomPilot génère des suggestions que vous validez avant d'appliquer. Vous gardez le contrôle total sur chaque modification." },
  { q: "Faut-il une carte bancaire pour commencer ?", a: "Non. Vous démarrez gratuitement avec vos 30 premières actions, sans renseigner de carte. Vous n'en avez besoin que lorsque vous choisissez un plan payant." },
  { q: "Puis-je annuler à tout moment ?", a: "Oui, en 1 clic depuis votre tableau de bord. Aucun engagement, aucun frais caché. Si vous annulez, vous gardez l'accès jusqu'à la fin de votre période payée." },
];

const TESTIMONIALS = [
  { name: "Sophie M.", role: "Boutique mode", context: "Scénario illustratif", quote: "Optimiser des centaines de fiches produit en quelques heures, pas en plusieurs semaines : voilà ce qu'EcomPilot rend possible." },
  { name: "Marc L.", role: "Dropshipping multi-boutiques", context: "Scénario illustratif", quote: "L'import fournisseur couplé à la génération IA de descriptions uniques change complètement la gestion d'un catalogue." },
  { name: "Camille D.", role: "Artisanat", context: "Scénario illustratif", quote: "Le score visibilité par produit permet d'identifier exactement ce qui manque pour améliorer sa présence en ligne." },
];

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();

  const handleNavigate = (path: string) => { router.push(path); };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden pb-20 md:pb-0">
      {/* ══════ HEADER ══════ */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo.svg" alt="EcomPilot Elite" className="h-10 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#fonctionnalites" className="text-sm font-medium hover:text-orange-600 transition-colors" style={{ color: "#475569" }}>Fonctionnalités</a>
            <a href="#tarifs" className="text-sm font-medium hover:text-orange-600 transition-colors" style={{ color: "#475569" }}>Tarifs</a>
            <a href="#faq" className="text-sm font-medium hover:text-orange-600 transition-colors" style={{ color: "#475569" }}>FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => handleNavigate("/login")} className="hidden sm:block px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all" style={{ color: "#0f172a" }}>
              Se connecter
            </button>
            <button onClick={() => handleNavigate("/login?tab=signup")} className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 whitespace-nowrap" style={{ backgroundColor: "#f97316", color: "#fff" }}>
              <span className="hidden sm:inline">Commencer gratuit →</span>
              <span className="sm:hidden">Gratuit</span>
            </button>
          </div>
        </div>
      </header>

      {/* ══════ HERO ══════ */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ backgroundColor: "#fff7ed", color: "#ea580c" }}>
            <Sparkles className="w-3.5 h-3.5" /> Copilote IA pour boutiques Shopify
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] mb-8" style={{ color: "#0f172a" }}>
            Laisse l&apos;IA travailler
            <br className="hidden sm:block" />
            <span style={{ color: "#f97316" }}> à ta place.</span>
          </h1>
          <p className="text-lg md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed" style={{ color: "#475569" }}>
            Descriptions percutantes, SEO, édition en masse — ton catalogue optimisé en{" "}
            <span className="font-bold" style={{ color: "#0f172a" }}>5 minutes</span>{" "}
            au lieu de 3h.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button onClick={() => handleNavigate("/login?tab=signup")} className="px-10 py-4 rounded-xl text-lg font-bold flex items-center gap-3 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5" style={{ backgroundColor: "#f97316", color: "#fff" }}>
              Commencer gratuit (sans CB) <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => handleNavigate("/login")} className="px-8 py-4 border-2 border-gray-300 hover:border-orange-400 rounded-xl text-base font-semibold transition-all hover:bg-orange-50/30 flex items-center gap-2" style={{ color: "#0f172a" }}>
              <Lock className="w-4 h-4" /> J&apos;ai déjà un compte
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
            <p className="flex items-center gap-1 text-sm" style={{ color: "#64748b" }}>
              <Shield className="w-4 h-4" style={{ color: "#059669" }} /> Sans carte bancaire
            </p>
            <p className="flex items-center gap-1 text-sm" style={{ color: "#64748b" }}>
              <Check className="w-4 h-4" style={{ color: "#059669" }} /> 30 actions offertes
            </p>
            <p className="flex items-center gap-1 text-sm" style={{ color: "#64748b" }}>
              <Clock className="w-4 h-4" style={{ color: "#059669" }} /> Config en 30 secondes
            </p>
          </div>

          {/* Video placeholder */}
          <div className="relative max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-gray-400/20 border border-gray-200 cursor-pointer group" onClick={() => handleNavigate("/login?tab=signup")}>
            <div className="aspect-video flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg" style={{ backgroundColor: "#f97316" }}>
                  <svg viewBox="0 0 24 24" fill="white" className="w-9 h-9 translate-x-0.5"><polygon points="5,3 19,12 5,21" /></svg>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold mb-2" style={{ color: "#fff" }}>Voir la démo en 90 secondes →</p>
                  <p className="text-sm" style={{ color: "#94a3b8" }}>Comment optimiser 50 fiches produit en 5 minutes avec l&apos;IA</p>
                </div>
              </div>
              <div className="absolute bottom-4 right-4 text-xs px-3 py-1.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(249,115,22,0.9)", color: "#fff" }}>
                Essayer gratuitement →
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ SOCIAL PROOF BAR ══════ */}
      <section className="py-5 border-y border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 px-6">
          {[{ icon: Zap, label: "IA GPT-4o" }, { icon: Shield, label: "Compatible Shopify" }, { icon: TrendingUp, label: "RGPD compliant" }, { icon: Clock, label: "Sans engagement" }, { icon: Check, label: "Stripe sécurisé" }].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color: "#f97316" }} />
              <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ PAIN POINTS ══════ */}
      <section id="problemes" className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#dc2626" }}>Le problème</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#0f172a" }}>Vous reconnaissez-vous ?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-red-200 hover:-translate-y-1 transition-all">
                <span className="text-3xl mb-3 block">{p.emoji}</span>
                <h4 className="text-sm font-bold mb-1.5 leading-tight" style={{ color: "#0f172a" }}>{p.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => handleNavigate("/login?tab=signup")} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 shadow-lg" style={{ backgroundColor: "#dc2626", color: "#fff" }}>
              Arrêter de perdre du temps <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#f97316" }}>3 étapes</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#0f172a" }}>Comment ça marche ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative rounded-2xl p-8 text-center border border-gray-100 hover:shadow-lg transition-all" style={{ backgroundColor: "#fff7ed" }}>
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: "#f97316", color: "#fff" }}>
                    {s.step}
                  </div>
                  <div className="w-14 h-14 rounded-xl mx-auto mb-5 mt-2 flex items-center justify-center" style={{ backgroundColor: "rgba(249,115,22,0.12)" }}>
                    <Icon className="w-7 h-7" style={{ color: "#f97316" }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: "#0f172a" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section id="fonctionnalites" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#f97316" }}>Fonctionnalités</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#0f172a" }}>Tout ce dont vous avez besoin.</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>Un seul outil pour gérer, optimiser et automatiser votre catalogue Shopify.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all group">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: "#fff7ed" }}>
                    <Icon className="w-6 h-6" style={{ color: "#f97316" }} />
                  </div>
                  <h4 className="text-base font-bold mb-2" style={{ color: "#0f172a" }}>{f.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
                </div>
              );
            })}
            {/* Extra card: CTA */}
            <div className="rounded-xl p-6 flex flex-col items-start justify-between border-2 border-dashed" style={{ borderColor: "#f97316" }}>
              <div>
                <p className="text-base font-bold mb-2" style={{ color: "#f97316" }}>+ Export CSV, alertes stock, historique des actions, traitement d&apos;images…</p>
                <p className="text-sm" style={{ color: "#64748b" }}>Et bien plus encore disponible dès l&apos;inscription.</p>
              </div>
              <button onClick={() => handleNavigate("/login?tab=signup")} className="mt-4 inline-flex items-center gap-1 text-sm font-bold hover:underline" style={{ color: "#f97316" }}>
                Voir toutes les fonctionnalités <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ TARIFS ══════ */}
      <section id="tarifs" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#f97316" }}>Tarifs</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#0f172a" }}>Prix simples. Pas de surprise.</h2>
            <p className="text-lg mb-8" style={{ color: "#64748b" }}>Commencez avec <strong>30 actions gratuites</strong> — sans carte bancaire.</p>
            <div className="inline-flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-full px-2 py-1.5">
              <button onClick={() => setBillingPeriod("monthly")} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billingPeriod === "monthly" ? "shadow-md" : "hover:bg-white"}`} style={{ backgroundColor: billingPeriod === "monthly" ? "#f97316" : "transparent", color: billingPeriod === "monthly" ? "#fff" : "#475569" }}>
                Mensuel
              </button>
              <button onClick={() => setBillingPeriod("yearly")} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${billingPeriod === "yearly" ? "shadow-md" : "hover:bg-white"}`} style={{ backgroundColor: billingPeriod === "yearly" ? "#f97316" : "transparent", color: billingPeriod === "yearly" ? "#fff" : "#475569" }}>
                Annuel <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: billingPeriod === "yearly" ? "rgba(255,255,255,0.2)" : "#dcfce7", color: billingPeriod === "yearly" ? "#fff" : "#16a34a" }}>-30%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {PLANS.map((plan) => {
              const price = billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              const isFree = plan.id === "free";
              return (
                <div key={plan.id} className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-all hover:shadow-xl ${plan.popular ? "border-orange-400 shadow-lg shadow-orange-500/10 scale-[1.02]" : "border-gray-200 hover:-translate-y-1"}`}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1" style={{ backgroundColor: "#f97316", color: "#fff" }}>
                      <Crown className="w-3 h-3" /> RECOMMANDÉ
                    </div>
                  )}
                  <div className="mb-4">
                    <span className="text-xl mr-2">{plan.badge}</span>
                    <span className="text-lg font-bold" style={{ color: "#0f172a" }}>{plan.name}</span>
                    <p className="text-xs mt-1" style={{ color: "#64748b" }}>{plan.target}</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-4xl font-extrabold" style={{ color: "#0f172a" }}>{isFree ? "0€" : `${price}€`}</span>
                    {!isFree && <span className="text-sm" style={{ color: "#64748b" }}>/mois</span>}
                    {!isFree && billingPeriod === "yearly" && (
                      <p className="text-xs mt-1 font-medium" style={{ color: "#059669" }}>soit {plan.yearlyPrice * 12}€/an</p>
                    )}
                    {isFree && <p className="text-xs mt-1 font-medium" style={{ color: "#059669" }}>30 actions • sans carte</p>}
                  </div>
                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "#374151" }}>
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#059669" }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="p-3 rounded-lg mb-4 text-xs leading-relaxed" style={{ backgroundColor: "#fff7ed", color: "#9a3412" }}>{plan.fit}</div>
                  <button onClick={() => {
                    if (!isFree) {
                      if (typeof window !== "undefined") {
                        localStorage.setItem("ecompilot_pending_plan", plan.id);
                        localStorage.setItem("ecompilot_pending_billing", billingPeriod);
                      }
                    }
                    handleNavigate(`/login?tab=signup&plan=${plan.id}&billing=${billingPeriod}`);
                  }} className="block text-center py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 w-full" style={{ backgroundColor: plan.popular ? "#f97316" : "#0f172a", color: "#fff" }}>
                    {isFree ? "Démarrer gratuitement" : "Commencer maintenant"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <button onClick={() => handleNavigate("/login")} className="inline-flex items-center gap-2 text-sm font-medium hover:underline" style={{ color: "#64748b" }}>
              <Users className="w-4 h-4" /> Déjà client·e ? Se connecter
            </button>
          </div>
        </div>
      </section>

      {/* ══════ TESTIMONIALS ══════ */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#0f172a" }}>Ce qu&apos;EcomPilot rend possible.</h2>
            <p className="text-sm" style={{ color: "#94a3b8" }}>Scénarios illustratifs basés sur l&apos;usage typique de l&apos;outil.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all">
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-4" style={{ backgroundColor: "#fff7ed", color: "#f97316" }}>{t.context}</span>
                <p className="text-sm leading-relaxed mb-5 italic" style={{ color: "#374151" }}>&ldquo;{t.quote}&rdquo;</p>
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
      <section id="faq" className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#f97316" }}>FAQ</p>
            <h2 className="text-3xl font-extrabold" style={{ color: "#0f172a" }}>Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden hover:border-orange-200 transition-colors">
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-orange-50/30 transition-colors">
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
      <section className="py-20 px-6" style={{ backgroundColor: "#0f172a" }}>
        <div className="max-w-3xl mx-auto text-center">
          <Heart className="w-10 h-10 mx-auto mb-6" style={{ color: "#f97316" }} />
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#fff" }}>Votre catalogue mérite mieux<br />que du copier-coller.</h2>
          <p className="text-lg mb-8" style={{ color: "#94a3b8" }}>30 actions gratuites · Aucune carte requise · Accès immédiat</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => handleNavigate("/login?tab=signup")} className="inline-flex items-center gap-3 px-10 py-5 rounded-xl text-lg font-bold transition-all hover:-translate-y-0.5 shadow-lg" style={{ backgroundColor: "#f97316", color: "#fff" }}>
              Commencer gratuit (sans CB) <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => handleNavigate("/login")} className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 rounded-xl text-base font-semibold transition-all hover:bg-white/5" style={{ color: "#94a3b8" }}>
              <ChevronRight className="w-4 h-4" /> Me connecter
            </button>
          </div>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="border-t border-gray-200 bg-white py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="EcomPilot Elite" className="h-7 w-auto object-contain" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "#64748b" }}>
              <Link href="/cgu" className="hover:text-orange-600 transition-colors">CGU</Link>
              <Link href="/cgv" className="hover:text-orange-600 transition-colors">CGV</Link>
              <Link href="/politique-confidentialite" className="hover:text-orange-600 transition-colors">Confidentialité</Link>
              <Link href="/mentions-legales" className="hover:text-orange-600 transition-colors">Mentions légales</Link>
              <a href="mailto:contact@ecompilot.fr" className="hover:text-orange-600 transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: "#94a3b8" }}>© 2026 EcomPilot — Tous droits réservés. Paiement sécurisé par Stripe.</p>
          </div>
        </div>
      </footer>

      {/* ══════ STICKY MOBILE FOOTER CTA ══════ */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 p-3 border-t border-gray-100" style={{ backgroundColor: "rgba(255,255,255,0.97)", backdropFilter: "blur(10px)" }}>
        <button onClick={() => handleNavigate("/login?tab=signup")} className="w-full py-4 rounded-xl text-base font-bold flex items-center justify-center gap-2 shadow-lg" style={{ backgroundColor: "#f97316", color: "#fff" }}>
          Commencer gratuit (sans CB) <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-xs mt-1.5" style={{ color: "#94a3b8" }}>Sans carte bancaire · 30 actions offertes</p>
      </div>
    </div>
  );
}
