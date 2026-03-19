"use client";

import { useState } from "react";
import { BarChart3, TrendingUp, Users, Zap } from "lucide-react";

interface UserRow { id: string; plan: string; created_at: string; subscription_status: string; }
interface TaskRow { user_id: string; task_type: string; created_at: string; }
interface ShopRow { user_id: string; created_at: string; }
interface ReferralRow { referrer_id: string; status: string; created_at: string; }

function groupByDay(items: { created_at: string }[]): Record<string, number> {
  return items.reduce((acc, item) => {
    const day = item.created_at.substring(0, 10);
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function last30Days() {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().substring(0, 10));
  }
  return days;
}

function MiniBar({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-px h-12">
      {data.map((v, i) => (
        <div key={i} style={{ height: `${(v / max) * 100}%`, backgroundColor: color, minHeight: v > 0 ? "2px" : "0", flex: 1, borderRadius: "1px" }} />
      ))}
    </div>
  );
}

export default function AnalyticsClient({ users, tasks, shops, referrals }: { users: UserRow[]; tasks: TaskRow[]; shops: ShopRow[]; referrals: ReferralRow[] }) {
  const [tab, setTab] = useState("growth");
  const days = last30Days();
  const usersByDay = groupByDay(users.filter(u => days.includes(u.created_at.substring(0, 10))));
  const tasksByDay = groupByDay(tasks);
  const shopsByDay = groupByDay(shops.filter(s => days.includes(s.created_at.substring(0, 10))));
  const refByDay = groupByDay(referrals.filter(r => days.includes(r.created_at.substring(0, 10))));

  const planCounts = users.reduce((acc, u) => { acc[u.plan] = (acc[u.plan] || 0) + 1; return acc; }, {} as Record<string, number>);
  const taskTypeCounts = tasks.reduce((acc, t) => { acc[t.task_type] = (acc[t.task_type] || 0) + 1; return acc; }, {} as Record<string, number>);

  const mrr = (planCounts["starter"] || 0) * 39 + (planCounts["pro"] || 0) * 89 + (planCounts["scale"] || 0) * 179;

  const TABS = [
    { id: "growth", label: "Croissance", icon: TrendingUp },
    { id: "revenue", label: "Revenus", icon: BarChart3 },
    { id: "usage", label: "Usage IA", icon: Zap },
    { id: "users", label: "Utilisateurs", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>📈 Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>Croissance, revenus, usage IA et conversion</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Utilisateurs total", value: users.length, sub: `+${Object.values(usersByDay).reduce((a, b) => a + b, 0)} (30j)`, color: "#3b82f6" },
          { label: "MRR estimé", value: `${mrr}€`, sub: `${(planCounts["pro"] || 0) + (planCounts["scale"] || 0)} payants`, color: "#10b981" },
          { label: "Tâches IA (30j)", value: tasks.length, sub: `${Object.keys(taskTypeCounts).length} types`, color: "#8b5cf6" },
          { label: "Boutiques connectées", value: shops.length, sub: `+${Object.values(shopsByDay).reduce((a, b) => a + b, 0)} (30j)`, color: "#f59e0b" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: "#374151" }}>{label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Growth tab */}
      {tab === "growth" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#374151" }}>Nouveaux utilisateurs (30j)</h3>
            <MiniBar data={days.map(d => usersByDay[d] || 0)} color="#3b82f6" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">{days[0]}</span>
              <span className="text-[10px] text-gray-400">{days[days.length - 1]}</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#374151" }}>Nouvelles boutiques (30j)</h3>
            <MiniBar data={days.map(d => shopsByDay[d] || 0)} color="#10b981" />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">{days[0]}</span>
              <span className="text-[10px] text-gray-400">{days[days.length - 1]}</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#374151" }}>Parrainages (90j)</h3>
            <MiniBar data={days.map(d => refByDay[d] || 0)} color="#f59e0b" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#374151" }}>Taux de conversion plans</h3>
            <div className="space-y-2 mt-2">
              {["free", "starter", "pro", "scale"].map(p => {
                const count = planCounts[p] || 0;
                const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                const color = { free: "#94a3b8", starter: "#3b82f6", pro: "#8b5cf6", scale: "#f59e0b" }[p];
                return (
                  <div key={p}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize font-medium" style={{ color: "#374151" }}>{p}</span>
                      <span style={{ color }}>{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Revenue tab */}
      {tab === "revenue" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>MRR par plan</h3>
            {[
              { plan: "Starter", count: planCounts["starter"] || 0, price: 39, color: "#3b82f6" },
              { plan: "Pro", count: planCounts["pro"] || 0, price: 89, color: "#8b5cf6" },
              { plan: "Scale", count: planCounts["scale"] || 0, price: 179, color: "#f59e0b" },
            ].map(({ plan, count, price, color }) => (
              <div key={plan} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <span className="text-sm font-medium" style={{ color: "#0f172a" }}>{plan}</span>
                  <span className="text-xs ml-2" style={{ color: "#94a3b8" }}>{count} × {price}€</span>
                </div>
                <span className="text-sm font-bold" style={{ color }}>{count * price}€/mois</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 mt-1">
              <span className="text-sm font-bold" style={{ color: "#0f172a" }}>Total MRR</span>
              <span className="text-lg font-bold text-emerald-600">{mrr}€/mois</span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>ARR projeté</h3>
            <div className="text-center py-6">
              <p className="text-4xl font-bold text-emerald-600">{(mrr * 12).toLocaleString("fr-FR")}€</p>
              <p className="text-sm mt-2" style={{ color: "#64748b" }}>ARR annuel projeté</p>
              <p className="text-xs mt-4 p-3 bg-gray-50 rounded-xl" style={{ color: "#64748b" }}>
                Basé sur le MRR actuel de {mrr}€/mois × 12 mois
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Usage tab */}
      {tab === "usage" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#374151" }}>Tâches IA par jour (30j)</h3>
            <MiniBar data={days.map(d => tasksByDay[d] || 0)} color="#8b5cf6" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#374151" }}>Top types de tâches IA</h3>
            <div className="space-y-2">
              {Object.entries(taskTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([type, count]) => {
                const total = tasks.length;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span style={{ color: "#374151" }}>{type}</span>
                      <span style={{ color: "#64748b" }}>{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round((count / total) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
              {tasks.length === 0 && <p className="text-xs text-gray-400">Aucune donnée</p>}
            </div>
          </div>
        </div>
      )}

      {/* Users breakdown */}
      {tab === "users" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Répartition des utilisateurs</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {["Plan", "Utilisateurs", "% total", "Statut abonnement"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold px-4 py-2.5" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {["free", "starter", "pro", "scale"].map(plan => {
                const count = planCounts[plan] || 0;
                const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                const active = users.filter(u => u.plan === plan && u.subscription_status === "active").length;
                return (
                  <tr key={plan} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-bold capitalize"
                      style={{ color: { free: "#94a3b8", starter: "#3b82f6", pro: "#8b5cf6", scale: "#f59e0b" }[plan] }}>
                      {plan}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#0f172a" }}>{count}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>{pct}%</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                      {plan !== "free" ? `${active} actifs` : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
