"use client";

import { useState } from "react";
import { Search, Filter, MoreHorizontal, Mail, Ban, CheckCircle, Crown, Download } from "lucide-react";

const mockUsers = [
  { id: "1", name: "Marie Dupont", email: "marie@example.com", plan: "Pro", status: "active", tasks: 250, products: 342, joined: "2025-12-15" },
  { id: "2", name: "Jean Martin", email: "jean@example.com", plan: "Starter", status: "active", tasks: 30, products: 89, joined: "2026-01-20" },
  { id: "3", name: "Sophie Bernard", email: "sophie@example.com", plan: "Scale", status: "active", tasks: 800, products: 1250, joined: "2025-11-03" },
  { id: "4", name: "Lucas Petit", email: "lucas@example.com", plan: "Starter", status: "inactive", tasks: 0, products: 12, joined: "2026-02-14" },
  { id: "5", name: "Emma Leroy", email: "emma@example.com", plan: "Pro", status: "active", tasks: 180, products: 567, joined: "2025-10-28" },
  { id: "6", name: "Thomas Richard", email: "thomas@example.com", plan: "Starter", status: "suspended", tasks: 15, products: 45, joined: "2026-01-05" },
  { id: "7", name: "Camille Moreau", email: "camille@example.com", plan: "Pro", status: "active", tasks: 210, products: 234, joined: "2025-09-12" },
  { id: "8", name: "Alexandre Simon", email: "alex@example.com", plan: "Starter", status: "active", tasks: 10, products: 8, joined: "2026-03-01" },
];

const planColors: Record<string, { bg: string; text: string }> = {
  Free: { bg: "#f1f5f9", text: "#475569" },
  Starter: { bg: "#dbeafe", text: "#1d4ed8" },
  Pro: { bg: "#d1fae5", text: "#065f46" },
  Scale: { bg: "#ede9fe", text: "#5b21b6" },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: "#d1fae5", text: "#065f46" },
  inactive: { bg: "#f1f5f9", text: "#475569" },
  suspended: { bg: "#fef2f2", text: "#991b1b" },
};

const statusLabels: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  suspended: "Suspendu",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");

  const filtered = mockUsers.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Utilisateurs</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>{mockUsers.length} utilisateurs enregistrés</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" style={{ color: "#64748b" }} />
          <span style={{ color: "#374151" }}>Exporter CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
            style={{ color: "#0f172a" }} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: "#94a3b8" }} />
          {["all", "Free", "Starter", "Pro", "Scale"].map((p) => (
            <button key={p} onClick={() => setFilterPlan(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterPlan === p ? "text-white" : "hover:bg-gray-100"
              }`}
              style={filterPlan === p ? { backgroundColor: "#dc2626", color: "#fff" } : { color: "#64748b" }}>
              {p === "all" ? "Tous" : p}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100" style={{ backgroundColor: "#fafafa" }}>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Utilisateur</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Plan</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Statut</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Tâches</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Produits</th>
              <th className="text-left text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Inscription</th>
              <th className="text-right text-xs font-semibold px-5 py-3" style={{ color: "#64748b" }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: "#fff" }}>{u.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{u.name}</p>
                      <p className="text-xs" style={{ color: "#94a3b8" }}>{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                    style={{ backgroundColor: planColors[u.plan].bg, color: planColors[u.plan].text }}>
                    {u.plan === "Scale" && <Crown className="w-3 h-3" />}{u.plan}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: statusColors[u.status].bg, color: statusColors[u.status].text }}>
                    {statusLabels[u.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm font-medium" style={{ color: "#0f172a" }}>{u.tasks}</td>
                <td className="px-5 py-3 text-sm" style={{ color: "#64748b" }}>{u.products}</td>
                <td className="px-5 py-3 text-sm" style={{ color: "#64748b" }}>{u.joined}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg" title="Email"><Mail className="w-4 h-4" style={{ color: "#64748b" }} /></button>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg" title={u.status === "suspended" ? "Réactiver" : "Suspendre"}>
                      {u.status === "suspended" ? <CheckCircle className="w-4 h-4" style={{ color: "#059669" }} /> : <Ban className="w-4 h-4" style={{ color: "#dc2626" }} />}
                    </button>
                    <button className="p-1.5 hover:bg-gray-100 rounded-lg"><MoreHorizontal className="w-4 h-4" style={{ color: "#64748b" }} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: "#94a3b8" }}>Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}
