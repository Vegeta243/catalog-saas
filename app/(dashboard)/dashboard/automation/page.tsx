"use client";
import { useState, useEffect, useRef } from "react";

type Auto = {
  id: string; name: string; type: string; config: Record<string, unknown>;
  is_active: boolean; last_run_at?: string; run_count?: number; created_at: string;
};
type RunResult = { success: boolean; message: string; details?: Record<string, unknown>; };

const CATALOG = [
  {
    id: "seo", icon: "🔍",
    label: "Optimisation SEO des titres",
    description: "Reformate automatiquement les titres de vos produits pour ameliorer leur referencement Google et Shopify.",
    example: "\"rouge a levre mat\" → \"Rouge A Levre Mat\"",
    color: "#4f8ef7",
    fields: [
      { key: "fields", label: "Champs a optimiser", type: "select", options: [{ v: "both", l: "Titre + Description" }, { v: "title", l: "Titre uniquement" }], default: "both" },
      { key: "max_per_run", label: "Produits max par execution", type: "number", default: 5, min: 1, max: 50 },
    ],
  },
  {
    id: "price", icon: "💰",
    label: "Ajustement automatique des prix",
    description: "Augmente ou diminue les prix de vos produits d'un pourcentage defini.",
    example: "Tous les produits +15% pendant les soldes",
    color: "#10b981",
    fields: [
      { key: "action", label: "Action", type: "select", options: [{ v: "increase", l: "Augmenter les prix" }, { v: "decrease", l: "Diminuer les prix" }], default: "increase" },
      { key: "percent", label: "Pourcentage (%)", type: "number", default: 10, min: 1, max: 90 },
      { key: "max_products", label: "Produits max", type: "number", default: 50, min: 1, max: 500 },
    ],
  },
  {
    id: "title_template", icon: "✏️",
    label: "Modele de titre personnalise",
    description: "Applique un gabarit de titre uniforme a tous vos produits avec des variables dynamiques.",
    example: "Modele: \"{title} | {vendor}\" → \"Robe Fleurie | MarqueParis\"",
    color: "#8b5cf6",
    hint: "Variables: {title}, {vendor}, {type}",
    fields: [
      { key: "template", label: "Modele de titre", type: "text", placeholder: "{title} | {vendor}", default: "{title} | {vendor}" },
      { key: "max_per_run", label: "Produits max par execution", type: "number", default: 10, min: 1, max: 100 },
    ],
  },
  {
    id: "tag_add", icon: "🏷️",
    label: "Ajouter des tags en masse",
    description: "Ajoute des tags a tous vos produits pour ameliorer les filtres et collections.",
    example: "Ajouter \"promo, ete-2024, bestseller\" a 100 produits",
    color: "#f59e0b",
    fields: [
      { key: "tags", label: "Tags a ajouter (separes par virgule)", type: "text", placeholder: "promo, bestseller", default: "" },
    ],
  },
  {
    id: "tag_remove", icon: "🗑️",
    label: "Supprimer des tags en masse",
    description: "Retire des tags specifiques de tous vos produits en une seule operation.",
    example: "Retirer le tag \"soldes\" apres la fin des promotions",
    color: "#ef4444",
    fields: [
      { key: "tags", label: "Tags a supprimer (separes par virgule)", type: "text", placeholder: "ancien-tag, obsolete", default: "" },
    ],
  },
  {
    id: "status_change", icon: "🔄",
    label: "Changer le statut des produits",
    description: "Publie ou depublie des produits en masse selon leur statut actuel.",
    example: "Publier tous les produits en brouillon d'un coup",
    color: "#06b6d4",
    fields: [
      { key: "from_status", label: "Transition de statut", type: "select", options: [{ v: "draft", l: "Brouillon → Actif" }, { v: "active", l: "Actif → Archive" }, { v: "archived", l: "Archive → Actif" }], default: "draft" },
    ],
  },
  {
    id: "sync_shopify", icon: "🔗",
    label: "Synchronisation Shopify",
    description: "Synchronise automatiquement tous vos produits Shopify avec EcomPilot.",
    example: "Importer 50 produits depuis votre boutique connectee",
    color: "#4f8ef7",
    fields: [],
  },
  {
    id: "description_add", icon: "📝",
    label: "Completer les descriptions manquantes",
    description: "Ajoute un texte aux produits qui n'ont pas encore de description.",
    example: "Ajouter \"Livraison gratuite des 50€\" aux produits sans description",
    color: "#ec4899",
    fields: [
      { key: "prefix", label: "Texte au debut", type: "text", placeholder: "Produit de qualite premium.", default: "" },
      { key: "suffix", label: "Texte a la fin", type: "text", placeholder: "Livraison gratuite des 50€.", default: "" },
      { key: "max_per_run", label: "Produits max par execution", type: "number", default: 10, min: 1, max: 50 },
    ],
  },
] as const;

type CatalogItem = (typeof CATALOG)[number];
type ConfigField = CatalogItem["fields"][number];

const S = {
  page: { padding: "clamp(16px,4vw,32px)", maxWidth: "960px", margin: "0 auto", boxSizing: "border-box" } as React.CSSProperties,
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px" } as React.CSSProperties,
  inp: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e8ecf4", fontSize: "14px", padding: "10px 14px", boxSizing: "border-box" as const, outline: "none", fontFamily: "inherit" },
  lbl: { color: "#8b9fc4", fontSize: "12px", fontWeight: 500, display: "block", marginBottom: "6px" } as React.CSSProperties,
  pri: (bg?: string): React.CSSProperties => ({ padding: "10px 20px", background: bg ?? "#4f8ef7", color: "#fff", border: "none", borderRadius: "10px", fontSize: "14px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }),
  sec: { padding: "9px 16px", background: "rgba(255,255,255,0.06)", color: "#8b9fc4", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", fontSize: "13px", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" } as React.CSSProperties,
};

export default function AutomationPage() {
  const [automations, setAutomations] = useState<Auto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "catalog">("list");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", type: "", config: {} as Record<string, unknown> });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<Record<string, RunResult>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const addToastRef = useRef<((m: string, t: string) => void) | null>(null);

  useEffect(() => {
    document.title = "Automatisations — EcomPilot Elite";
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/automations", { credentials: "include", cache: "no-store" });
      const text = await res.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch { setError("Reponse serveur invalide"); return; }
      if (res.status === 401) { setError("Session expiree — rechargez la page"); return; }
      if (!res.ok) { setError((data.error as string) || "Erreur serveur"); return; }
      setAutomations((data.automations as Auto[]) ?? []);
    } catch (e: unknown) {
      setError("Erreur reseau: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function getCat(type: string): CatalogItem | undefined {
    return CATALOG.find(c => c.id === type);
  }

  function openCatalog(typeId?: string) {
    setView("catalog"); setSaveError("");
    if (typeId) { pickType(typeId); } else { setSelectedType(null); setForm({ name: "", type: "", config: {} }); }
  }

  function pickType(typeId: string) {
    const cat = getCat(typeId);
    if (!cat) return;
    setSelectedType(typeId);
    const defaults: Record<string, unknown> = {};
    (cat.fields as readonly ConfigField[]).forEach((f) => { defaults[f.key] = "default" in f ? f.default : ""; });
    setForm({ name: cat.label, type: typeId, config: defaults });
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.type) { setSaveError("Nom et type requis"); return; }
    setSaving(true); setSaveError("");
    try {
      const res = await fetch("/api/automations", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), type: form.type, config: form.config }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveError(data.error || "Erreur " + res.status); return; }
      setAutomations(prev => [data.automation, ...prev]);
      setView("list"); setSelectedType(null);
    } catch (e: unknown) {
      setSaveError("Erreur: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: !current } : a));
    const res = await fetch("/api/automations", {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (!res.ok) setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: current } : a));
  }

  async function deleteAuto(id: string) {
    if (!confirm("Supprimer cette automatisation ?")) return;
    setAutomations(prev => prev.filter(a => a.id !== id));
    await fetch("/api/automations", {
      method: "DELETE", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function runAuto(id: string) {
    setRunningId(id);
    setRunResults(p => ({ ...p, [id]: { success: true, message: "Execution en cours..." } }));
    try {
      const res = await fetch("/api/automations/run", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setRunResults(p => ({
        ...p,
        [id]: {
          success: res.ok && data.success !== false,
          message: data.message || data.error || (res.ok ? "Executee avec succes" : "Erreur"),
          details: data.details,
        },
      }));
      if (res.ok) await loadData();
    } catch (e: unknown) {
      setRunResults(p => ({ ...p, [id]: { success: false, message: "Erreur reseau: " + (e as Error).message } }));
    } finally {
      setRunningId(null);
    }
  }

  void addToastRef;

  // ── CATALOG VIEW ──
  if (view === "catalog") {
    const selected = selectedType ? getCat(selectedType) : null;
    return (
      <div style={S.page}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px", flexWrap: "wrap" }}>
          <button onClick={() => setView("list")} style={S.sec}>← Retour</button>
          <h1 style={{ color: "#e8ecf4", fontSize: "clamp(17px,3.5vw,21px)", fontWeight: 700, margin: 0 }}>
            {selected ? "Configurer" : "Choisir un type"}
          </h1>
        </div>

        {!selected ? (
          <div>
            <p style={{ color: "#8b9fc4", fontSize: "14px", margin: "0 0 24px 0" }}>
              Selectionnez le type d&apos;automatisation que vous souhaitez creer.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: "12px" }}>
              {CATALOG.map(cat => (
                <div key={cat.id} onClick={() => pickType(cat.id)}
                  style={{ ...S.card, cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = cat.color + "55")}
                  onMouseOut={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: cat.color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                      {cat.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#e8ecf4", fontSize: "14px", fontWeight: 600, margin: "0 0 5px 0", lineHeight: 1.3 }}>{cat.label}</p>
                      <p style={{ color: "#6b7a99", fontSize: "12px", margin: "0 0 7px 0", lineHeight: 1.5 }}>{cat.description}</p>
                      <p style={{ color: cat.color + "cc", fontSize: "11px", margin: 0, fontStyle: "italic" }}>Ex: {cat.example}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px 20px", background: selected.color + "15", border: "1px solid " + selected.color + "44", borderRadius: "14px", marginBottom: "24px" }}>
              <div style={{ fontSize: "28px" }}>{selected.icon}</div>
              <div>
                <p style={{ color: "#e8ecf4", fontSize: "15px", fontWeight: 700, margin: "0 0 3px 0" }}>{selected.label}</p>
                <p style={{ color: "#8b9fc4", fontSize: "13px", margin: 0 }}>{selected.description}</p>
                {"hint" in selected && <p style={{ color: selected.color + "cc", fontSize: "12px", margin: "4px 0 0", fontStyle: "italic" }}>{selected.hint}</p>}
              </div>
            </div>

            <div style={{ ...S.card, marginBottom: "16px" }}>
              <p style={{ color: "#e8ecf4", fontSize: "15px", fontWeight: 600, margin: "0 0 20px 0" }}>Configuration</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={S.lbl}>Nom de l&apos;automatisation *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={"Ex: " + selected.label} style={S.inp} autoFocus />
                </div>
                {(selected.fields as readonly ConfigField[]).map(field => (
                  <div key={field.key}>
                    <label style={S.lbl}>{field.label}</label>
                    {"options" in field ? (
                      <select value={String(form.config[field.key] ?? field.default)}
                        onChange={e => setForm(f => ({ ...f, config: { ...f.config, [field.key]: e.target.value } }))}
                        style={{ ...S.inp, cursor: "pointer" }}>
                        {field.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    ) : field.type === "number" ? (
                      <input type="number" min={"min" in field ? field.min : undefined} max={"max" in field ? field.max : undefined}
                        value={String(form.config[field.key] ?? field.default)}
                        onChange={e => setForm(f => ({ ...f, config: { ...f.config, [field.key]: parseInt(e.target.value) || ("default" in field ? field.default : 0) } }))}
                        style={{ ...S.inp, maxWidth: "180px" }} />
                    ) : (
                      <input type="text" placeholder={"placeholder" in field ? field.placeholder : ""}
                        value={String(form.config[field.key] ?? ("default" in field ? field.default : ""))}
                        onChange={e => setForm(f => ({ ...f, config: { ...f.config, [field.key]: e.target.value } }))}
                        style={S.inp} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "16px", padding: "12px 16px", background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: "10px" }}>
                <p style={{ color: "#93c5fd", fontSize: "12px", margin: "0 0 3px 0", fontWeight: 600 }}>Exemple de resultat</p>
                <p style={{ color: "#6b7a99", fontSize: "12px", margin: 0, fontStyle: "italic" }}>{selected.example}</p>
              </div>
            </div>

            {saveError && <p style={{ color: "#f87171", fontSize: "13px", margin: "0 0 12px 0" }}>{saveError}</p>}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => setSelectedType(null)} style={S.sec}>← Changer de type</button>
              <button onClick={handleCreate} disabled={saving || !form.name.trim()} style={{ ...S.pri(), opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
                {saving ? "Creation..." : "Creer l'automatisation"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── LIST VIEW ──
  return (
    <div style={S.page}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "#e8ecf4", fontSize: "clamp(18px,4vw,22px)", fontWeight: 700, margin: "0 0 4px 0" }}>Automatisations</h1>
          <p style={{ color: "#6b7a99", fontSize: "14px", margin: 0 }}>
            {automations.length > 0
              ? automations.length + " automatisation" + (automations.length > 1 ? "s configurees" : " configuree")
              : "Automatisez vos taches repetitives sur vos produits"}
          </p>
        </div>
        <button onClick={() => openCatalog()} style={S.pri()}>+ Nouvelle automatisation</button>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
          <p style={{ color: "#f87171", fontSize: "14px", margin: 0 }}>{error}</p>
          <button onClick={loadData} style={{ ...S.sec, color: "#f87171", borderColor: "rgba(239,68,68,0.3)", flexShrink: 0 }}>Reessayer</button>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: "60px", color: "#6b7a99", fontSize: "14px" }}>Chargement...</div>}

      {!loading && !error && automations.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚡</div>
          <p style={{ color: "#e8ecf4", fontSize: "18px", fontWeight: 700, margin: "0 0 10px 0" }}>Aucune automatisation</p>
          <p style={{ color: "#6b7a99", fontSize: "14px", margin: "0 0 28px 0", maxWidth: "400px", marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Les automatisations executent des actions sur vos produits en 1 clic.<br />
            {CATALOG.length} types disponibles.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", marginBottom: "24px" }}>
            {CATALOG.slice(0, 4).map(cat => (
              <button key={cat.id} onClick={() => openCatalog(cat.id)}
                style={{ padding: "8px 14px", background: cat.color + "18", border: "1px solid " + cat.color + "44", borderRadius: "10px", color: "#e8ecf4", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{cat.icon}</span>{cat.label.split(" ").slice(0, 3).join(" ")}
              </button>
            ))}
          </div>
          <button onClick={() => openCatalog()} style={S.pri()}>Voir toutes les automatisations →</button>
        </div>
      )}

      {!loading && automations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {automations.map(a => {
            const cat = getCat(a.type);
            const result = runResults[a.id];
            const isExpanded = expandedId === a.id;
            return (
              <div key={a.id} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <button onClick={() => toggleActive(a.id, a.is_active)} title={a.is_active ? "Mettre en pause" : "Activer"}
                    style={{ width: "40px", height: "22px", borderRadius: "11px", background: a.is_active ? (cat?.color ?? "#4f8ef7") : "rgba(255,255,255,0.12)", border: "none", position: "relative", cursor: "pointer", transition: "background 0.2s", padding: 0, flexShrink: 0 }}>
                    <div style={{ width: "16px", height: "16px", background: "#fff", borderRadius: "50%", position: "absolute", top: "3px", transition: "transform 0.2s", transform: a.is_active ? "translateX(21px)" : "translateX(3px)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
                  </button>
                  <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: (cat?.color ?? "#4f8ef7") + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                    {cat?.icon ?? "⚙️"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
                      <p style={{ color: "#e8ecf4", fontSize: "14px", fontWeight: 600, margin: 0, wordBreak: "break-word" }}>{a.name}</p>
                      <span style={{ fontSize: "11px", padding: "2px 7px", borderRadius: "5px", fontWeight: 500, background: a.is_active ? (cat?.color ?? "#4f8ef7") + "22" : "rgba(255,255,255,0.06)", color: a.is_active ? (cat?.color ?? "#4f8ef7") : "#6b7a99" }}>
                        {a.is_active ? "Actif" : "En pause"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ color: "#6b7a99", fontSize: "12px" }}>{cat?.label ?? a.type}</span>
                      {a.last_run_at && <span style={{ color: "#4a5878", fontSize: "11px" }}>Derniere: {new Date(a.last_run_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
                      {(a.run_count ?? 0) > 0 && <span style={{ color: "#4a5878", fontSize: "11px" }}>{a.run_count} exec.</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                    <button onClick={() => setExpandedId(isExpanded ? null : a.id)} style={{ ...S.sec, fontSize: "12px" }}>
                      {isExpanded ? "▲ Masquer" : "▼ Details"}
                    </button>
                    <button onClick={() => runAuto(a.id)} disabled={runningId === a.id || !a.is_active}
                      style={{ ...S.pri(cat?.color), opacity: (!a.is_active || runningId === a.id) ? 0.5 : 1, fontSize: "13px", padding: "9px 18px" }}>
                      {runningId === a.id ? "Execution..." : "▶ Executer"}
                    </button>
                    <button onClick={() => deleteAuto(a.id)} style={{ ...S.sec, color: "#f87171", borderColor: "rgba(239,68,68,0.25)", fontSize: "12px" }}>✕</button>
                  </div>
                </div>

                {result && (
                  <div style={{ margin: "0 20px 12px", padding: "10px 14px", background: result.success ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: "1px solid " + (result.success ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"), borderRadius: "9px" }}>
                    <p style={{ color: result.success ? "#4ade80" : "#f87171", fontSize: "13px", fontWeight: 600, margin: result.details ? "0 0 2px 0" : 0 }}>
                      {result.success ? "✓ " : "✗ "}{result.message}
                    </p>
                    {result.details && Object.keys(result.details).length > 0 && (
                      <p style={{ color: "#6b7a99", fontSize: "11px", margin: 0 }}>
                        {Object.entries(result.details).map(([k, v]) => k.replace(/_/g, " ") + ": " + v).join(" · ")}
                      </p>
                    )}
                  </div>
                )}

                {isExpanded && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(180px,100%),1fr))", gap: "12px", marginBottom: "12px" }}>
                      <div>
                        <p style={{ color: "#6b7a99", fontSize: "11px", fontWeight: 500, margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Type</p>
                        <p style={{ color: "#e8ecf4", fontSize: "13px", margin: 0 }}>{cat?.label ?? a.type}</p>
                      </div>
                      <div>
                        <p style={{ color: "#6b7a99", fontSize: "11px", fontWeight: 500, margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Creee le</p>
                        <p style={{ color: "#e8ecf4", fontSize: "13px", margin: 0 }}>{new Date(a.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      {Object.entries(a.config ?? {}).map(([k, v]) => (
                        <div key={k}>
                          <p style={{ color: "#6b7a99", fontSize: "11px", fontWeight: 500, margin: "0 0 3px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.replace(/_/g, " ")}</p>
                          <p style={{ color: "#e8ecf4", fontSize: "13px", margin: 0, wordBreak: "break-all" }}>{String(v)}</p>
                        </div>
                      ))}
                    </div>
                    {cat?.description && <p style={{ color: "#6b7a99", fontSize: "12px", margin: 0, fontStyle: "italic" }}>{cat.description}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
