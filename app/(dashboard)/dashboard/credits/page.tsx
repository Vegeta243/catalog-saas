"use client";

import { useState } from "react";
import { Zap, TrendingUp, BarChart3, Sparkles, Package, Image, Calendar, Crown, Rocket, Star, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { getTasksColor, getResetDate, PLAN_TASKS, PLAN_PRICES } from "@/lib/credits";

const PLAN_META: Record<string, { name: string; icon: typeof Zap; color: string; bg: string; features: string[] }> = {
  free:    { name: "Free",    icon: Star,   color: "#6b7280", bg: "#f9fafb",  features: ["10 actions gratuites", "1 boutique", "Export CSV basique"] },
  starter: { name: "Starter", icon: Zap,    color: "#2563eb", bg: "#eff6ff",  features: ["1 000 actions/mois", "2 boutiques", "Modification en masse", "Support email"] },
  pro:     { name: "Pro",     icon: Crown,  color: "#8b5cf6", bg: "#faf5ff",  features: ["20 000 actions/mois", "5 boutiques", "Éditeur d'images IA", "Automatisations", "Support prioritaire"] },
  scale:   { name: "Scale",   icon: Rocket, color: "#059669", bg: "#f0fdf4",  features: ["100 000 actions/mois", "Boutiques illimitées", "Automatisations illimitées", "API access", "Support dédié + Slack"] },
};

const taskHistory = [
  { action: "Génération titre IA", cost: 1, product: "T-shirt Premium", time: "Il y a 5 min" },
  { action: "Génération description IA", cost: 3, product: "Jean Slim Fit", time: "Il y a 12 min" },
  { action: "Optimisation IA complète", cost: 3, product: "Sneakers Urban", time: "Il y a 30 min" },
  { action: "Génération tags IA", cost: 1, product: "Sac à dos Travel", time: "Il y a 1h" },
  { action: "Import produit", cost: 2, product: "Montre Classique", time: "Il y a 2h" },
  { action: "Optimisation image", cost: 1, product: "Casquette Sport", time: "Il y a 3h" },
  { action: "IA en masse (×5)", cost: 10, product: "Lot accessoires", time: "Hier" },
];

const actionIcons: Record<string, typeof Sparkles> = {
  "Génération titre IA": Sparkles,
  "Génération description IA": Sparkles,
  "Optimisation IA complète": Sparkles,
  "Génération tags IA": Sparkles,
  "Import produit": Package,
  "Optimisation image": Image,
  "IA en masse (×5)": Zap,
};

export default function TasksPage() {
  const [plan] = useState("pro");
  const used = 16;
  const total = PLAN_TASKS[plan] || 300;
  const remaining = total - used;
  const resetDate = getResetDate();
  const color = getTasksColor(remaining);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Mes tâches</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Suivez votre utilisation mensuelle</p>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5" style={{ color: "#2563eb" }} />
              <h2 className="font-semibold" style={{ color: "#0f172a" }}>Mes tâches ce mois</h2>
            </div>
            <span className="text-sm font-bold" style={{ color }}>
              {used} / {total} utilisées
            </span>
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
              <p className="text-xs" style={{ color: "#64748b" }}>Utilisées aujourd&apos;hui</p>
              <p className="text-xl font-bold" style={{ color: "#2563eb" }}>4</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#faf5ff" }}>
              <p className="text-xs" style={{ color: "#64748b" }}>Moy. / jour</p>
              <p className="text-xl font-bold" style={{ color: "#7c3aed" }}>5</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Coût par action</h2>
          </div>
          <p className="text-xs mb-4" style={{ color: "#64748b" }}>
            Une tâche correspond à une action IA. Les modifications en masse ne consomment pas de tâches.
          </p>
          <div className="space-y-3">
            {[
              { action: "Titre IA", cost: 1 },
              { action: "Description IA", cost: 3 },
              { action: "IA en masse (par produit)", cost: 2 },
              { action: "Import produit", cost: 2 },
              { action: "Optimisation image", cost: 1 },
              { action: "Score SEO", cost: 0 },
              { action: "Modifications en masse", cost: 0 },
            ].map((a) => (
              <div key={a.action} className="flex items-center justify-between py-1">
                <span className="text-sm" style={{ color: "#374151" }}>{a.action}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                  backgroundColor: a.cost === 0 ? "#f0fdf4" : "#eff6ff",
                  color: a.cost === 0 ? "#059669" : "#2563eb",
                }}>
                  {a.cost === 0 ? "Gratuit" : `${a.cost} tâche${a.cost > 1 ? "s" : ""}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mon forfait */}
      {(() => {
        const meta = PLAN_META[plan] || PLAN_META.starter;
        const PlanIcon = meta.icon;
        const price = PLAN_PRICES[plan] || "—";
        const nextPlans = ["free", "starter", "pro", "scale"];
        const nextPlanKey = nextPlans[nextPlans.indexOf(plan) + 1];
        const nextMeta = nextPlanKey ? PLAN_META[nextPlanKey] : null;
        const NextIcon = nextMeta?.icon;
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
              <PlanIcon className="w-5 h-5" style={{ color: meta.color }} />
              Mon forfait
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Plan badge + features */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.bg }}>
                  <PlanIcon className="w-7 h-7" style={{ color: meta.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold" style={{ color: "#0f172a" }}>Plan {meta.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: meta.bg, color: meta.color }}>
                      {price}/mois
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {meta.features.map((f) => (
                      <li key={f} className="flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#059669" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* CTA */}
              <div className="flex gap-2 flex-shrink-0">
                <Link
                  href="/dashboard/billing"
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  style={{ color: "#374151" }}
                >
                  Gérer
                </Link>
                {nextMeta && NextIcon && (
                  <Link
                    href={`/dashboard/upgrade`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: nextMeta.color, color: "#fff" }}
                  >
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
        <div className="divide-y divide-gray-50">
          {taskHistory.map((h, i) => {
            const Icon = actionIcons[h.action] || Zap;
            return (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
                    <Icon className="w-4 h-4" style={{ color: "#2563eb" }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{h.action}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{h.product}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold" style={{ color: "#dc2626" }}>-{h.cost} tâche{h.cost > 1 ? "s" : ""}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>{h.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
