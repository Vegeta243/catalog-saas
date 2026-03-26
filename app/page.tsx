"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DemoVideo } from "@/components/demo-video";
import {
  Zap, PackageSearch, Sparkles, Bot, BarChart3,
  ArrowRight, Check, Shield, Import,
  ChevronDown, TrendingUp, Rocket, Heart,
  Crown,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

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
  { icon: PackageSearch, title: "Édition en masse ultra-rapide", desc: "Modifiez prix, titres, descriptions et tags sur des centaines de produits en quelques clics." },
  { icon: Import, title: "Import AliExpress en 1 clic", desc: "Importez des produits depuis n'importe quelle URL fournisseur. Marge automatique, description IA incluse." },
  { icon: Sparkles, title: "Descriptions IA percutantes", desc: "Générez des descriptions qui vendent, adaptées à votre audience. Par lot de 10, 50 ou 200." },
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
    features: ["1 boutique Shopify", "Jusqu'à 500 produits", "Édition en masse complète", "Import produits : 20/mois", "500 actions IA/mois", "Export CSV", "Support email (48h)"],
  },
  {
    id: "pro", name: "Pro", badge: "🥇",
    monthlyPrice: 49, yearlyPrice: 34, popular: true,
    target: "Pour les boutiques en croissance",
    fit: "Vous gérez un catalogue important et automatisez votre croissance avec l'IA.",
    features: ["Jusqu'à 3 boutiques", "Produits illimités", "Tout Starter +", "Import illimité AliExpress", "5 000 actions IA/mois", "Automatisations avancées", "Traitement images en masse", "Support prioritaire (24h)"],
  },
  {
    id: "agency", name: "Agency", badge: "🏆",
    monthlyPrice: 149, yearlyPrice: 104, popular: false,
    target: "Pour les agences et multi-boutiques",
    fit: "Vous gérez plusieurs boutiques et avez besoin de performances maximales.",
    features: ["Boutiques illimitées", "Tout Pro +", "Actions illimitées", "Automatisations illimitées", "Support dédié (4h)", "Accès anticipé nouveautés"],
  },
];

const BEFORE_AFTER = [
  { before: "3h à rédiger 10 fiches produits", after: "10 fiches optimisées en 2 minutes" },
  { before: "Descriptions copiées-collées d'AliExpress", after: "Descriptions uniques, SEO-friendly, en français" },
  { before: "Aucune idée de ce qui freine vos ventes", after: "Score visibilité par produit + alertes" },
  { before: "Tout faire à la main, seul·e", after: "Automatisations IA qui tournent pour vous" },
];

const FAQ_ITEMS = [
  { q: "Est-ce que mes produits sont modifiés sans mon accord ?", a: "Non, jamais. EcomPilot génère des suggestions que vous validez avant d'appliquer. Vous gardez le contrôle total sur chaque modification." },
  { q: "Faut-il une carte bancaire pour commencer ?", a: "Non. Vous démarrez gratuitement avec vos 30 premières actions, sans renseigner de carte. Vous n'en avez besoin que lorsque vous choisissez un plan payant." },
  { q: "Puis-je annuler à tout moment ?", a: "Oui, en 1 clic depuis votre tableau de bord. Aucun engagement, aucun frais caché. Si vous annulez, vous gardez l'accès jusqu'à la fin de votre période payée." },
  { q: "Quel modèle d'IA est utilisé ?", a: "EcomPilot utilise GPT-4o-mini d'OpenAI, optimisé pour le e-commerce francophone. Les descriptions sont naturelles, uniques et pensées pour convertir." },
  { q: "Combien de temps prend la configuration ?", a: "30 secondes. Vous connectez votre boutique Shopify, vos produits se synchronisent automatiquement, et vous pouvez lancer votre première optimisation immédiatement." },
];

const TESTIMONIALS = [
  { name: "Gary T.", role: "Dropshipping · 3 boutiques", quote: "J'optimisais mes fiches produits à la main, ça me prenait des heures. Maintenant j'active l'IA, je valide, c'est fini. Vraiment efficace." },
  { name: "Ghiles A.", role: "E-commerce mode", quote: "L'import AliExpress + la génération de description en un clic, c'est ce qui m'a convaincu. Mon catalogue de 200 produits optimisé en une après-midi." },
  { name: "2L", role: "Boutique généraliste", quote: "Simple à connecter avec Shopify. Les descriptions générées sont bien meilleures que ce que j'écrivais avant. Je recommande sans hésiter." },
];

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const router = useRouter();

  const handleNavigate = (path: string) => { router.push(path); };

  return (
    <div className="min-h-screen overflow-x-hidden pb-20 md:pb-0" style={{ backgroundColor: "#0f172a" }}>

      {/* ══════ HEADER ══════ */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1e2d45" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/logo-white.svg" alt="EcomPilot Elite" className="h-10 w-auto object-contain" />
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#fonctionnalites" className="text-sm font-medium transition-colors" style={{ color: "#8b9fc4" }}>Fonctionnalités</a>
            <a href="#tarifs" className="text-sm font-medium transition-colors" style={{ color: "#8b9fc4" }}>Tarifs</a>
            <a href="#faq" className="text-sm font-medium transition-colors" style={{ color: "#8b9fc4" }}>FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => handleNavigate("/login")} className="hidden sm:block px-4 py-2 rounded-lg text-sm font-semibold transition-all" style={{ color: "#8b9fc4", border: "1px solid #1e2d45" }}>
              Se connecter
            </button>
            <button onClick={() => handleNavigate("/login?tab=signup")} className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-md hover:-translate-y-0.5 whitespace-nowrap" style={{ backgroundColor: "#4f8ef7", color: "#fff" }}>
              Commencer gratuit →
            </button>
          </div>
        </div>
      </header>

      {/* ══════ HERO ══════ */}
      <section className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ backgroundColor: "rgba(79,142,247,0.12)", color: "#4f8ef7" }}>
            <Sparkles className="w-3.5 h-3.5" /> Copilote IA pour boutiques Shopify
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-[1.1] mb-8" style={{ color: "#f0f4ff" }}>
            Laisse l&apos;IA travailler
            <br className="hidden sm:block" />
            <span style={{ color: "#4f8ef7" }}> à ta place.</span>
          </h1>
          <p className="text-lg md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed" style={{ color: "#8b9fc4" }}>
            Descriptions percutantes, SEO, édition en masse — ton catalogue optimisé automatiquement grâce à l&apos;IA.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button onClick={() => handleNavigate("/login?tab=signup")} className="px-10 py-4 rounded-xl text-lg font-bold flex items-center gap-3 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5" style={{ backgroundColor: "#4f8ef7", color: "#fff" }}>
              Commencer gratuit (sans CB) <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mb-12">
            <p className="flex items-center gap-1 text-sm" style={{ color: "#8b9fc4" }}>
              <Shield className="w-4 h-4" style={{ color: "#22c55e" }} /> Sans carte bancaire
            </p>
            <p className="flex items-center gap-1 text-sm" style={{ color: "#8b9fc4" }}>
              <Check className="w-4 h-4" style={{ color: "#22c55e" }} /> 30 actions offertes
            </p>
          </div>

          <DemoVideo />
        </div>
      </section>

      {/* ══════ SOCIAL PROOF BAR ══════ */}
      <section className="py-5" style={{ borderTop: "1px solid #1e2d45", borderBottom: "1px solid #1e2d45", backgroundColor: "rgba(17,24,39,0.5)" }}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-8 px-6">
          {[{ icon: Zap, label: "IA GPT-4o" }, { icon: Shield, label: "Compatible Shopify" }, { icon: TrendingUp, label: "RGPD compliant" }].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color: "#4f8ef7" }} />
              <span className="text-sm font-semibold" style={{ color: "#f0f4ff" }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ PAIN POINTS ══════ */}
      <section id="problemes" className="py-20 px-6" style={{ backgroundColor: "#111827" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#ef4444" }}>Le problème</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#f0f4ff" }}>Vous reconnaissez-vous ?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="rounded-xl p-5 hover:-translate-y-1 transition-all" style={{ backgroundColor: "#0f172a", border: "1px solid #1e2d45" }}>
                <span className="text-3xl mb-3 block">{p.emoji}</span>
                <h4 className="text-sm font-bold mb-1.5 leading-tight" style={{ color: "#f0f4ff" }}>{p.title}</h4>
                <p className="text-xs leading-relaxed" style={{ color: "#8b9fc4" }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ BEFORE / AFTER ══════ */}
      <section className="py-20 px-6" style={{ backgroundColor: "#0f172a" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#4f8ef7" }}>Avant / Après</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#f0f4ff" }}>Sans EcomPilot vs avec EcomPilot</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BEFORE_AFTER.map((item, idx) => (
              <div key={idx} className="rounded-xl p-5 flex gap-4 items-start" style={{ backgroundColor: "#111827", border: "1px solid #1e2d45" }}>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#ef4444" }}>Avant</p>
                  <p className="text-sm line-through" style={{ color: "#64748b" }}>{item.before}</p>
                </div>
                <div className="w-px self-stretch" style={{ backgroundColor: "#1e2d45" }} />
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#22c55e" }}>Après</p>
                  <p className="text-sm font-medium" style={{ color: "#f0f4ff" }}>{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section className="py-20 px-6" style={{ backgroundColor: "#111827" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#4f8ef7" }}>3 étapes</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#f0f4ff" }}>Comment ça marche ?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative rounded-2xl p-8 text-center" style={{ backgroundColor: "#0f172a", border: "1px solid #1e2d45" }}>
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: "#4f8ef7", color: "#fff" }}>
                    {s.step}
                  </div>
                  <div className="w-14 h-14 rounded-xl mx-auto mb-5 mt-2 flex items-center justify-center" style={{ backgroundColor: "rgba(79,142,247,0.12)" }}>
                    <Icon className="w-7 h-7" style={{ color: "#4f8ef7" }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: "#f0f4ff" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#8b9fc4" }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ FEATURES ══════ */}
      <section id="fonctionnalites" className="py-20 px-6" style={{ backgroundColor: "#0f172a" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#4f8ef7" }}>Fonctionnalités</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#f0f4ff" }}>Tout ce dont vous avez besoin.</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#8b9fc4" }}>Un seul outil pour gérer, optimiser et automatiser votre catalogue Shopify.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl p-6 hover:-translate-y-1 transition-all group" style={{ backgroundColor: "#111827", border: "1px solid #1e2d45" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: "rgba(79,142,247,0.12)" }}>
                    <Icon className="w-6 h-6" style={{ color: "#4f8ef7" }} />
                  </div>
                  <h4 className="text-base font-bold mb-2" style={{ color: "#f0f4ff" }}>{f.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: "#8b9fc4" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ TARIFS ══════ */}
      <section id="tarifs" className="py-20 px-6" style={{ backgroundColor: "#111827" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#4f8ef7" }}>Tarifs</p>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4" style={{ color: "#f0f4ff" }}>Prix simples. Pas de surprise.</h2>
            <p className="text-lg mb-8" style={{ color: "#8b9fc4" }}>Commencez avec <strong className="text-white">30 actions gratuites</strong> — sans carte bancaire.</p>
            <div className="inline-flex items-center gap-3 rounded-full px-2 py-1.5" style={{ backgroundColor: "#0f172a", border: "1px solid #1e2d45" }}>
              <button onClick={() => setBillingPeriod("monthly")} className="px-5 py-2 rounded-full text-sm font-semibold transition-all" style={{ backgroundColor: billingPeriod === "monthly" ? "#4f8ef7" : "transparent", color: billingPeriod === "monthly" ? "#fff" : "#8b9fc4" }}>
                Mensuel
              </button>
              <button onClick={() => setBillingPeriod("yearly")} className="px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2" style={{ backgroundColor: billingPeriod === "yearly" ? "#4f8ef7" : "transparent", color: billingPeriod === "yearly" ? "#fff" : "#8b9fc4" }}>
                Annuel <span className="text-[11px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: billingPeriod === "yearly" ? "rgba(255,255,255,0.2)" : "rgba(34,197,94,0.2)", color: billingPeriod === "yearly" ? "#fff" : "#22c55e" }}>-30%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {PLANS.map((plan) => {
              const price = billingPeriod === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
              const isFree = plan.id === "free";
              return (
                <div key={plan.id} className={`relative rounded-2xl p-6 flex flex-col transition-all hover:shadow-xl ${plan.popular ? "shadow-lg shadow-blue-500/10 scale-[1.02]" : "hover:-translate-y-1"}`} style={{ backgroundColor: "#0f172a", border: plan.popular ? "2px solid #4f8ef7" : "1px solid #1e2d45" }}>
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-xs font-bold tracking-wide flex items-center gap-1" style={{ backgroundColor: "#4f8ef7", color: "#fff" }}>
                      <Crown className="w-3 h-3" /> RECOMMANDÉ
                    </div>
                  )}
                  <div className="mb-4">
                    <span className="text-xl mr-2">{plan.badge}</span>
                    <span className="text-lg font-bold" style={{ color: "#f0f4ff" }}>{plan.name}</span>
                    <p className="text-xs mt-1" style={{ color: "#8b9fc4" }}>{plan.target}</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-4xl font-extrabold" style={{ color: "#f0f4ff" }}>{isFree ? "0€" : `${price}€`}</span>
                    {!isFree && <span className="text-sm" style={{ color: "#8b9fc4" }}>/mois</span>}
                    {!isFree && billingPeriod === "yearly" && (
                      <p className="text-xs mt-1 font-medium" style={{ color: "#22c55e" }}>soit {plan.yearlyPrice * 12}€/an</p>
                    )}
                    {isFree && <p className="text-xs mt-1 font-medium" style={{ color: "#22c55e" }}>30 actions • sans carte</p>}
                  </div>
                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs" style={{ color: "#8b9fc4" }}>
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#22c55e" }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="p-3 rounded-lg mb-4 text-xs leading-relaxed" style={{ backgroundColor: "rgba(79,142,247,0.08)", color: "#8b9fc4" }}>{plan.fit}</div>
                  <button onClick={() => {
                    if (!isFree) {
                      if (typeof window !== "undefined") {
                        localStorage.setItem("ecompilot_pending_plan", plan.id);
                        localStorage.setItem("ecompilot_pending_billing", billingPeriod);
                      }
                    }
                    handleNavigate(`/login?tab=signup&plan=${plan.id}&billing=${billingPeriod}`);
                  }} className="block text-center py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 w-full" style={{ backgroundColor: plan.popular ? "#4f8ef7" : "rgba(79,142,247,0.15)", color: "#fff" }}>
                    {isFree ? "Commencer gratuit (sans CB)" : "Commencer maintenant"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════ TESTIMONIALS ══════ */}
      <section className="py-20 px-6" style={{ backgroundColor: "#0f172a" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#f0f4ff" }}>Ils utilisent EcomPilot Elite</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl p-6 transition-all" style={{ backgroundColor: "#111827", border: "1px solid #1e2d45" }}>
                <p className="text-sm leading-relaxed mb-5 italic" style={{ color: "#8b9fc4" }}>&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#f0f4ff" }}>{t.name}</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ FAQ ══════ */}
      <section id="faq" className="py-20 px-6" style={{ backgroundColor: "#111827" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#4f8ef7" }}>FAQ</p>
            <h2 className="text-3xl font-extrabold" style={{ color: "#f0f4ff" }}>Questions fréquentes</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <div key={idx} className="rounded-xl overflow-hidden transition-colors" style={{ border: "1px solid #1e2d45" }}>
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors hover:bg-white/[0.02]">
                  <span className="text-base font-semibold pr-4" style={{ color: "#f0f4ff" }}>{item.q}</span>
                  <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-200 ${openFaq === idx ? "rotate-180" : ""}`} style={{ color: "#8b9fc4" }} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5" style={{ borderTop: "1px solid #1e2d45" }}>
                    <p className="text-sm leading-relaxed pt-4" style={{ color: "#8b9fc4" }}>{item.a}</p>
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
          <Heart className="w-10 h-10 mx-auto mb-6" style={{ color: "#4f8ef7" }} />
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#f0f4ff" }}>Votre catalogue mérite mieux<br />que du copier-coller.</h2>
          <p className="text-lg mb-8" style={{ color: "#8b9fc4" }}>30 actions gratuites · Aucune carte requise · Accès immédiat</p>
          <button onClick={() => handleNavigate("/login?tab=signup")} className="inline-flex items-center gap-3 px-10 py-5 rounded-xl text-lg font-bold transition-all hover:-translate-y-0.5 shadow-lg" style={{ backgroundColor: "#4f8ef7", color: "#fff" }}>
            Commencer gratuit (sans CB) <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer className="py-10 px-6" style={{ borderTop: "1px solid #1e2d45", backgroundColor: "#0f172a" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/logo-white.svg" alt="EcomPilot Elite" className="h-7 w-auto object-contain" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm" style={{ color: "#8b9fc4" }}>
              <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
              <Link href="/cgv" className="hover:text-white transition-colors">CGV</Link>
              <Link href="/politique-confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
              <a href="mailto:contact@ecompilot.fr" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: "#64748b" }}>© 2026 EcomPilot — Tous droits réservés. Paiement sécurisé par Stripe.</p>
          </div>
        </div>
      </footer>

      {/* ══════ STICKY MOBILE FOOTER CTA ══════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur px-4 py-3 flex items-center justify-between md:hidden" style={{ backgroundColor: "rgba(15,23,42,0.95)", borderTop: "1px solid #1e2d45" }}>
        <span className="text-white text-sm font-bold">30 actions gratuites</span>
        <button onClick={() => handleNavigate("/login?tab=signup")}
          className="px-4 py-2 text-white text-sm font-black rounded-xl transition-colors" style={{ backgroundColor: "#4f8ef7" }}>
          Commencer gratuit →
        </button>
      </div>
    </div>
  );
}
