"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, TrendingUp, BarChart3, Sparkles, Package, Calendar, Crown, Rocket, Star, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { getTasksColor, getResetDate, PLAN_TASKS, PLAN_PRICES } from "@/lib/credits";
import { createClient } from "@/lib/supabase/client";

const PLAN_META: Record<string, { name: string; icon: typeof Zap; color: string; bg: string; features: string[] }> = {
  free:    { name: "Free",    icon: Star,   color: "#6b7280", bg: "#f9fafb",  features: ["30 actions gratuites", "1 boutique", "Export CSV basique"] },
  starter: { name: "Starter", icon: Zap,    color: "#2563eb", bg: "#eff6ff",  features: ["1 000 actions/mois", "2 boutiques", "Modification en masse", "Support email"] },
  pro:     { name: "Pro",     icon: Crown,  color: "#8b5cf6", bg: "#faf5ff",  features: ["20 000 actions/mois", "5 boutiques", "Éditeur d'images IA", "Automatisations", "Support prioritaire"] },
  scale:   { name: "Scale",   icon: Rocket, color: "#059669", bg: "#f0fdf4",  features: ["100 000 actions/mois", "Boutiques illimitées", "Automatisations illimitées", "API access", "Support dédié + Slack"] },
};

interface ActionHistoryItem {
  id: string;
  action_type: string;
  description: string;
  credits_used: number;
  products_count: number;
  created_at: string;
}

const actionIcons: Record<string, typeof Sparkles> = {
  ai_title: Sparkles,
  ai_description: Sparkles,
  ai_full: Sparkles,
  ai_tags: Sparkles,
  import: Package,
  bulk_edit: Zap,
  bulk_update: TrendingUp,
};

const actionLabels: Record<string, string> = {
  ai_title: "Titre IA",
  ai_description: "Description IA",
  ai_full: "Optimisation IA complète",
  ai_tags: "Tags IA",
  import: "Import produit",
  bulk_edit: "Modification en masse",
  bulk_update: "Mise à jour prix",
};

export default function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState("free");
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(50);
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);

  const total = limit || PLAN_TASKS[plan] || 50;
  const remaining = Math.max(0, total - used);
  const resetDate = getResetDate();
  const color = getTasksColor(remaining);

  useEffect(() => { document.title = "Crédits | EcomPilot"; }, []);

  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user plan + usage
      const { data: userData } = await supabase
        .from("users")
        .select("plan, actions_used, actions_limit")
        .eq("id", user.id)
        .single();

      if (userData) {
        setPlan(userData.plan || "free");
        setUsed(userData.actions_used || 0);
        setLimit(userData.actions_limit || 50);
      }

      // Fetch action history
      const { data: historyData } = await supabase
        .from("action_history")
        .select("id, action_type, description, credits_used, products_count, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setHistory((historyData || []) as ActionHistoryItem[]);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    if (diff < 172800000) return "Hier";
    return new Date(d).toLocaleDateString("fr-FR");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2563eb" }} /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Mon forfait & actions</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Votre abonnement et votre utilisation</p>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5" style={{ color: "#2563eb" }} />
              <h2 className="font-semibold" style={{ color: "#0f172a" }}>Mes actions ce mois</h2>
            </div>
            <span className="text-sm font-bold" style={{ color }}>{used} / {total} utilisées</span>
          </div>

          <div className="h-4 rounded-full mb-4" style={{ backgroundColor: "#f1f5f9" }}>
            <div className="h-4 rounded-full transition-all" style={{
              width: `${Math.min(100, (used / total) * 100)}%`,
              backgroundColor: color,
            }} />
          </div>

          <div className="flex items-center gap-2 text-xs mb-6" style={{ color: "#64748b" }}>
            <Calendar className="w-3.5 h-3.5" />
            <span>Se renouvellent le {resetDate}</span>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#f0fdf4" }}>
              <p className="text-xs" style={{ color: "#64748b" }}>Restantes</p>
              <p className="text-xl font-bold" style={{ color }}>{remaining}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#eff6ff" }}>
              <p className="text-xs" style={{ color: "#64748b" }}>Utilisées</p>
              <p className="text-xl font-bold" style={{ color: "#2563eb" }}>{used}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#faf5ff" }}>
              <p className="text-xs" style={{ color: "#64748b" }}>Limite</p>
              <p className="text-xl font-bold" style={{ color: "#7c3aed" }}>{total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Coût par action</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#64748b" }}>
            Les modifications en masse ne consomment pas d&apos;actions.
          </p>
          <div className="space-y-3">
            {[
              { action: "Titre IA", cost: 1 },
              { action: "Description IA", cost: 3 },
              { action: "IA en masse (par produit)", cost: 2 },
              { action: "Import produit", cost: 2 },
              { action: "Score SEO", cost: 0 },
              { action: "Modifications en masse", cost: 0 },
            ].map((a) => (
              <div key={a.action} className="flex items-center justify-between py-1">
                <span className="text-sm" style={{ color: "#374151" }}>{a.action}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                  backgroundColor: a.cost === 0 ? "#f0fdf4" : "#eff6ff",
                  color: a.cost === 0 ? "#059669" : "#2563eb",
                }}>
                  {a.cost === 0 ? "Gratuit" : `${a.cost} action${a.cost > 1 ? "s" : ""}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mon forfait */}
      {(() => {
        const meta = PLAN_META[plan] || PLAN_META.free;
        const PlanIcon = meta.icon;
        const price = PLAN_PRICES[plan] || "Gratuit";
        const nextPlans = ["free", "starter", "pro", "scale"];
        const nextPlanKey = nextPlans[nextPlans.indexOf(plan) + 1];
        const nextMeta = nextPlanKey ? PLAN_META[nextPlanKey] : null;
        const NextIcon = nextMeta?.icon;
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
              <PlanIcon className="w-5 h-5" style={{ color: meta.color }} /> Mon forfait
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.bg }}>
                  <PlanIcon className="w-7 h-7" style={{ color: meta.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold" style={{ color: "#0f172a" }}>Plan {meta.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>
                      {plan === "free" ? "Gratuit" : `${price}/mois`}
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {meta.features.map((f) => (
                      <li key={f} className="flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#059669" }} /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {nextMeta && NextIcon && (
                  <Link href="/dashboard/upgrade"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: nextMeta.color, color: "#fff" }}>
                    Passer en {nextMeta.name} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <BarChart3 className="w-5 h-5" style={{ color: "#2563eb" }} />
          <h2 className="font-semibold" style={{ color: "#0f172a" }}>Historique d&apos;utilisation</h2>
        </div>
        {history.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm" style={{ color: "#64748b" }}>Aucune action effectuée pour l&apos;instant</p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Vos actions IA et imports apparaîtront ici</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {history.map((h) => {
              const Icon = actionIcons[h.action_type] || Zap;
              return (
                <div key={h.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
                      <Icon className="w-4 h-4" style={{ color: "#2563eb" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{actionLabels[h.action_type] || h.action_type}</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{h.description || `${h.products_count} produit${h.products_count > 1 ? "s" : ""}`}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold" style={{ color: "#dc2626" }}>-{h.credits_used} action{h.credits_used > 1 ? "s" : ""}</span>
                    <span className="text-xs" style={{ color: "#94a3b8" }}>{formatTime(h.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
