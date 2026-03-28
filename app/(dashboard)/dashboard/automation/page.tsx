"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Play, Plus, Trash2, Clock, RefreshCw, Search, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/lib/toast";
import { hasFeature } from "@/lib/credits";
import { createClient } from "@/lib/supabase/client";

interface Automation {
  id: string;
  name: string;
  type: "seo" | "price" | "import" | "stock_alert";
  config: Record<string, unknown>;
  is_active: boolean;
  last_run_at?: string | null;
  run_count: number;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  seo: "Génération SEO",
  price: "Ajustement prix",
  import: "Import produits",
  stock_alert: "Alerte stock",
};

const TYPE_COLORS: Record<string, string> = {
  seo: "#6366f1",
  price: "#f59e0b",
  import: "#10b981",
  stock_alert: "#ef4444",
};

function ConfigFields({ type, config, onChange }: {
  type: string;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 6,
    color: "#e2e8f0",
    padding: "6px 10px",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
  };

  if (type === "seo") {
    return (
      <div>
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>
          Nb produits max à traiter
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={String(config.limit ?? 20)}
          onChange={(e) => onChange("limit", Number(e.target.value))}
          style={inputStyle}
        />
      </div>
    );
  }

  if (type === "price") {
    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>Direction</label>
          <select
            value={String(config.direction ?? "increase")}
            onChange={(e) => onChange("direction", e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            <option value="increase">Augmenter</option>
            <option value="decrease">Réduire</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>Pourcentage (%)</label>
          <input
            type="number" min={1} max={100}
            value={String(config.percent ?? 10)}
            onChange={(e) => onChange("percent", Number(e.target.value))}
            style={inputStyle}
          />
        </div>
      </div>
    );
  }

  if (type === "stock_alert") {
    return (
      <div>
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>
          Seuil d\'alerte (quantité)
        </label>
        <input
          type="number" min={0}
          value={String(config.threshold ?? 5)}
          onChange={(e) => onChange("threshold", Number(e.target.value))}
          style={inputStyle}
        />
      </div>
    );
  }

  if (type === "import") {
    return (
      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
        Synchronise les produits depuis votre boutique Shopify connectée.
      </p>
    );
  }

  return null;
}

export default function AutomationPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "seo" as Automation["type"],
    config: {} as Record<string, unknown>,
  });

  const { addToast } = useToast();
  const toastSuccess = (msg: string) => addToast(msg, "success");
  const toastError = (msg: string) => addToast(msg, "error");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/automations", { credentials: "include" });
      const data = await res.json();
      if (data.automations) setAutomations(data.automations);
    } catch {
      toastError("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { user_metadata?: { plan?: string } } | null } }) => {
      const user = data.user;
      if (user) {
        const plan = (user.user_metadata?.plan ?? "free") as string;
        setHasAccess(hasFeature(plan, "automations"));
        load();
      }
    });
  }, [load]);

  const handleToggle = async (id: string, currentValue: boolean) => {
    try {
      const res = await fetch("/api/automations", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: !currentValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !currentValue } : a)));
    } catch (err) {
      toastError((err as Error).message);
    }
  };

  const handleRun = async (id: string) => {
    if (running) return;
    setRunning(id);
    try {
      const res = await fetch("/api/automations/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? data.message);
      toastSuccess(data.message ?? "Automatisation exécutée !");
      await load();
    } catch (err) {
      toastError((err as Error).message);
    } finally {
      setRunning(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette automatisation ?")) return;
    try {
      const res = await fetch("/api/automations", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setAutomations((prev) => prev.filter((a) => a.id !== id));
      toastSuccess("Automatisation supprimée");
    } catch (err) {
      toastError((err as Error).message);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toastError("Le nom est requis"); return; }
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), type: form.type, config: form.config }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toastSuccess("Automatisation créée !");
      setShowCreate(false);
      setForm({ name: "", type: "seo", config: {} });
      await load();
    } catch (err) {
      toastError((err as Error).message);
    }
  };

  const updateFormConfig = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }));
  };

  const filtered = automations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "clamp(12px, 3vw, 20px)",
    marginBottom: 12,
  };

  const typeBadge = (type: string): React.CSSProperties => ({
    background: (TYPE_COLORS[type] ?? "#334155") + "22",
    color: TYPE_COLORS[type] ?? "#94a3b8",
    border: "1px solid " + (TYPE_COLORS[type] ?? "#334155") + "44",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600 as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    whiteSpace: "nowrap" as const,
  });

  if (!hasAccess && !loading) {
    return (
      <div style={{ padding: "clamp(16px, 4vw, 32px)", textAlign: "center", color: "#94a3b8" }}>
        <Zap size={40} color="#6366f1" style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0" }}>Automatisations indisponibles</p>
        <p>Passez à un plan supérieur pour accéder aux automatisations.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "clamp(16px, 4vw, 32px)", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={22} color="#6366f1" />
          <h1 style={{ fontSize: "clamp(18px, 3vw, 22px)", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            Automatisations
          </h1>
          <span style={{ background: "#6366f122", color: "#818cf8", border: "1px solid #6366f144", borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
            {automations.length}
          </span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={15} />
          Nouvelle
        </button>
      </div>

      {showCreate && (
        <div style={{ ...card, border: "1px solid #6366f144", marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", margin: "0 0 14px" }}>Nouvelle automatisation</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              placeholder="Nom de l automatisation"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, color: "#e2e8f0", padding: "8px 12px", fontSize: 14, width: "100%", boxSizing: "border-box" }}
            />
            <div>
              <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 6 }}>Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                {(["seo", "price", "import", "stock_alert"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((prev) => ({ ...prev, type: t, config: {} }))}
                    style={{
                      background: form.type === t ? (TYPE_COLORS[t] + "22") : "rgba(255,255,255,0.05)",
                      border: "1px solid " + (form.type === t ? TYPE_COLORS[t] : "rgba(255,255,255,0.12)"),
                      borderRadius: 8,
                      color: form.type === t ? TYPE_COLORS[t] : "#94a3b8",
                      padding: "8px 6px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <ConfigFields type={form.type} config={form.config} onChange={updateFormConfig} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowCreate(false); setForm({ name: "", type: "seo", config: {} }); }}
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 6, padding: "7px 16px", fontSize: 13, cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                style={{ background: "#6366f1", border: "none", color: "#fff", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {automations.length > 0 && (
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={14} color="#64748b" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text" placeholder="Rechercher..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#e2e8f0", padding: "8px 12px 8px 32px", fontSize: 13, boxSizing: "border-box" }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ ...card, textAlign: "center", color: "#64748b" }}>
          <RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ margin: "8px 0 0" }}>Chargement...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: "center", color: "#64748b" }}>
          <Zap size={32} color="#334155" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, margin: "0 0 4px", color: "#94a3b8" }}>
            {search ? "Aucun résultat" : "Aucune automatisation créée"}
          </p>
          {!search && <p style={{ fontSize: 12, margin: 0 }}>Créez votre première automatisation.</p>}
        </div>
      ) : (
        filtered.map((auto) => {
          const isExpanded = expandedId === auto.id;
          const isRunning = running === auto.id;
          return (
            <div key={auto.id} style={{ ...card, opacity: auto.is_active ? 1 : 0.65 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => handleToggle(auto.id, auto.is_active)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
                >
                  {auto.is_active ? <ToggleRight size={22} color="#6366f1" /> : <ToggleLeft size={22} color="#475569" />}
                </button>
                <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: "clamp(13px, 2vw, 15px)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {auto.name}
                </span>
                <span style={typeBadge(auto.type)}>{TYPE_LABELS[auto.type] ?? auto.type}</span>
                <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: "auto" }}>
                  <button
                    onClick={() => handleRun(auto.id)}
                    disabled={!auto.is_active || !!running}
                    style={{ background: auto.is_active && !running ? "#10b98122" : "rgba(255,255,255,0.05)", border: "1px solid " + (auto.is_active && !running ? "#10b981" : "rgba(255,255,255,0.1)"), color: auto.is_active && !running ? "#10b981" : "#475569", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: auto.is_active && !running ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    {isRunning ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />}
                  </button>
                  <button onClick={() => setExpandedId(isExpanded ? null : auto.id)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button onClick={() => handleDelete(auto.id)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#ef4444", borderRadius: 6, padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                  <Play size={10} />{auto.run_count} exécution{auto.run_count !== 1 ? "s" : ""}
                </span>
                {auto.last_run_at && (
                  <span style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={10} />{new Date(auto.last_run_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span style={{ fontSize: 11, color: auto.is_active ? "#10b981" : "#64748b", marginLeft: "auto" }}>
                  {auto.is_active ? "● Actif" : "○ Inactif"}
                </span>
              </div>
              {isExpanded && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Configuration</p>
                  {Object.keys(auto.config ?? {}).length === 0 ? (
                    <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Configuration par défaut</p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {Object.entries(auto.config ?? {}).map(([k, v]) => (
                        <span key={k} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 8px", fontSize: 12, color: "#94a3b8" }}>
                          {k}: <strong style={{ color: "#e2e8f0" }}>{String(v)}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
      <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
