"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Check, Crown, Lock, Zap, Shield, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    yearlyPrice: 39,
    color: "#2563eb",
    bg: "#eff6ff",
    features: ["50 tâches IA / mois", "Jusqu'à 500 produits", "Import : 20/mois", "1 boutique Shopify", "Support email"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 89,
    yearlyPrice: 69,
    color: "#059669",
    bg: "#ecfdf5",
    popular: true,
    features: ["300 tâches IA / mois", "Produits illimités", "Import illimité AliExpress & CJ", "3 boutiques", "Support prioritaire 24h", "Automatisations avancées"],
  },
  {
    id: "scale",
    name: "Scale",
    price: 129,
    yearlyPrice: 99,
    color: "#7c3aed",
    bg: "#faf5ff",
    features: ["1 000 tâches IA / mois", "Boutiques illimitées", "Automatisations illimitées", "Support dédié 4h", "Accès anticipé nouveautés"],
  },
];

export default function UpgradePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    };
    fetchUser();
  }, []);

  const handleChoosePlan = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billing, email: userEmail }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Erreur lors de la redirection vers le paiement. Veuillez réessayer.");
      }
    } catch {
      alert("Erreur réseau. Veuillez réessayer.");
    } finally {
      setLoadingPlan(null);
    }
  };

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
      <div className="w-full max-w-sm mb-8">
        <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "#94a3b8" }}>
          <span>Actions utilisées</span><span className="font-bold" style={{ color: "#dc2626" }}>10 / 10</span>
        </div>
        <div className="h-2.5 rounded-full w-full" style={{ backgroundColor: "#fee2e2" }}>
          <div className="h-2.5 rounded-full w-full" style={{ backgroundColor: "#dc2626" }} />
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${billing === "monthly" ? "bg-blue-600 shadow-sm" : "bg-white border border-gray-200 hover:bg-gray-50"}`}
          style={{ color: billing === "monthly" ? "#fff" : "#374151" }}
        >
          Mensuel
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${billing === "yearly" ? "bg-blue-600 shadow-sm" : "bg-white border border-gray-200 hover:bg-gray-50"}`}
          style={{ color: billing === "yearly" ? "#fff" : "#374151" }}
        >
          Annuel <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>-20%</span>
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-8">
        {PLANS.map((plan) => {
          const displayPrice = billing === "yearly" ? plan.yearlyPrice : plan.price;
          const isLoading = loadingPlan === plan.id;
          return (
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
                  <span className="text-4xl font-extrabold" style={{ color: plan.color }}>{displayPrice}€</span>
                  <span className="text-sm" style={{ color: "#94a3b8" }}>/mois</span>
                </div>
                {billing === "yearly" && (
                  <p className="text-xs mt-1" style={{ color: "#64748b" }}>Facturé {displayPrice * 12}€/an</p>
                )}
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
                onClick={() => handleChoosePlan(plan.id)}
                disabled={isLoading || !!loadingPlan}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: plan.color, color: "#fff" }}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                ) : (
                  <>Choisir {plan.name} <ArrowRight className="inline w-4 h-4" /></>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm" style={{ color: "#94a3b8" }}>
        <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" style={{ color: "#059669" }} /> Paiement sécurisé Stripe</span>
        <span className="flex items-center gap-1.5"><Check className="w-4 h-4" style={{ color: "#059669" }} /> Sans engagement</span>
        <span className="flex items-center gap-1.5"><Zap className="w-4 h-4" style={{ color: "#2563eb" }} /> Accès immédiat</span>
        <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" style={{ color: "#7c3aed" }} /> Accès immédiat</span>
      </div>
    </div>
  );
}

