"use client";

import { useState } from "react";
import { CreditCard, TrendingUp, AlertTriangle, CheckCircle, Search, Filter, Crown } from "lucide-react";

const stats = [
  { label: "Abonnements actifs", value: "1,234", icon: CreditCard, color: "#059669" },
  { label: "MRR", value: "€24,580", icon: TrendingUp, color: "#2563eb" },
  { label: "Churn rate", value: "2.1%", icon: AlertTriangle, color: "#f59e0b" },
  { label: "Essais en cours", value: "89", icon: CheckCircle, color: "#7c3aed" },
];

const subscriptions = [
  { user: "Marie Dupont", email: "marie@example.com", plan: "Pro", amount: "€29/mois", status: "active", nextBilling: "2026-04-15", method: "Stripe" },
  { user: "Sophie Bernard", email: "sophie@example.com", plan: "Scale", amount: "€79/mois", status: "active", nextBilling: "2026-04-03", method: "Stripe" },
  { user: "Jean Martin", email: "jean@example.com", plan: "Starter", amount: "€9/mois", status: "active", nextBilling: "2026-04-20", method: "PayPal" },
  { user: "Camille Moreau", email: "camille@example.com", plan: "Pro", amount: "€29/mois", status: "trial", nextBilling: "2026-03-10", method: "—" },
  { user: "Thomas Richard", email: "thomas@example.com", plan: "Starter", amount: "€9/mois", status: "cancelled", nextBilling: "—", method: "Stripe" },
  { user: "Emma Leroy", email: "emma@example.com", plan: "Pro", amount: "€29/mois", status: "past_due", nextBilling: "2026-03-01", method: "Stripe" },
];

const planColors: Record<string, { bg: string; text: string }> = {
  Starter: { bg: "#dbeafe", text: "#1d4ed8" },
  Pro: { bg: "#d1fae5", text: "#065f46" },
  Scale: { bg: "#ede9fe", text: "#5b21b6" },
};

const statusMap: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "Actif", bg: "#d1fae5", text: "#065f46" },
  trial: { label: "Essai", bg: "#dbeafe", text: "#1d4ed8" },
  cancelled: { label: "Annulé", bg: "#f1f5f9", text: "#475569" },
  past_due: { label: "Impayé", bg: "#fef2f2", text: "#991b1b" },
};

export default function AdminSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = subscriptions.filter((s) => {
    const matchSearch = s.user.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Abonnements</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Gérez les abonnements et la facturation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-2">
                <Icon className="w-5 h-5" style={{ color: s.color }} />
                <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>{s.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
            style={{ color: "#0f172a" }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: "#94a3b8" }} />
          {["all", "active", "trial", "past_due", "cancelled"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors`}
              style={filterStatus === s ? { backgroundColor: "#dc2626", color: "#fff" } : { color: "#64748b" }}>
              {s === "all" ? "Tous" : statusMap[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: "#fafafa" }}>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Utilisateur</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Plan</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Montant</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Statut</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Prochaine fact.</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Méthode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3">
                  <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{s.user}</p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{s.email}</p>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                    style={{ backgroundColor: planColors[s.plan].bg, color: planColors[s.plan].text }}>
                    {s.plan === "Scale" && <Crown className="w-3 h-3" />}{s.plan}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm font-medium" style={{ color: "#0f172a" }}>{s.amount}</td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: statusMap[s.status].bg, color: statusMap[s.status].text }}>
                    {statusMap[s.status].label}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm" style={{ color: "#64748b" }}>{s.nextBilling}</td>
                <td className="px-5 py-3 text-sm" style={{ color: "#64748b" }}>{s.method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
