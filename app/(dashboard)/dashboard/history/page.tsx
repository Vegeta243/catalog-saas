"use client";

import { useState } from "react";
import { History, Search, Filter, ArrowUpDown, Clock, Edit3, DollarSign, Tag, Trash2, Copy, Sparkles } from "lucide-react";

interface HistoryEntry {
  id: string;
  date: string;
  action: string;
  type: "price" | "edit" | "delete" | "duplicate" | "ai" | "import" | "automation";
  productTitle: string;
  details: string;
  user: string;
}

const MOCK_HISTORY: HistoryEntry[] = [
  { id: "1", date: "2026-03-03 14:30", action: "Modification prix", type: "price", productTitle: "T-Shirt Premium", details: "29.99€ → 34.49€ (+15%)", user: "admin" },
  { id: "2", date: "2026-03-03 14:25", action: "Titre IA généré", type: "ai", productTitle: "Sneakers Urban", details: "Titre optimisé SEO par IA", user: "admin" },
  { id: "3", date: "2026-03-03 13:10", action: "Produit dupliqué", type: "duplicate", productTitle: "Hoodie Classic", details: "Copie créée: Hoodie Classic (copie)", user: "admin" },
  { id: "4", date: "2026-03-03 12:45", action: "Tags modifiés", type: "edit", productTitle: "Casquette Sport", details: "Ajout tags: sport, cap, outdoor", user: "admin" },
  { id: "5", date: "2026-03-02 18:00", action: "Import URL", type: "import", productTitle: "Montre Digital", details: "Importé depuis amazon.fr", user: "admin" },
  { id: "6", date: "2026-03-02 16:30", action: "Automatisation exécutée", type: "automation", productTitle: "Pack Premium", details: "Règle: Stock bas → Prix +15%", user: "système" },
  { id: "7", date: "2026-03-02 15:00", action: "Produit archivé", type: "delete", productTitle: "Ancien Modèle", details: "Statut → draft", user: "admin" },
  { id: "8", date: "2026-03-01 10:20", action: "Modification en masse", type: "price", productTitle: "12 produits", details: "Prix -10% (promo lancement)", user: "admin" },
];

const TYPE_CONFIG = {
  price: { icon: DollarSign, color: "#2563eb", bg: "#eff6ff" },
  edit: { icon: Edit3, color: "#f59e0b", bg: "#fffbeb" },
  delete: { icon: Trash2, color: "#ef4444", bg: "#fef2f2" },
  duplicate: { icon: Copy, color: "#8b5cf6", bg: "#f5f3ff" },
  ai: { icon: Sparkles, color: "#ec4899", bg: "#fdf2f8" },
  import: { icon: Tag, color: "#059669", bg: "#f0fdf4" },
  automation: { icon: Clock, color: "#0ea5e9", bg: "#f0f9ff" },
};

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = MOCK_HISTORY
    .filter((e) => typeFilter === "all" || e.type === typeFilter)
    .filter((e) => !search || e.productTitle.toLowerCase().includes(search.toLowerCase()) || e.action.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Historique</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Journal de toutes les modifications de votre catalogue</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher dans l'historique…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white" style={{ color: "#374151" }}>
          <option value="all">Tous les types</option>
          <option value="price">Prix</option>
          <option value="edit">Édition</option>
          <option value="ai">IA</option>
          <option value="import">Import</option>
          <option value="duplicate">Duplication</option>
          <option value="automation">Automatisation</option>
          <option value="delete">Suppression</option>
        </select>
        <button onClick={() => setSortDesc(!sortDesc)}
          className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm" style={{ color: "#374151" }}>
          <ArrowUpDown className="w-4 h-4" /> {sortDesc ? "Plus récent" : "Plus ancien"}
        </button>
      </div>

      {/* Timeline / Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <History className="w-12 h-12 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#0f172a" }}>Aucun résultat</h3>
          <p className="text-sm" style={{ color: "#64748b" }}>Modifiez vos filtres pour voir l&apos;historique</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#64748b" }}>Date</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#64748b" }}>Action</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#64748b" }}>Produit</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#64748b" }}>Détails</th>
                <th className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "#64748b" }}>Par</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const config = TYPE_CONFIG[entry.type];
                const Icon = config.icon;
                return (
                  <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono" style={{ color: "#64748b" }}>{entry.date}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.bg }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                        </div>
                        <span className="text-sm font-medium" style={{ color: "#0f172a" }}>{entry.action}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm" style={{ color: "#374151" }}>{entry.productTitle}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm" style={{ color: "#64748b" }}>{entry.details}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: entry.user === "système" ? "#0ea5e9" : "#64748b", backgroundColor: entry.user === "système" ? "#f0f9ff" : "#f8fafc" }}>{entry.user}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-center mt-4" style={{ color: "#94a3b8" }}>Affichage des {filtered.length} entrées les plus récentes</p>
    </div>
  );
}
