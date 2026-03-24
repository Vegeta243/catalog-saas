"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, Zap, Download, ShoppingBag } from "lucide-react";

type StatsData = {
  totalUsers: number;
  paidUsers: number;
  activeCount: number;
  mrr: number;
  shopsCount: number;
  planCounts: Record<string, number>;
  monthlyData: { month: string; users: number; revenue: number }[];
};

const PLAN_META = [
  { key: "free",    label: "Free",    color: "#94a3b8" },
  { key: "starter", label: "Starter", color: "#3b82f6" },
  { key: "pro",     label: "Pro",     color: "#059669" },
  { key: "scale",   label: "Scale",   color: "#7c3aed" },
];

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats-data")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const monthlyData = stats?.monthlyData ?? [];
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1);
  const maxUsers = Math.max(...monthlyData.map(d => d.users), 1);
  const lastMonth = monthlyData[monthlyData.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Statistiques</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Métriques et analyses de la plateforme</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">
          <Download className="w-4 h-4" style={{ color: "#64748b" }} />
          <span style={{ color: "#374151" }}>Exporter rapport</span>
        </button>
      </div>

      {loading && (
        <div className="text-center py-12 text-sm" style={{ color: "#94a3b8" }}>Chargement des statistiques…</div>
      )}

      {/* KPI summary */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Utilisateurs total", value: stats.totalUsers.toLocaleString(), color: "#2563eb" },
            { label: "Abonnés payants", value: stats.paidUsers.toLocaleString(), color: "#059669" },
            { label: "MRR estimé", value: `€${stats.mrr.toLocaleString()}`, color: "#7c3aed" },
            { label: "Boutiques créées", value: stats.shopsCount.toLocaleString(), color: "#f59e0b" },
          ].map(k => (
            <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-5">
              <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>{k.label}</p>
              <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Revenue Chart */}
      {monthlyData.length > 0 && (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5" style={{ color: "#2563eb" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Nouveaux inscrits / mois</h2>
          </div>
          {lastMonth && (
            <span className="text-sm font-bold" style={{ color: "#059669" }}>+{lastMonth.users} ce mois</span>
          )}
        </div>
        <div className="flex items-end gap-3 h-48">
          {monthlyData.map((d, i) => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: "#0f172a" }}>{d.users}</span>
              <div className="w-full rounded-t-lg transition-all" style={{
                height: `${(d.users / maxUsers) * 100}%`,
                background: i === monthlyData.length - 1 ? "linear-gradient(180deg, #2563eb, #3b82f6)" : "#e2e8f0",
                minHeight: "4px",
              }} />
              <span className="text-xs" style={{ color: "#94a3b8" }}>{d.month}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        {monthlyData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Croissance utilisateurs</h2>
          </div>
          <div className="space-y-3">
            {monthlyData.map((d, i) => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs w-8" style={{ color: "#94a3b8" }}>{d.month}</span>
                <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
                  <div className="h-full rounded-lg flex items-center px-2"
                    style={{ width: `${Math.max((d.users / maxUsers) * 100, 4)}%`, backgroundColor: i === monthlyData.length - 1 ? "#7c3aed" : "#c4b5fd" }}>
                    <span className="text-[10px] font-bold" style={{ color: "#fff" }}>{d.users}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* MRR per month */}
        {monthlyData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>MRR estimé / mois</h2>
          </div>
          <div className="space-y-3">
            {monthlyData.map((d, i) => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs w-8" style={{ color: "#94a3b8" }}>{d.month}</span>
                <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
                  <div className="h-full rounded-lg flex items-center px-2"
                    style={{ width: `${Math.max((d.revenue / maxRevenue) * 100, 4)}%`, backgroundColor: i === monthlyData.length - 1 ? "#f59e0b" : "#fde68a" }}>
                    <span className="text-[10px] font-bold" style={{ color: "#78350f" }}>€{d.revenue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Plan Distribution */}
      {stats && (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingBag className="w-5 h-5" style={{ color: "#2563eb" }} />
          <h2 className="font-semibold" style={{ color: "#0f172a" }}>Répartition des plans</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {PLAN_META.map(p => {
            const count = stats.planCounts[p.key] ?? 0;
            const pct = stats.totalUsers > 0 ? ((count / stats.totalUsers) * 100).toFixed(1) : "0.0";
            return (
              <div key={p.key} className="text-center p-4 rounded-xl" style={{ backgroundColor: `${p.color}15` }}>
                <p className="text-3xl font-bold" style={{ color: p.color }}>{count}</p>
                <p className="text-sm font-medium mt-1" style={{ color: "#0f172a" }}>{p.label}</p>
                <p className="text-xs" style={{ color: "#94a3b8" }}>{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}
