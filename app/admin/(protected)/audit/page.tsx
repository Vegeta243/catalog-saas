"use client";

import { useEffect, useState } from "react";
import { ScrollText, RefreshCw, AlertCircle, Filter } from "lucide-react";

interface AuditEntry {
  id: number;
  admin_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  "admin.login.success": "#16a34a",
  "admin.login.failed": "#dc2626",
  "admin.logout": "#64748b",
};

function badge(action: string) {
  const color = ACTION_COLORS[action] || "#2563eb";
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: color + "18", color }}
    >
      {action}
    </span>
  );
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (filterAction) params.set("action", filterAction);
      const res = await fetch(`/api/admin/audit-log?${params}`);
      if (!res.ok) throw new Error("Erreur chargement journal");
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterAction]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#0f172a" }}>
            <ScrollText className="w-6 h-6" style={{ color: "#3b82f6" }} />
            Journal d&apos;audit
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Traçabilité complète des actions admin — {total} entrée{total !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4" style={{ color: "#94a3b8" }} />
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          style={{ color: "#0f172a" }}
        >
          <option value="">Toutes les actions</option>
          <option value="admin.login.success">Connexion réussie</option>
          <option value="admin.login.failed">Connexion échouée</option>
          <option value="admin.logout">Déconnexion</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm" style={{ color: "#dc2626" }}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {["Date", "Action", "Admin", "IP", "Cible", "Détail"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center" style={{ color: "#94a3b8" }}>
                    Aucune entrée dans le journal
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#64748b" }}>
                      {new Date(e.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" })}
                    </td>
                    <td className="px-4 py-3">{badge(e.action)}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#0f172a" }}>{e.admin_email}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "#64748b" }}>{e.ip || "—"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                      {e.target_type ? `${e.target_type}${e.target_id ? ` #${e.target_id}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                      {Object.keys(e.detail).length > 0
                        ? JSON.stringify(e.detail).slice(0, 80)
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
