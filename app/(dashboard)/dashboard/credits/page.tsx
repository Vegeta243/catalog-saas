"use client";

import { useState } from "react";
import { Zap, TrendingUp, AlertTriangle, BarChart3, Sparkles, Globe, Image, Package } from "lucide-react";

const creditHistory = [
  { action: "Génération titre IA", cost: 1, product: "T-shirt Premium", time: "Il y a 5 min" },
  { action: "Génération description IA", cost: 2, product: "Jean Slim Fit", time: "Il y a 12 min" },
  { action: "Optimisation SEO complète", cost: 3, product: "Sneakers Urban", time: "Il y a 30 min" },
  { action: "Génération tags IA", cost: 1, product: "Sac à dos Travel", time: "Il y a 1h" },
  { action: "Scraping produit", cost: 1, product: "Montre Classique", time: "Il y a 2h" },
  { action: "Édition image IA", cost: 3, product: "Casquette Sport", time: "Il y a 3h" },
  { action: "Batch IA (x5)", cost: 5, product: "Lot accessoires", time: "Hier" },
];

const actionIcons: Record<string, typeof Sparkles> = {
  "Génération titre IA": Sparkles,
  "Génération description IA": Sparkles,
  "Optimisation SEO complète": Globe,
  "Génération tags IA": Sparkles,
  "Scraping produit": Package,
  "Édition image IA": Image,
  "Batch IA (x5)": Zap,
};

export default function CreditsPage() {
  const [plan] = useState("pro");
  const used = 456;
  const total = 2000;
  const pct = (used / total) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Crédits API</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Suivez votre consommation de crédits et optimisez vos coûts</p>
      </div>

      {/* Usage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5" style={{ color: "#2563eb" }} />
              <h2 className="font-semibold" style={{ color: "#0f172a" }}>Consommation mensuelle</h2>
            </div>
            <span className="text-sm font-bold" style={{ color: pct > 80 ? "#dc2626" : "#059669" }}>
              {used} / {total} crédits
            </span>
          </div>

          <div className="h-4 rounded-full mb-4" style={{ backgroundColor: "#f1f5f9" }}>
            <div className="h-4 rounded-full transition-all" style={{
              width: `${pct}%`,
              background: pct > 80 ? "linear-gradient(90deg, #f59e0b, #dc2626)" : "linear-gradient(90deg, #3b82f6, #2563eb)",
            }} />
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#f0fdf4" }}>
              <p className="text-xs" style={{ color: "#64748b" }}>Restants</p>
              <p className="text-xl font-bold" style={{ color: "#059669" }}>{total - used}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#eff6ff" }}>
              <p className="text-xs" style={{ color: "#64748b" }}>Utilisés aujourd'hui</p>
              <p className="text-xl font-bold" style={{ color: "#2563eb" }}>23</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ backgroundColor: "#faf5ff" }}>
              <p className="text-xs" style={{ color: "#64748b" }}>Moy. / jour</p>
              <p className="text-xl font-bold" style={{ color: "#7c3aed" }}>15</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Coût par action</h2>
          </div>
          <div className="space-y-3">
            {[
              { action: "Titre IA", cost: 1 },
              { action: "Description IA", cost: 2 },
              { action: "SEO complet", cost: 3 },
              { action: "Tags IA", cost: 1 },
              { action: "Édition image", cost: 3 },
              { action: "Batch IA", cost: 5 },
              { action: "Scraping", cost: 1 },
            ].map((a) => (
              <div key={a.action} className="flex items-center justify-between py-1">
                <span className="text-sm" style={{ color: "#374151" }}>{a.action}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                  {a.cost} crédit{a.cost > 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {pct > 70 && (
        <div className="p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
          <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: "#d97706" }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "#92400e" }}>Crédits bientôt épuisés</p>
            <p className="text-xs mt-1" style={{ color: "#a16207" }}>
              Vous avez utilisé {pct.toFixed(0)}% de vos crédits. Passez au plan supérieur pour plus de crédits.
            </p>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <BarChart3 className="w-5 h-5" style={{ color: "#2563eb" }} />
          <h2 className="font-semibold" style={{ color: "#0f172a" }}>Historique d'utilisation</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {creditHistory.map((h, i) => {
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
                  <span className="text-xs font-semibold" style={{ color: "#dc2626" }}>-{h.cost} crédit{h.cost > 1 ? "s" : ""}</span>
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
