"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, Crown, Lock, Zap, Shield } from "lucide-react";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    color: "#2563eb",
    bg: "#eff6ff",
    features: ["50 tâches IA / mois", "Jusqu'à 500 produits", "Import : 20/mois", "1 boutique Shopify", "Support email"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 89,
    color: "#059669",
    bg: "#ecfdf5",
    popular: true,
    features: ["300 tâches IA / mois", "Produits illimités", "Import illimité AliExpress & CJ", "3 boutiques", "Support prioritaire 24h", "Automatisations avancées"],
  },
  {
    id: "scale",
    name: "Scale",
    price: 129,
    color: "#7c3aed",
    bg: "#faf5ff",
    features: ["1 000 tâches IA / mois", "Boutiques illimitées", "Automatisations illimitées", "Support dédié 4h", "Accès anticipé nouveautés"],
  },
];

export default function UpgradePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16" style={{ backgroundColor: "#f8fafc" }}>
      {/* Icon + header */}
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
        <Lock className="w-8 h-8" style={{ color: "#fff" }} />
      </div>

      <div className="text-center max-w-xl mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
          <Zap className="w-3 h-3" /> Limite atteinte
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#0f172a" }}>
          Vous avez utilisé vos 10 actions gratuites
        </h1>
        <p className="text-lg leading-relaxed" style={{ color: "#64748b" }}>
          Vous avez exploré l&apos;essentiel d&apos;EcomPilot. Choisissez un plan pour continuer à optimiser votre catalogue sans limite.
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-sm mb-10">
        <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#94a3b8" }}>
          <span>Actions utilisées</span><span className="font-bold" style={{ color: "#dc2626" }}>10 / 10</span>
        </div>
        <div className="h-2.5 rounded-full w-full" style={{ backgroundColor: "#fee2e2" }}>
          <div className="h-2.5 rounded-full w-full" style={{ backgroundColor: "#dc2626" }} />
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-8">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 ${plan.popular ? "border-emerald-500 shadow-lg shadow-emerald-500/10 scale-[1.03]" : "border-gray-200"}`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1" style={{ backgroundColor: "#059669", color: "#fff" }}>
                <Crown className="w-3 h-3" /> LE PLUS POPULAIRE
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-bold" style={{ color: "#0f172a" }}>{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-extrabold" style={{ color: plan.color }}>{plan.price}€</span>
                <span className="text-sm" style={{ color: "#94a3b8" }}>/mois</span>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                  <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: plan.color }} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push(`/signup?plan=${plan.id}`)}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
              style={{ backgroundColor: plan.color, color: "#fff" }}
            >
              Choisir {plan.name} <ArrowRight className="inline w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: "#94a3b8" }}>
        <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" style={{ color: "#059669" }} /> Paiement sécurisé Stripe</span>
        <span className="flex items-center gap-1.5"><Check className="w-4 h-4" style={{ color: "#059669" }} /> Sans engagement</span>
        <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" style={{ color: "#2563eb" }} /> Accès immédiat</span>
      </div>
    </div>
  );
}
