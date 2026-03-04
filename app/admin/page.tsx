"use client";

import { useState } from "react";
import {
  Users, CreditCard, TrendingUp, Activity, ArrowUpRight, ArrowDownRight,
  Zap, AlertTriangle, CheckCircle, RefreshCw, ShoppingBag,
  Server, Cpu, Database, Wifi, Bell, UserPlus, Crown, DollarSign, Percent,
  ChevronRight, Download, Mail, Pause, Lock, XCircle, BarChart3
} from "lucide-react";

const kpis = [
  { label: "Utilisateurs totaux", value: "2 847", change: "+12.5%", up: true, icon: Users, color: "#2563eb", sub: "+298 ce mois" },
  { label: "AbonnÃ©s actifs", value: "1 234", change: "+8.2%", up: true, icon: CreditCard, color: "#059669", sub: "43.4% des inscrits" },
  { label: "MRR (revenus/mois)", value: "24 580 â‚¬", change: "+15.3%", up: true, icon: DollarSign, color: "#7c3aed", sub: "ARR : 294 960 â‚¬" },
  { label: "Taux de conversion", value: "4.2%", change: "-0.3%", up: false, icon: Percent, color: "#f59e0b", sub: "Cible : 5%" },
  { label: "Utilisateurs actifs (24h)", value: "412", change: "+4.1%", up: true, icon: Activity, color: "#0891b2", sub: "Pic hier : 18h" },
  { label: "Taux de churn", value: "2.1%", change: "-0.5%", up: true, icon: TrendingUp, color: "#16a34a", sub: "En baisse 3 mois" },
  { label: "Comptes Free (limite)", value: "845", change: "+5.9%", up: false, icon: Zap, color: "#ea580c", sub: "29.7% des comptes" },
  { label: "TÃ¢ches IA aujourd'hui", value: "1 847", change: "+22.1%", up: true, icon: BarChart3, color: "#7c3aed", sub: "Moy. : 1 400/j" },
];

const recentActivity = [
  { icon: UserPlus, color: "#059669", text: "Nouveau compte Pro â€” marie@store.fr", time: "Il y a 4 min" },
  { icon: Crown, color: "#7c3aed", text: "Upgrade Starter â†’ Pro â€” j.martin@gmail.com", time: "Il y a 18 min" },
  { icon: Zap, color: "#2563eb", text: "GÃ©nÃ©ration IA Ã—50 produits â€” sophie@boutique.fr", time: "Il y a 31 min" },
  { icon: AlertTriangle, color: "#f59e0b", text: "Limite Free atteinte â€” alex.ds@free.fr", time: "Il y a 47 min" },
  { icon: ShoppingBag, color: "#0891b2", text: "Import 342 produits AliExpress â€” camille@mode.fr", time: "Il y a 1h" },
  { icon: XCircle, color: "#dc2626", text: "DÃ©sabonnement Pro â€” t.richard@email.com", time: "Il y a 2h" },
  { icon: UserPlus, color: "#059669", text: "Nouveau compte Free â€” contact@shop.fr", time: "Il y a 2h" },
  { icon: CreditCard, color: "#059669", text: "Paiement rÃ©ussi 89â‚¬ â€” emma@eboutique.fr", time: "Il y a 3h" },
];

const recentUsers = [
  { name: "Marie Dupont", email: "marie@store.fr", plan: "Pro", status: "active", country: "ðŸ‡«ðŸ‡·", date: "Il y a 4 min" },
  { name: "Jean Martin", email: "j.martin@gmail.com", plan: "Pro", status: "active", country: "ðŸ‡«ðŸ‡·", date: "Il y a 18 min" },
  { name: "Sophie Bernard", email: "sophie@boutique.fr", plan: "Scale", status: "active", country: "ðŸ‡§ðŸ‡ª", date: "Il y a 31 min" },
  { name: "Alexandre D.", email: "alex.ds@free.fr", plan: "Free", status: "limit_reached", country: "ðŸ‡¨ðŸ‡­", date: "Il y a 47 min" },
  { name: "Camille Moreau", email: "camille@mode.fr", plan: "Starter", status: "active", country: "ðŸ‡«ðŸ‡·", date: "Il y a 1h" },
];

const alerts = [
  { level: "warning", icon: AlertTriangle, msg: "845 comptes Free ont atteint leur limite d'actions. OpportunitÃ© de conversion.", action: "Voir liste" },
  { level: "info", icon: Bell, msg: "Renouvellement de 23 abonnements dans les 7 prochains jours.", action: "Voir agenda" },
  { level: "error", icon: XCircle, msg: "3 paiements Stripe ont Ã©chouÃ© aujourd'hui. RÃ©solution requise.", action: "RÃ©soudre" },
];

const systemHealth = [
  { label: "Serveur Next.js", status: "ok", val: "99.98%", icon: Server },
  { label: "Base Supabase", status: "ok", val: "RÃ©ponse 32ms", icon: Database },
  { label: "API Shopify", status: "ok", val: "45 200 appels/j", icon: Wifi },
  { label: "OpenAI GPT", status: "warning", val: "Latence +200ms", icon: Cpu },
  { label: "Stripe Webhook", status: "ok", val: "DerniÃ¨re livraison : 2 min", icon: CreditCard },
  { label: "File jobs", status: "ok", val: "0 jobs en attente", icon: RefreshCw },
];

const topFeatures = [
  { name: "GÃ©nÃ©ration IA descriptions", uses: 18_420, pct: 88, color: "#7c3aed" },
  { name: "Ã‰dition de prix en masse", uses: 14_200, pct: 68, color: "#2563eb" },
  { name: "Import AliExpress / CJ", uses: 9_800, pct: 47, color: "#059669" },
  { name: "Score visibilitÃ© produit", uses: 7_340, pct: 35, color: "#f59e0b" },
  { name: "Export CSV", uses: 5_210, pct: 25, color: "#0891b2" },
  { name: "GÃ©nÃ©ration IA titres", uses: 3_900, pct: 19, color: "#dc2626" },
];

const monthlyRevenue = [
  { m: "Sep", v: 12_400 }, { m: "Oct", v: 15_200 }, { m: "Nov", v: 17_800 },
  { m: "DÃ©c", v: 19_600 }, { m: "Jan", v: 21_400 }, { m: "FÃ©v", v: 23_100 }, { m: "Mar", v: 24_580 },
];
const maxRev = Math.max(...monthlyRevenue.map((d) => d.v));

const planCounts = [
  { plan: "Free", count: 845, pct: 29.7, color: "#94a3b8" },
  { plan: "Starter", count: 623, pct: 21.9, color: "#3b82f6" },
  { plan: "Pro", count: 987, pct: 34.7, color: "#059669" },
  { plan: "Scale", count: 392, pct: 13.7, color: "#7c3aed" },
];

const planColors: Record<string, { bg: string; text: string }> = {
  Free: { bg: "#f1f5f9", text: "#475569" },
  Starter: { bg: "#dbeafe", text: "#1d4ed8" },
  Pro: { bg: "#d1fae5", text: "#065f46" },
  Scale: { bg: "#ede9fe", text: "#5b21b6" },
};

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "#d1fae5", text: "#065f46", label: "Actif" },
  limit_reached: { bg: "#fef3c7", text: "#92400e", label: "Limite atteinte" },
  suspended: { bg: "#fee2e2", text: "#991b1b", label: "Suspendu" },
};

export default function AdminDashboard() {
  const [, setSearch] = useState("");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Dashboard Admin</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Vue d&apos;ensemble Â· Mis Ã  jour il y a 2 min</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" style={{ color: "#64748b" }} />
            <span style={{ color: "#374151" }}>Actualiser</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" style={{ color: "#64748b" }} />
            <span style={{ color: "#374151" }}>Rapport PDF</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {alerts.map((a, i) => {
          const Icon = a.icon;
          const colors = {
            warning: { bg: "#fef9c3", border: "#fde047", text: "#854d0e", btn: "#a16207" },
            info: { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", btn: "#2563eb" },
            error: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", btn: "#dc2626" },
          };
          const c = colors[a.level as keyof typeof colors];
          return (
            <div key={i} className="flex items-center justify-between px-4 py-3 rounded-xl border" style={{ backgroundColor: c.bg, borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" style={{ color: c.text }} />
                <span className="text-sm font-medium" style={{ color: c.text }}>{a.msg}</span>
              </div>
              <button className="text-xs font-bold shrink-0 hover:underline" style={{ color: c.btn }}>{a.action} â†’</button>
            </div>
          );
        })}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${k.color}18` }}>
                  <Icon className="w-4 h-4" style={{ color: k.color }} />
                </div>
                <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: k.up ? "#059669" : "#dc2626" }}>
                  {k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {k.change}
                </span>
              </div>
              <p className="text-xl font-extrabold leading-tight" style={{ color: "#0f172a" }}>{k.value}</p>
              <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>{k.label}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: "#64748b" }}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart + Plan Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold" style={{ color: "#0f172a" }}>MRR â€” 7 derniers mois</h2>
              <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Revenus rÃ©currents mensuels en euros</p>
            </div>
            <span className="text-sm font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>+15.3% vs M-1</span>
          </div>
          <div className="flex items-end gap-3 h-44">
            {monthlyRevenue.map((d) => (
              <div key={d.m} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] font-semibold" style={{ color: "#0f172a" }}>{(d.v / 1000).toFixed(1)}kâ‚¬</span>
                <div className="w-full rounded-t-lg" style={{ height: `${(d.v / maxRev) * 100}%`, background: d.m === "Mar" ? "linear-gradient(180deg,#2563eb,#3b82f6)" : "#e2e8f0", minHeight: "20px" }} />
                <span className="text-[10px]" style={{ color: "#94a3b8" }}>{d.m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4" style={{ color: "#0f172a" }}>RÃ©partition des plans</h2>
          <div className="space-y-3">
            {planCounts.map((p) => (
              <div key={p.plan}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>{p.plan}</span>
                  <span className="text-xs" style={{ color: "#64748b" }}>{p.count} Â· {p.pct}%</span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: "#f1f5f9" }}>
                  <div className="h-2 rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl" style={{ backgroundColor: "#f0fdf4" }}>
              <p className="text-xs font-medium" style={{ color: "#64748b" }}>ARR estimÃ©</p>
              <p className="text-lg font-bold" style={{ color: "#059669" }}>294 960 â‚¬</p>
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: "#eff6ff" }}>
              <p className="text-xs font-medium" style={{ color: "#64748b" }}>Ticket moyen</p>
              <p className="text-lg font-bold" style={{ color: "#2563eb" }}>19.93 â‚¬</p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature usage + Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold mb-4" style={{ color: "#0f172a" }}>FonctionnalitÃ©s les plus utilisÃ©es</h2>
          <div className="space-y-3">
            {topFeatures.map((f) => (
              <div key={f.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium" style={{ color: "#374151" }}>{f.name}</span>
                  <span className="text-xs font-semibold" style={{ color: "#64748b" }}>{f.uses.toLocaleString("fr")}</span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: "#f1f5f9" }}>
                  <div className="h-2 rounded-full" style={{ width: `${f.pct}%`, backgroundColor: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Derniers inscrits</h2>
            <a href="/admin/users" className="text-xs font-medium hover:underline flex items-center gap-1" style={{ color: "#2563eb" }}>Voir tout <ChevronRight className="w-3 h-3" /></a>
          </div>
          <div className="divide-y divide-gray-50">
            {recentUsers.map((u) => {
              const ss = statusStyles[u.status] || statusStyles.active;
              const pc = planColors[u.plan] || planColors.Free;
              return (
                <div key={u.email} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold" style={{ color: "#fff" }}>{u.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#0f172a" }}>{u.name} {u.country}</p>
                    <p className="text-xs truncate" style={{ color: "#94a3b8" }}>{u.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: pc.bg, color: pc.text }}>{u.plan}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: ss.bg, color: ss.text }}>{ss.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Activity feed + System health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>ActivitÃ© en temps rÃ©el</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentActivity.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${a.color}18` }}>
                    <Icon className="w-4 h-4" style={{ color: a.color }} />
                  </div>
                  <p className="flex-1 text-sm truncate" style={{ color: "#374151" }}>{a.text}</p>
                  <span className="text-xs shrink-0" style={{ color: "#94a3b8" }}>{a.time}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>SantÃ© du systÃ¨me</h2>
            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "#d1fae5", color: "#065f46" }}>5/6 OK</span>
          </div>
          <div className="divide-y divide-gray-50">
            {systemHealth.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" style={{ color: "#64748b" }} />
                    <span className="text-sm font-medium" style={{ color: "#374151" }}>{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "#64748b" }}>{s.val}</span>
                    {s.status === "ok"
                      ? <CheckCircle className="w-4 h-4" style={{ color: "#059669" }} />
                      : <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#94a3b8" }}>Actions rapides admin</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Email global", icon: Mail, color: "#2563eb" },
                { label: "Maintenance", icon: Pause, color: "#f59e0b" },
                { label: "Export CSV", icon: Download, color: "#059669" },
                { label: "Purger cache", icon: RefreshCw, color: "#7c3aed" },
                { label: "Logs erreurs", icon: AlertTriangle, color: "#dc2626" },
                { label: "AccÃ¨s client", icon: Lock, color: "#0891b2" },
              ].map((btn) => {
                const Ic = btn.icon;
                return (
                  <button key={btn.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all text-center" title={btn.label}>
                    <Ic className="w-4 h-4" style={{ color: btn.color }} />
                    <span className="text-[10px] font-medium leading-tight" style={{ color: "#374151" }}>{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
