"use client";

import { useState, useEffect } from "react";
import { CreditCard, Calendar, ArrowRight, Crown, Zap, Rocket, AlertTriangle, ExternalLink, CheckCircle, Star } from "lucide-react";
import { useToast } from "@/lib/toast";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

const PLAN_INFO: Record<string, { name: string; icon: typeof Zap; price: number; yearlyPrice: number; color: string; cardBg: string; border: string; btnBg: string; btnColor: string; badgeBg: string; badgeColor: string }> = {
  free:    { name: "Free",    icon: Star,   price: 0,   yearlyPrice: 0,   color: "#9ca3af", cardBg: "var(--surface-primary)",   border: "1px solid var(--apple-gray-200)", btnBg: "rgba(255,255,255,0.08)", btnColor: "#d1d5db", badgeBg: "rgba(255,255,255,0.06)",  badgeColor: "#9ca3af" },
  starter: { name: "Starter", icon: Zap,    price: 19,  yearlyPrice: 13,  color: "#60a5fa", cardBg: "rgba(37,99,235,0.06)",     border: "1px solid rgba(37,99,235,0.25)",  btnBg: "#2563eb",               btnColor: "#ffffff", badgeBg: "rgba(37,99,235,0.15)",   badgeColor: "#93c5fd" },
  pro:     { name: "Pro",     icon: Crown,  price: 49,  yearlyPrice: 34,  color: "#a78bfa", cardBg: "rgba(124,58,237,0.08)",    border: "2px solid rgba(124,58,237,0.40)", btnBg: "#7c3aed",               btnColor: "#ffffff", badgeBg: "rgba(124,58,237,0.20)",  badgeColor: "#c4b5fd" },
  agency:  { name: "Agency",  icon: Rocket, price: 149, yearlyPrice: 104, color: "#34d399", cardBg: "rgba(5,150,105,0.07)",     border: "1px solid rgba(5,150,105,0.30)",  btnBg: "#059669",               btnColor: "#ffffff", badgeBg: "rgba(5,150,105,0.15)",   badgeColor: "#6ee7b7" },
  scale:   { name: "Agency",  icon: Rocket, price: 149, yearlyPrice: 104, color: "#34d399", cardBg: "rgba(5,150,105,0.07)",     border: "1px solid rgba(5,150,105,0.30)",  btnBg: "#059669",               btnColor: "#ffffff", badgeBg: "rgba(5,150,105,0.15)",   badgeColor: "#6ee7b7" },
};

function BillingContent() {
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => { document.title = "Abonnement | EcomPilot"; }, []);

  useEffect(() => {
    // Show checkout success message
    if (searchParams.get("checkout") === "success") {
      const isDemo = searchParams.get("demo") === "true";
      addToast(
        isDemo
          ? " [DÉMO] Abonnement simulé activé — Ajoutez STRIPE_SECRET_KEY pour activer les vrais paiements"
          : "Abonnement activé avec succès ! Bienvenue ",
        "success"
      );
    }
    if (searchParams.get("portal") === "demo") {
      addToast("ℹ️ [DÉMO] Portail de facturation — Configurez STRIPE_SECRET_KEY pour accéder au portail Stripe réel", "info");
    }

    // Fetch real subscription data from Supabase
    const fetchSubscription = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setPlan("free"); setLoading(false); return; }

        const { data } = await supabase
          .from("users")
          .select("plan, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end")
          .eq("id", user.id)
          .single();

        setPlan(data?.plan || "free");
        setCustomerId(data?.stripe_customer_id || null);
        setSubscriptionStatus(data?.subscription_status || null);
        setPeriodEnd(data?.current_period_end || null);
      } catch {
        setPlan("free");
      } finally {
        setLoading(false);
      }
    };
    fetchSubscription();
  }, [searchParams, addToast]);

  const handleCancel = async () => {
    if (!confirm("Êtes-vous sûr de vouloir annuler votre abonnement ? Vous garderez l'accès jusqu'à la fin de la période.")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else addToast("Accédez au portail Stripe pour annuler votre abonnement.", "info");
    } catch {
      addToast("Erreur réseau", "error");
    } finally {
      setCancelling(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else addToast("Erreur lors de l'accès au portail", "error");
    } catch {
      addToast("Erreur réseau", "error");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (newPlan: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan, billing, email: user?.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else addToast("Erreur lors de la redirection", "error");
    } catch {
      addToast("Erreur réseau", "error");
    }
  };

  const handleDowngrade = async (_newPlan: string) => {
    addToast("Pour rétrograder, accédez au portail Stripe.", "info");
    handlePortal();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-4 w-80 bg-gray-100 rounded" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const info = PLAN_INFO[(plan ?? 'free') as keyof typeof PLAN_INFO] || PLAN_INFO.starter;
  const Icon = info.icon;
  const displayPrice = billing === "yearly" ? info.yearlyPrice : info.price;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Facturation</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>Gérez votre abonnement et vos paiements</p>
        </div>
        <button
          onClick={handlePortal}
          disabled={portalLoading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          style={{ color: "var(--text-secondary)" }}
        >
          <ExternalLink className="w-4 h-4" />
          {portalLoading ? "Chargement..." : "Portail Stripe"}
        </button>
      </div>

      {/* Checkout success banner */}
      {searchParams.get("checkout") === "success" && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-emerald-200" style={{ backgroundColor: "rgba(16,185,129,0.08)" }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#059669" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#6ee7b7" }}>Paiement confirmé !</p>
            <p className="text-xs" style={{ color: "#6ee7b7" }}>Votre abonnement {info.name} est maintenant actif. Profitez de toutes les fonctionnalités !</p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="rounded-xl p-6 mb-6" style={{ background: info.cardBg, border: info.border }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${info.color}20` }}>
              <Icon className="w-6 h-6" style={{ color: info.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Plan {info.name}</h2>
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{displayPrice === 0 ? "Gratuit" : `${displayPrice}€/mois`} • {billing === "yearly" ? "Annuel" : "Mensuel"}</p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ background: info.badgeBg, color: info.badgeColor }}>
            {subscriptionStatus === "trialing" ? "Essai gratuit" : subscriptionStatus === "past_due" ? "Paiement en retard" : plan === "free" ? "Gratuit" : "Actif"}
          </span>
        </div>
      </div>

      {/* Billing details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Prochain paiement</span>
          </div>
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{displayPrice}€</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            {periodEnd ? `Le ${new Date(periodEnd).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Moyen de paiement</span>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Géré via Stripe</p>
          <button onClick={handlePortal} className="text-xs mt-1 underline" style={{ color: "#2563eb" }}>
            Modifier la carte
          </button>
        </div>
      </div>

      {/* Invoice history */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Historique des factures</h3>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            style={{ color: "var(--text-secondary)" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {portalLoading ? "Chargement..." : "Voir toutes les factures"}
          </button>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.20)" }}>
          <CreditCard className="w-5 h-5 flex-shrink-0" style={{ color: "#2563eb" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#93c5fd" }}>Factures disponibles dans le portail Stripe</p>
            <p className="text-xs mt-0.5" style={{ color: "#3b82f6" }}>
              Téléchargez vos factures et gérez votre moyen de paiement directement depuis le portail Stripe sécurisé.
            </p>
          </div>
        </div>
      </div>

      {/* All plans comparison grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Comparer les plans</h3>
          {/* Billing toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--surface-secondary)", border: "1px solid var(--apple-gray-200)" }}>
            <button
              onClick={() => setBilling("monthly")}
              className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
              style={{ background: billing === "monthly" ? "rgba(255,255,255,0.08)" : "transparent", color: billing === "monthly" ? "var(--text-primary)" : "var(--text-tertiary)", boxShadow: billing === "monthly" ? "0 1px 3px rgba(0,0,0,0.4)" : "none" }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
              style={{ background: billing === "yearly" ? "rgba(255,255,255,0.08)" : "transparent", color: billing === "yearly" ? "var(--text-primary)" : "var(--text-tertiary)", boxShadow: billing === "yearly" ? "0 1px 3px rgba(0,0,0,0.4)" : "none" }}
            >
              Annuel <span style={{ color: "#059669", fontWeight: 600 }}>-20%</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(PLAN_INFO).filter(([key]) => key !== "scale").map(([key, p]) => {
            const PlanIcon = p.icon;
            const planPrice = billing === "yearly" ? p.yearlyPrice : p.price;
            const isCurrent = plan === key || (key === "agency" && plan === "scale");
            const planOrder = ["free", "starter", "pro", "agency"];
            const isUpgrade = planOrder.indexOf(key) > planOrder.indexOf(plan ?? "free");
            return (
              <div key={key} className="rounded-xl p-4" style={{ background: p.cardBg, border: isCurrent ? "2px solid #10b981" : p.border }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PlanIcon className="w-4 h-4" style={{ color: p.color }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: p.badgeBg, color: p.badgeColor }}>{planPrice === 0 ? "Gratuit" : `${planPrice}€/mois`}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "#6ee7b7" }}>✓ Actuel</span>
                  )}
                </div>
                {isCurrent ? (
                  <div className="w-full py-2 text-center rounded-lg text-xs font-medium" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.30)", color: "#6ee7b7" }}>
                    Votre plan actuel
                  </div>
                ) : isUpgrade ? (
                  <button onClick={() => handleUpgrade(key)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                    style={{ background: p.btnBg, color: p.btnColor, border: "none" }}>
                    Passer à {p.name} <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="w-full py-2 text-center rounded-lg text-xs" style={{ background: "var(--surface-secondary)", border: "1px solid var(--apple-gray-200)", color: "#9ca3af" }}>
                    Plan inférieur
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Annuler l&apos;abonnement</h3>
        <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
          L&apos;annulation prendra effet à la fin de votre période de facturation actuelle. Vous conservez l&apos;accès jusqu&apos;à la fin de la période payée.
        </p>
        <button onClick={handleCancel} disabled={cancelling}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium disabled:opacity-50" style={{ color: "var(--text-secondary)" }}>
          {cancelling ? "Annulation en cours…" : "Annuler l'abonnement"}
        </button>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto"><div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-gray-200 rounded" /><div className="h-64 bg-gray-100 rounded-xl" /></div></div>}>
      <BillingContent />
    </Suspense>
  );
}
