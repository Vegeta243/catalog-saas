"use client";

import { BarChart3, TrendingUp, Users, Zap, Globe, Sparkles, Download, ShoppingBag } from "lucide-react";

const monthlyData = [
  { month: "Sep", users: 1200, revenue: 12400 },
  { month: "Oct", users: 1450, revenue: 15200 },
  { month: "Nov", users: 1680, revenue: 17800 },
  { month: "Déc", users: 1920, revenue: 19600 },
  { month: "Jan", users: 2230, revenue: 21400 },
  { month: "Fév", users: 2580, revenue: 23100 },
  { month: "Mar", users: 2847, revenue: 24580 },
];

const topCountries = [
  { country: "France", users: 1245, pct: 43.7 },
  { country: "Belgique", users: 423, pct: 14.9 },
  { country: "Suisse", users: 312, pct: 11.0 },
  { country: "Canada", users: 287, pct: 10.1 },
  { country: "Autres", users: 580, pct: 20.3 },
];

const apiUsage = [
  { api: "Shopify REST", calls: 45200, cost: "€0", trend: "+12%" },
  { api: "OpenAI GPT-4o-mini", calls: 8700, cost: "€87", trend: "+25%" },
  { api: "OpenAI GPT-4o", calls: 1200, cost: "€156", trend: "+8%" },
  { api: "Scraping (Cheerio)", calls: 3400, cost: "€0", trend: "-5%" },
];

const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue));

export default function AdminStatsPage() {
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

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5" style={{ color: "#2563eb" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Revenus mensuels (MRR)</h2>
          </div>
          <span className="text-sm font-bold" style={{ color: "#059669" }}>€24,580 ce mois</span>
        </div>
        <div className="flex items-end gap-3 h-48">
          {monthlyData.map((d) => (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold" style={{ color: "#0f172a" }}>€{(d.revenue / 1000).toFixed(1)}k</span>
              <div className="w-full rounded-t-lg transition-all" style={{
                height: `${(d.revenue / maxRevenue) * 100}%`,
                background: d.month === "Mar" ? "linear-gradient(180deg, #2563eb, #3b82f6)" : "#e2e8f0",
                minHeight: "20px",
              }} />
              <span className="text-xs" style={{ color: "#94a3b8" }}>{d.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Croissance utilisateurs</h2>
          </div>
          <div className="space-y-3">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex items-center gap-3">
                <span className="text-xs w-8" style={{ color: "#94a3b8" }}>{d.month}</span>
                <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ backgroundColor: "#f1f5f9" }}>
                  <div className="h-full rounded-lg flex items-center px-2"
                    style={{ width: `${(d.users / 2847) * 100}%`, backgroundColor: d.month === "Mar" ? "#7c3aed" : "#c4b5fd" }}>
                    <span className="text-[10px] font-bold" style={{ color: "#fff" }}>{d.users.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5" style={{ color: "#059669" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Top pays</h2>
          </div>
          <div className="space-y-4">
            {topCountries.map((c) => (
              <div key={c.country}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: "#0f172a" }}>{c.country}</span>
                  <span className="text-xs" style={{ color: "#64748b" }}>{c.users} utilisateurs ({c.pct}%)</span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: "#f1f5f9" }}>
                  <div className="h-2 rounded-full" style={{ width: `${c.pct}%`, backgroundColor: "#059669" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* API Usage */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />
          <h2 className="font-semibold" style={{ color: "#0f172a" }}>Usage API (ce mois)</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {apiUsage.map((a) => (
            <div key={a.api} className="p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-medium mb-1" style={{ color: "#94a3b8" }}>{a.api}</p>
              <p className="text-xl font-bold" style={{ color: "#0f172a" }}>{a.calls.toLocaleString()}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs font-medium" style={{ color: "#64748b" }}>Coût : {a.cost}</span>
                <span className="text-xs font-semibold" style={{ color: "#059669" }}>{a.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShoppingBag className="w-5 h-5" style={{ color: "#2563eb" }} />
          <h2 className="font-semibold" style={{ color: "#0f172a" }}>Répartition des plans</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { plan: "Free", count: 845, pct: 29.7, color: "#94a3b8" },
            { plan: "Starter", count: 623, pct: 21.9, color: "#3b82f6" },
            { plan: "Pro", count: 987, pct: 34.7, color: "#059669" },
            { plan: "Scale", count: 392, pct: 13.7, color: "#7c3aed" },
          ].map((p) => (
            <div key={p.plan} className="text-center p-4 rounded-xl" style={{ backgroundColor: `${p.color}10` }}>
              <p className="text-3xl font-bold" style={{ color: p.color }}>{p.count}</p>
              <p className="text-sm font-medium mt-1" style={{ color: "#0f172a" }}>{p.plan}</p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>{p.pct}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
