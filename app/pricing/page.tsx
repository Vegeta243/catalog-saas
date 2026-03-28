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
    cardBg: "var(--surface-primary)",
    border: "1px solid #e5e7eb",
    badgeBg: "rgba(255,255,255,0.06)",
    badgeColor: "#6b7280",
    iconBg: "rgba(255,255,255,0.07)",
    iconColor: "#9ca3af",
    btnCls: "",
    btnStyle: { background: "rgba(255,255,255,0.08)", color: "#d1d5db" },
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
    cardBg: "rgba(37,99,235,0.06)",
    border: "1px solid #bfdbfe",
    badgeBg: "rgba(37,99,235,0.12)",
    badgeColor: "#93c5fd",
    iconBg: "rgba(37,99,235,0.12)",
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
    cardBg: "rgba(124,58,237,0.08)",
    border: "2px solid #a78bfa",
    badgeBg: "#7c3aed",
    badgeColor: "#ffffff",
    badgeText: "RECOMMANDÉ",
    iconBg: "rgba(124,58,237,0.12)",
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
    cardBg: "rgba(5,150,105,0.06)",
    border: "1px solid #6ee7b7",
    badgeBg: "rgba(5,150,105,0.12)",
    badgeColor: "#6ee7b7",
    iconBg: "rgba(5,150,105,0.12)",
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
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <nav className="border-b" style={{ background: "var(--surface-primary)", borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Ecom<span style={{ color: "#2563eb" }}>Pilot</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:underline" style={{ color: "var(--text-secondary)" }}>Connexion</Link>
            <Link href="/login?tab=signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium" style={{ color: "#fff" }}>
              S&apos;inscrire
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-6">
        <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
          Des prix simples, <span style={{ color: "#2563eb" }}>transparents</span>
        </h1>
        <p className="text-lg mt-4 max-w-2xl mx-auto" style={{ color: "var(--text-tertiary)" }}>
          30 actions gratuites, sans carte bancaire. Passez à un plan payant quand vous êtes prêt.
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className="text-sm font-medium" style={{ color: yearly ? "var(--text-tertiary)" : "var(--text-primary)" }}>Mensuel</span>
          <button onClick={() => setYearly(!yearly)} className="relative">
            {yearly
              ? <ToggleRight className="w-10 h-10" style={{ color: "#2563eb" }} />
              : <ToggleLeft className="w-10 h-10" style={{ color: "var(--text-tertiary)" }} />}
          </button>
          <span className="text-sm font-medium" style={{ color: yearly ? "var(--text-primary)" : "var(--text-tertiary)" }}>
            Annuel <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(5,150,105,0.15)", color: "#34d399" }}>-30%</span>
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
                  <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{plan.name}</h3>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{plan.description}</p>
                </div>
              </div>

              <div className="mb-6">
                {plan.isFree ? (
                  <span className="text-4xl font-extrabold" style={{ color: "var(--text-primary)" }}>Gratuit</span>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold" style={{ color: "var(--text-primary)" }}>{price}€</span>
                    <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>/mois</span>
                    {yearly && (
                      <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                        Facturé {price * 12}€/an
                      </p>
                    )}
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
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
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
            <CreditCard className="w-4 h-4" />
            Visa / Mastercard
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#003087" }}>
            Pay<span style={{ color: "#009cde" }}>Pal</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-tertiary)" }}>
            <Shield className="w-4 h-4" />
            Paiement sécurisé SSL
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t py-8" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <Link href="/cgu" className="hover:underline">CGU</Link>
            <Link href="/cgv" className="hover:underline">CGV</Link>
            <Link href="/politique-confidentialite" className="hover:underline">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:underline">Mentions légales</Link>
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>© 2026 EcomPilot — Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
