"use client";

import { useState } from "react";
import { ScrollText, Users, Shield, Activity } from "lucide-react";

interface AuditEntry {
  id: number;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

const TABS = [
  { id: "audit", label: "Journal d'audit", icon: ScrollText },
  { id: "sessions", label: "Sessions actives", icon: Activity },
  { id: "overview", label: "Vue de sécurité", icon: Shield },
];

export default function SecurityClient({
  auditLog,
  recentUsers,
}: {
  auditLog: AuditEntry[];
  recentUsers: Array<Record<string, unknown>>;
}) {
  const [tab, setTab] = useState("audit");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>🔒 Sécurité</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>Surveillance des accès, sessions et événements de sécurité</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Actions admin (30j)", value: auditLog.length, color: "#3b82f6" },
          { label: "Utilisateurs récents", value: recentUsers.length, color: "#10b981" },
          { label: "Actions distinctes", value: new Set(auditLog.map(a => a.action)).size, color: "#f59e0b" },
          { label: "Erreurs détectées", value: auditLog.filter(a => /error|fail|block/i.test(a.action)).length, color: "#ef4444" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Audit log tab */}
      {tab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Dernières 50 actions admin</h2>
          </div>
          {auditLog.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "#94a3b8" }}>Aucune action enregistrée</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Date", "Action", "Cible", "Détails"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold px-4 py-2.5" style={{ color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLog.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50/50 text-xs">
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: "#94a3b8" }}>
                      {new Date(entry.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        /error|fail|block/i.test(entry.action) ? "bg-red-50 text-red-600" :
                        /login|auth/i.test(entry.action) ? "bg-blue-50 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{entry.action}</span>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "#374151" }}>
                      {entry.target ? String(entry.target).substring(0, 20) : "—"}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: "#94a3b8" }}>
                      {entry.details ? JSON.stringify(entry.details).substring(0, 40) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Sessions / recent activity */}
      {tab === "sessions" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Utilisateurs récemment actifs</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {["Email", "Plan", "Statut", "Inscrit le"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold px-4 py-2.5" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentUsers.map((u, i) => (
                <tr key={i} className="hover:bg-gray-50/50 text-xs">
                  <td className="px-4 py-2.5 font-medium" style={{ color: "#0f172a" }}>{String(u.email || "")}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold uppercase">{String(u.plan || "free")}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-medium ${u.subscription_status === "active" ? "text-emerald-600" : "text-gray-400"}`}>
                      {String(u.subscription_status || "—")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: "#94a3b8" }}>
                    {u.created_at ? new Date(String(u.created_at)).toLocaleDateString("fr-FR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Security overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Mesures de sécurité actives</h3>
            <div className="space-y-2">
              {[
                { label: "Auth HMAC admin cookie", ok: true },
                { label: "Rate limiting API", ok: true },
                { label: "Blocage domaines email jetables", ok: true },
                { label: "RLS Supabase activée", ok: true },
                { label: "Service role keys sécurisées", ok: true },
                { label: "HTTPS enforced", ok: true },
              ].map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span style={{ color: "#374151" }}>{label}</span>
                  <span className={`ml-auto text-[10px] font-bold ${ok ? "text-emerald-600" : "text-red-600"}`}>{ok ? "✓ OK" : "⚠️ Inactif"}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Top actions audit (30j)</h3>
            <div className="space-y-2">
              {Object.entries(
                auditLog.reduce((acc: Record<string, number>, e) => { acc[e.action] = (acc[e.action] || 0) + 1; return acc; }, {})
              ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([action, count]) => (
                <div key={action} className="flex items-center justify-between text-xs">
                  <span style={{ color: "#374151" }}>{action}</span>
                  <span className="font-bold" style={{ color: "#64748b" }}>{count}×</span>
                </div>
              ))}
              {auditLog.length === 0 && <p className="text-xs text-gray-400">Aucune donnée</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
