"use client";

import { Users, CreditCard, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, ShoppingBag, Eye } from "lucide-react";

const stats = [
  { label: "Utilisateurs totaux", value: "2,847", change: "+12.5%", up: true, icon: Users, color: "#2563eb" },
  { label: "Abonnés actifs", value: "1,234", change: "+8.2%", up: true, icon: CreditCard, color: "#059669" },
  { label: "Revenus mensuels", value: "€24,580", change: "+15.3%", up: true, icon: TrendingUp, color: "#7c3aed" },
  { label: "Taux de conversion", value: "4.2%", change: "-0.3%", up: false, icon: Activity, color: "#f59e0b" },
];

const recentUsers = [
  { name: "Marie Dupont", email: "marie@example.com", plan: "Pro", date: "Il y a 2h" },
  { name: "Jean Martin", email: "jean@example.com", plan: "Starter", date: "Il y a 5h" },
  { name: "Sophie Bernard", email: "sophie@example.com", plan: "Scale", date: "Il y a 8h" },
  { name: "Lucas Petit", email: "lucas@example.com", plan: "Free", date: "Hier" },
  { name: "Emma Leroy", email: "emma@example.com", plan: "Pro", date: "Hier" },
];

const recentActivity = [
  { action: "Nouvel abonnement Pro", user: "marie@example.com", time: "Il y a 15 min" },
  { action: "Import de 450 produits", user: "jean@example.com", time: "Il y a 30 min" },
  { action: "Upgrade Starter → Pro", user: "sophie@example.com", time: "Il y a 1h" },
  { action: "Génération IA (x25)", user: "lucas@example.com", time: "Il y a 2h" },
  { action: "Connexion boutique Shopify", user: "emma@example.com", time: "Il y a 3h" },
];

const planColors: Record<string, { bg: string; text: string }> = {
  Free: { bg: "#f1f5f9", text: "#475569" },
  Starter: { bg: "#dbeafe", text: "#1d4ed8" },
  Pro: { bg: "#d1fae5", text: "#065f46" },
  Scale: { bg: "#ede9fe", text: "#5b21b6" },
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Dashboard Admin</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Vue d'ensemble de votre plateforme EcomPilot</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold`} style={{ color: stat.up ? "#059669" : "#dc2626" }}>
                  {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Derniers inscrits</h2>
            <a href="/admin/users" className="text-xs font-medium hover:underline" style={{ color: "#2563eb" }}>Voir tout →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentUsers.map((u) => (
              <div key={u.email} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <span className="text-xs font-bold" style={{ color: "#fff" }}>{u.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{u.name}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: planColors[u.plan].bg, color: planColors[u.plan].text }}>{u.plan}</span>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>{u.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Activité récente</h2>
            <a href="/admin/stats" className="text-xs font-medium hover:underline" style={{ color: "#2563eb" }}>Détails →</a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity.map((a, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#2563eb" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{a.action}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{a.user}</p>
                  </div>
                </div>
                <span className="text-xs" style={{ color: "#94a3b8" }}>{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <ShoppingBag className="w-5 h-5" style={{ color: "#f59e0b" }} />
            <span className="text-sm font-medium" style={{ color: "#0f172a" }}>Boutiques connectées</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "#0f172a" }}>892</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>+34 cette semaine</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Eye className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <span className="text-sm font-medium" style={{ color: "#0f172a" }}>Produits gérés</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "#0f172a" }}>128,450</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>+2,340 cette semaine</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-5 h-5" style={{ color: "#059669" }} />
            <span className="text-sm font-medium" style={{ color: "#0f172a" }}>Uptime</span>
          </div>
          <p className="text-3xl font-bold" style={{ color: "#059669" }}>99.98%</p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>30 derniers jours</p>
        </div>
      </div>
    </div>
  );
}
