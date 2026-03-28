"use client";

import { useState } from "react";
import { Check, Zap, Crown, Rocket, ToggleLeft, ToggleRight, Star, CreditCard, Shield } from "lucide-react";
import Link from "next/link";

const PLANS = [
  {
    id: "free",
    name: "Free",
    icon: Star,
    monthlyPrice: 0,
    yearlyPrice: 20,
    description: "Pour tester EcomPilot",
    features: [
      "30 actions gratuites",
      "1 boutique connectée",
      "Export CSV basique",
      "Support communautaire",
    ],
    cta: "Créer un compte gratuit",
    popular: false,
    isFree: true,
    cardBg: "#ffffff",
    border: "1px solid #e5e7eb",
    badgeBg: "#f9fafb",
    badgeColor: "#6b7280",
    iconBg: "#f3f4f6",
    iconColor: "#6b7280",
    btnCls: "bg-gray-100 hover:bg-gray-200",
    btnStyle: { color: "#374151" },
    shadow: "none",
    scale: false,
  },
  {
    id: "starter",
    name: "Starter",
    icon: Zap,
    monthlyPrice: 19,
    yearlyPrice: 13,
    description: "Pour débuter",
    features: [
      "1 boutique Shopify",
      "Jusqu'à 500 produits",
      "500 actions IA/mois",
      "Édition en masse complète",
      "Import produits : 20/mois",
      "Export CSV complet",
      "Alertes stock bas",
      "Support email (48h)",
    ],
    cta: "Choisir Starter",
    popular: false,
    isFree: false,
    cardBg: "#f8faff",
    border: "1px solid #bfdbfe",
    badgeBg: "#eff6ff",
    badgeColor: "#1d4ed8",
    iconBg: "#eff6ff",
    iconColor: "#2563eb",
    btnCls: "bg-blue-600 hover:bg-blue-700",
    btnStyle: { color: "#fff" },
    shadow: "none",
    scale: false,
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    monthlyPrice: 49,
    yearlyPrice: 34,
    description: "Le plus populaire",
    features: [
      "Jusqu'à 3 boutiques",
      "Produits illimités",
      "Tout Starter +",
      "5 000 actions IA/mois",
      "Import illimité AliExpress & CJ",
      "Automatisations avancées",
      "Traitement images en masse",
      "Score visibilité par produit",
      "Alertes personnalisées",
      "Support prioritaire (24h)",
    ],
    cta: "Choisir Pro",
    popular: true,
    isFree: false,
    cardBg: "linear-gradient(150deg,#fdf8ff 0%,#f5f3ff 100%)",
    border: "2px solid #a78bfa",
    badgeBg: "#7c3aed",
    badgeColor: "#ffffff",
    badgeText: "RECOMMANDÉ",
    iconBg: "#ede9fe",
    iconColor: "#7c3aed",
    btnCls: "hover:opacity-90",
    btnStyle: { background: "#7c3aed", color: "#fff" },
    shadow: "0 8px 32px rgba(124,58,237,0.12)",
    scale: true,
  },
  {
    id: "agency",
    name: "Agency",
    icon: Rocket,
    monthlyPrice: 149,
    yearlyPrice: 104,
    description: "Pour les agences",
    features: [
      "Boutiques illimitées",
      "Tout Pro +",
      "50 000 actions/mois",
      "Automatisations illimitées",
      "Performance gros catalogues",
      "Support dédié (4h)",
      "Accès anticipé nouveautés",
    ],
    cta: "Choisir Agency",
    popular: false,
    isFree: false,
    cardBg: "#f0fdf9",
    border: "1px solid #6ee7b7",
    badgeBg: "#d1fae5",
    badgeColor: "#065f46",
    iconBg: "#d1fae5",
    iconColor: "#059669",
    btnCls: "hover:opacity-90",
    btnStyle: { background: "#059669", color: "#fff" },
    shadow: "none",
    scale: false,
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: "#0f172a" }}>
            Ecom<span style={{ color: "#2563eb" }}>Pilot</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:underline" style={{ color: "#374151" }}>Connexion</Link>
            <Link href="/login?tab=signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium" style={{ color: "#fff" }}>
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-6">
        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: "#0f172a" }}>
          Des prix simples, <span style={{ color: "#2563eb" }}>transparents</span>
        </h1>
        <p className="text-lg mt-4 max-w-2xl mx-auto" style={{ color: "#64748b" }}>
          30 actions gratuites, sans carte bancaire. Passez à un plan payant quand vous êtes prêt.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className="text-sm font-medium" style={{ color: yearly ? "#94a3b8" : "#0f172a" }}>Mensuel</span>
          <button onClick={() => setYearly(!yearly)} className="relative">
            {yearly
              ? <ToggleRight className="w-10 h-10" style={{ color: "#2563eb" }} />
              : <ToggleLeft className="w-10 h-10" style={{ color: "#94a3b8" }} />}
          </button>
          <span className="text-sm font-medium" style={{ color: yearly ? "#0f172a" : "#94a3b8" }}>
            Annuel <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100" style={{ color: "#059669" }}>-30%</span>
          </span>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-7xl mx-auto px-6 pb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          return (
            <div key={plan.id}
              className="relative flex flex-col"
              style={{
                background: plan.cardBg,
                border: plan.border,
                borderRadius: '20px',
                padding: '28px',
                boxShadow: plan.shadow,
                transform: plan.scale ? 'scale(1.03)' : 'none',
                transition: 'transform 0.2s',
              }}>
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                  style={{ background: plan.badgeBg, color: plan.badgeColor }}>
                  {plan.badgeText || "Le plus populaire"}
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: plan.iconBg }}>
                  <Icon className="w-5 h-5" style={{ color: plan.iconColor }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: "#0f172a" }}>{plan.name}</h3>
                  <p className="text-xs" style={{ color: "#64748b" }}>{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                {plan.isFree ? (
                  <span className="text-4xl font-extrabold" style={{ color: "#0f172a" }}>Gratuit</span>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold" style={{ color: "#0f172a" }}>{price}€</span>
                    <span className="text-sm" style={{ color: "#64748b" }}>/mois</span>
                    {yearly && (
                      <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                        Facturé {price * 12}€/an
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#059669" }} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={plan.isFree ? "/login?tab=signup" : `/login?tab=signup&plan=${plan.id}&billing=${yearly ? "yearly" : "monthly"}`}
                className={`block text-center py-3 rounded-xl text-sm font-semibold transition-colors ${plan.btnCls}`}
                style={plan.btnStyle}>
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Payment methods */}
      <div className="max-w-2xl mx-auto px-6 pb-16 text-center">
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm" style={{ color: "#64748b" }}>
            <CreditCard className="w-4 h-4" />
            Visa / Mastercard
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#003087" }}>
            Pay<span style={{ color: "#009cde" }}>Pal</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#64748b" }}>
            <Shield className="w-4 h-4" />
            Paiement sécurisé SSL
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 text-xs" style={{ color: "#94a3b8" }}>
            <Link href="/cgu" className="hover:underline">CGU</Link>
            <Link href="/cgv" className="hover:underline">CGV</Link>
            <Link href="/politique-confidentialite" className="hover:underline">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link>
          </div>
          <p className="text-xs" style={{ color: "#94a3b8" }}>© 2026 EcomPilot — Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
