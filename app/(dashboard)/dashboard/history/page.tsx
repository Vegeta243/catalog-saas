"use client";

import { useState, useEffect } from "react";
import { History, Search, ArrowUpDown, Clock, Edit3, DollarSign, Tag, Trash2, Copy, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HistoryEntry {
  id: string;
  date: string;
  action: string;
  type: "price" | "edit" | "delete" | "duplicate" | "ai" | "import" | "automation";
  productTitle: string;
  details: string;
  user: string;
}

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
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => { document.title = "Historique | EcomPilot"; }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHistoryLoading(false); return; }
        const { data } = await supabase
          .from("action_history")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);
        if (data && data.length > 0) {
          const mapType = (t: string): HistoryEntry["type"] => {
            if (t === "ai") return "ai";
            if (t === "bulk_edit" || t === "edit") return "edit";
            if (t === "price") return "price";
            if (t === "import") return "import";
            if (t === "delete") return "delete";
            if (t === "duplicate") return "duplicate";
            if (t === "automation") return "automation";
            return "edit";
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setEntries((data as any[]).map((row) => {
            const det = row.details as Record<string, unknown> | null;
            const fieldsArr = Array.isArray(det?.fields) ? (det!.fields as string[]).join(", ") : "";
            return {
              id: String(row.id),
              date: row.created_at ? String(row.created_at).replace("T", " ").slice(0, 16) : "",
              action: row.description || row.action_type || "",
              type: mapType(row.action_type || ""),
              productTitle: (det?.product_title as string) || "",
              details: fieldsArr ? `Champs: ${fieldsArr}` : (det?.note as string) || "",
              user: "vous",
            };
          }));
        }
      } catch {
        // table may not exist yet
      }
      setHistoryLoading(false);
    };
    fetchHistory();
  }, []);

  const filtered = entries
    .filter((e) => typeFilter === "all" || e.type === typeFilter)
    .filter((e) => !search || e.productTitle.toLowerCase().includes(search.toLowerCase()) || e.action.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));

  if (historyLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Historique</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>Journal de toutes les modifications de votre catalogue</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-4 md:mb-6">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm" style={{ color: "var(--text-primary)" }} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white" style={{ color: "var(--text-secondary)" }}>
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
          className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-sm" style={{ color: "var(--text-secondary)" }}>
          <ArrowUpDown className="w-4 h-4" /> {sortDesc ? "Récent" : "Ancien"}
        </button>
      </div>

      {/* Timeline / Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <History className="w-12 h-12 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
            {entries.length === 0 ? "Aucun historique" : "Aucun résultat"}
          </h3>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            {entries.length === 0
              ? "Vos actions apparaîtront ici au fur et à mesure de votre utilisation."
              : "Modifiez vos filtres pour voir l&apos;historique"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[320px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-2 md:px-5 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>Date</th>
                <th className="text-left px-2 md:px-5 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>Action</th>
                <th className="text-left px-2 md:px-5 py-3 text-xs font-medium uppercase tracking-wider hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>Produit</th>
                <th className="text-left px-2 md:px-5 py-3 text-xs font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--text-tertiary)" }}>Détails</th>
                <th className="text-left px-2 md:px-5 py-3 text-xs font-medium uppercase tracking-wider hidden md:table-cell" style={{ color: "var(--text-tertiary)" }}>Par</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const config = TYPE_CONFIG[entry.type];
                const Icon = config.icon;
                return (
                  <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-2 md:px-5 py-3 align-top">
                      <span className="hidden sm:inline text-xs font-mono whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>{entry.date}</span>
                      <span className="sm:hidden text-[10px] font-mono whitespace-nowrap" style={{ color: "var(--text-tertiary)" }}>{entry.date.slice(5, 16)}</span>
                    </td>
                    <td className="px-2 md:px-5 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                        </div>
                        <div>
                          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{entry.action}</span>
                          <p className="text-xs sm:hidden truncate max-w-[120px]" style={{ color: "var(--text-tertiary)" }}>{entry.productTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 md:px-5 py-3 hidden sm:table-cell align-top">
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{entry.productTitle}</span>
                    </td>
                    <td className="px-2 md:px-5 py-3 hidden md:table-cell align-top">
                      <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>{entry.details}</span>
                    </td>
                    <td className="px-2 md:px-5 py-3 hidden md:table-cell align-top">
                      <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: entry.user === "système" ? "#0ea5e9" : "#64748b", backgroundColor: entry.user === "système" ? "#f0f9ff" : "#f8fafc" }}>{entry.user}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <p className="text-xs text-center mt-4" style={{ color: "var(--text-tertiary)" }}>Affichage des {filtered.length} entrées les plus récentes</p>
    </div>
  );
}
