"use client";

import { useState, useEffect } from "react";
import { CreditCard, Calendar, ArrowRight, Crown, Zap, Rocket, AlertTriangle, ExternalLink, CheckCircle, Star } from "lucide-react";
import { useToast } from "@/lib/toast";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

const PLAN_INFO: Record<string, { name: string; icon: typeof Zap; price: number; yearlyPrice: number; color: string }> = {
  free:    { name: "Free",    icon: Star,   price: 0,   yearlyPrice: 0,   color: "#6b7280" },
  starter: { name: "Starter", icon: Zap,    price: 29,  yearlyPrice: 20,  color: "#2563eb" },
  pro:     { name: "Pro",     icon: Crown,  price: 89,  yearlyPrice: 62,  color: "#8b5cf6" },
  scale:   { name: "Scale",   icon: Rocket, price: 129, yearlyPrice: 90,  color: "#059669" },
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
          ? "✅ [DÉMO] Abonnement simulé activé — Ajoutez STRIPE_SECRET_KEY pour activer les vrais paiements"
          : "Abonnement activé avec succès ! Bienvenue 🎉",
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

  if (!plan || plan === "free") {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: "#f59e0b" }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: "#0f172a" }}>Aucun abonnement actif</h2>
        <p className="text-sm mb-6" style={{ color: "#64748b" }}>Choisissez un plan pour débloquer toutes les fonctionnalités</p>
        <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold" style={{ color: "#fff" }}>
          Voir les plans <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const info = PLAN_INFO[plan] || PLAN_INFO.starter;
  const Icon = info.icon;
  const displayPrice = billing === "yearly" ? info.yearlyPrice : info.price;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Facturation</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Gérez votre abonnement et vos paiements</p>
        </div>
        <button
          onClick={handlePortal}
          disabled={portalLoading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          style={{ color: "#374151" }}
        >
          <ExternalLink className="w-4 h-4" />
          {portalLoading ? "Chargement..." : "Portail Stripe"}
        </button>
      </div>

      {/* Checkout success banner */}
      {searchParams.get("checkout") === "success" && (
        <div className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-emerald-200" style={{ backgroundColor: "#ecfdf5" }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#059669" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#065f46" }}>Paiement confirmé !</p>
            <p className="text-xs" style={{ color: "#047857" }}>Votre abonnement {info.name} est maintenant actif. Profitez de toutes les fonctionnalités !</p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${info.color}15` }}>
              <Icon className="w-6 h-6" style={{ color: info.color }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: "#0f172a" }}>Plan {info.name}</h2>
              <p className="text-sm" style={{ color: "#64748b" }}>{displayPrice}€/mois • {billing === "yearly" ? "Annuel" : "Mensuel"}</p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100" style={{ color: "#059669" }}>
            {subscriptionStatus === "trialing" ? "Essai gratuit" : subscriptionStatus === "past_due" ? "Paiement en retard" : "Actif"}
          </span>
        </div>
      </div>

      {/* Billing details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" style={{ color: "#64748b" }} />
            <span className="text-sm font-medium" style={{ color: "#374151" }}>Prochain paiement</span>
          </div>
          <p className="text-xl font-bold" style={{ color: "#0f172a" }}>{displayPrice}€</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            {periodEnd ? `Le ${new Date(periodEnd).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}` : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4" style={{ color: "#64748b" }} />
            <span className="text-sm font-medium" style={{ color: "#374151" }}>Moyen de paiement</span>
          </div>
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Géré via Stripe</p>
          <button onClick={handlePortal} className="text-xs mt-1 underline" style={{ color: "#2563eb" }}>
            Modifier la carte
          </button>
        </div>
      </div>

      {/* Invoice history */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold" style={{ color: "#0f172a" }}>Historique des factures</h3>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            style={{ color: "#374151" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {portalLoading ? "Chargement..." : "Voir toutes les factures"}
          </button>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-100">
          <CreditCard className="w-5 h-5 flex-shrink-0" style={{ color: "#2563eb" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#1e40af" }}>Factures disponibles dans le portail Stripe</p>
            <p className="text-xs mt-0.5" style={{ color: "#3b82f6" }}>
              Téléchargez vos factures et gérez votre moyen de paiement directement depuis le portail Stripe sécurisé.
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade options */}
      {plan !== "scale" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-base font-semibold mb-4" style={{ color: "#0f172a" }}>Passer à un plan supérieur</h3>
          <div className="space-y-3">
            {Object.entries(PLAN_INFO).filter(([key]) => {
              const order = ["free", "starter", "pro", "scale"];
              return order.indexOf(key) > order.indexOf(plan);
            }).map(([key, p]) => {
              const PlanIcon = p.icon;
              const planPrice = billing === "yearly" ? p.yearlyPrice : p.price;
              return (
                <div key={key} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <PlanIcon className="w-5 h-5" style={{ color: p.color }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{p.name}</p>
                      <p className="text-xs" style={{ color: "#64748b" }}>{planPrice}€/mois</p>
                    </div>
                  </div>
                  <button onClick={() => handleUpgrade(key)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium" style={{ color: "#fff" }}>
                    Upgrader <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-semibold mb-2" style={{ color: "#0f172a" }}>Annuler l&apos;abonnement</h3>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>
          L&apos;annulation prendra effet à la fin de votre période de facturation actuelle. Vous conservez l&apos;accès jusqu&apos;à la fin de la période payée.
        </p>
        <button onClick={handleCancel} disabled={cancelling}
          className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium disabled:opacity-50" style={{ color: "#475569" }}>
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
