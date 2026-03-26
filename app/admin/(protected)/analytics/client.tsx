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

  // Churn calculation (users with paid plan but not active)
  const churnedCount = users.filter(u => u.plan !== "free" && u.subscription_status !== "active").length;
  const totalEverPaid = (planCounts["starter"] || 0) + (planCounts["pro"] || 0) + (planCounts["agency"] || 0) + (planCounts["scale"] || 0);
  const activePayingCount = users.filter(u => u.plan !== "free" && u.subscription_status === "active").length;
  const churnRate = totalEverPaid > 0 ? ((churnedCount / totalEverPaid) * 100).toFixed(1) : "0";

  const mrr = activePayingCount > 0
    ? users.filter(u => u.plan !== "free" && u.subscription_status === "active")
        .reduce((sum, u) => sum + ({ starter: 19, pro: 49, agency: 149, scale: 149 }[u.plan] || 0), 0)
    : 0;

  // RAG helper
  const ragColor = (rate: number, green: number, amber: number) =>
    rate >= green ? "#22c55e" : rate >= amber ? "#f59e0b" : "#ef4444";
  const ragLabel = (rate: number, green: number, amber: number) =>
    rate >= green ? "🟢" : rate >= amber ? "🟡" : "🔴";

  // Funnel data
  const funnelData = [
    { label: "Inscrits", count: users.length, rate: 100, green: 0, amber: 0 },
    { label: "Boutique connectée", count: users.filter(u => shops.some(s => s.user_id === u.id)).length, rate: users.length > 0 ? Math.round((users.filter(u => shops.some(s => s.user_id === u.id)).length / users.length) * 100) : 0, green: 50, amber: 30 },
    { label: "Au moins 1 action", count: tasks.length > 0 ? new Set(tasks.map(t => t.user_id)).size : 0, rate: users.length > 0 ? Math.round(((tasks.length > 0 ? new Set(tasks.map(t => t.user_id)).size : 0) / users.length) * 100) : 0, green: 40, amber: 20 },
    { label: "Payants (actifs)", count: activePayingCount, rate: users.length > 0 ? parseFloat(((activePayingCount / users.length) * 100).toFixed(1)) : 0, green: 5, amber: 2 },
  ];

  // Weekly objectives
  const MS7 = 7 * 86400000;
  const now = Date.now();
  const usersLast7 = users.filter(u => now - new Date(u.created_at).getTime() < MS7);
  const weeklyObj = [
    { label: "Inscriptions", current: usersLast7.length, target: 20 },
    { label: "Boutiques", current: shops.filter(s => now - new Date(s.created_at).getTime() < MS7).length, target: 10 },
    { label: "Actions IA", current: tasks.filter(t => now - new Date(t.created_at).getTime() < MS7).length, target: 50 },
    { label: "Conversions payantes", current: usersLast7.filter(u => u.plan !== "free" && u.subscription_status === "active").length, target: 2 },
  ];

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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { label: "Utilisateurs total", value: users.length, sub: `+${Object.values(usersByDay).reduce((a, b) => a + b, 0)} (30j)`, color: "#3b82f6" },
          { label: "MRR (actifs)", value: `${mrr}€`, sub: `${activePayingCount} payants actifs`, color: "#10b981" },
          { label: "Tâches IA (30j)", value: tasks.length, sub: `${Object.keys(taskTypeCounts).length} types`, color: "#8b5cf6" },
          { label: "Boutiques connectées", value: shops.length, sub: `+${Object.values(shopsByDay).reduce((a, b) => a + b, 0)} (30j)`, color: "#f59e0b" },
          { label: "Churn", value: `${churnRate}%`, sub: `${churnedCount} perdu${churnedCount > 1 ? "s" : ""}`, color: parseFloat(churnRate) > 10 ? "#ef4444" : parseFloat(churnRate) > 5 ? "#f59e0b" : "#22c55e" },
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
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#374151" }}>Funnel de conversion (RAG)</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 font-semibold" style={{ color: "#64748b" }}>Étape</th>
                  <th className="text-right py-1.5 font-semibold" style={{ color: "#64748b" }}>Nb</th>
                  <th className="text-right py-1.5 font-semibold" style={{ color: "#64748b" }}>Taux</th>
                  <th className="text-center py-1.5 font-semibold" style={{ color: "#64748b" }}>RAG</th>
                </tr>
              </thead>
              <tbody>
                {funnelData.map((step) => (
                  <tr key={step.label} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 font-medium" style={{ color: "#0f172a" }}>{step.label}</td>
                    <td className="py-2 text-right font-bold" style={{ color: "#0f172a" }}>{step.count}</td>
                    <td className="py-2 text-right font-semibold" style={{ color: ragColor(step.rate, step.green, step.amber) }}>{step.rate}%</td>
                    <td className="py-2 text-center">{step.label === "Inscrits" ? "—" : ragLabel(step.rate, step.green, step.amber)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Churn */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: "#374151" }}>Churn</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: parseFloat(churnRate) > 10 ? "#ef4444" : parseFloat(churnRate) > 5 ? "#f59e0b" : "#22c55e" }}>
                  {churnRate}%
                </span>
                <span className="text-[10px]" style={{ color: "#94a3b8" }}>({churnedCount} churned / {totalEverPaid} total paid)</span>
              </div>
            </div>
          </div>

          {/* Weekly objectives */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 col-span-2">
            <h3 className="text-xs font-semibold mb-3" style={{ color: "#374151" }}>Objectifs hebdomadaires</h3>
            <div className="grid grid-cols-4 gap-4">
              {weeklyObj.map((obj) => {
                const pct = Math.min(100, Math.round((obj.current / obj.target) * 100));
                const color = pct >= 100 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={obj.label} className="text-center">
                    <p className="text-2xl font-bold" style={{ color }}>{obj.current}</p>
                    <p className="text-[10px] font-medium" style={{ color: "#64748b" }}>/ {obj.target} — {obj.label}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-[10px] mt-1 font-bold" style={{ color }}>{pct}%</p>
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
              { plan: "Starter", count: planCounts["starter"] || 0, price: 19, color: "#3b82f6" },
              { plan: "Pro", count: planCounts["pro"] || 0, price: 49, color: "#8b5cf6" },
              { plan: "Agency", count: (planCounts["agency"] || 0) + (planCounts["scale"] || 0), price: 149, color: "#f59e0b" },
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
              {["free", "starter", "pro", "agency"].map(plan => {
                const count = planCounts[plan] || 0;
                const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
                const active = users.filter(u => u.plan === plan && u.subscription_status === "active").length;
                return (
                  <tr key={plan} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-bold capitalize"
                      style={{ color: { free: "#94a3b8", starter: "#3b82f6", pro: "#8b5cf6", agency: "#f59e0b" }[plan] }}>
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
