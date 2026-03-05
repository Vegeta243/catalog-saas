"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap, Play, Plus, Trash2, ToggleLeft, ToggleRight, Clock, RefreshCw,
  AlertTriangle, TrendingUp, TrendingDown, Tag, Archive, Bell, ChevronDown,
  ChevronUp, History, CheckCircle2, XCircle, Filter, BarChart3, Settings2,
} from "lucide-react";
import { useToast } from "@/lib/toast";

interface AutomationRule {
  id: string;
  name: string;
  condition_type: string;
  condition_value: string;
  action_type: string;
  action_value: string;
  enabled: boolean;
  last_run?: string;
  run_count: number;
}

interface ExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  status: "success" | "error";
  timestamp: string;
  details: string;
}

const CONDITION_LABELS: Record<string, string> = {
  stock_low: "Stock bas",
  stock_zero: "Rupture de stock",
  price_above: "Prix supérieur à",
  price_below: "Prix inférieur à",
  scheduled: "Planifié",
  tag_match: "Tag spécifique",
  no_images: "Sans images",
  no_description: "Sans description",
};

const ACTION_LABELS: Record<string, string> = {
  price_increase: "Augmenter le prix",
  price_decrease: "Réduire le prix",
  add_tag: "Ajouter un tag",
  remove_tag: "Retirer un tag",
  set_status: "Changer le statut",
  archive: "Archiver",
  notify: "Envoyer une notification",
  generate_seo: "Générer SEO (IA)",
};

const SCHEDULE_OPTIONS = [
  { value: "daily", label: "Tous les jours" },
  { value: "monday", label: "Chaque lundi" },
  { value: "friday", label: "Chaque vendredi" },
  { value: "weekly", label: "Chaque semaine" },
  { value: "monthly", label: "Chaque mois" },
];

export default function AutomationPage() {
  const { addToast } = useToast();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newConditionType, setNewConditionType] = useState("stock_low");
  const [newConditionValue, setNewConditionValue] = useState("5");
  const [newActionType, setNewActionType] = useState("price_increase");
  const [newActionValue, setNewActionValue] = useState("10");

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/automation");
      const data = await res.json();
      if (data.rules) setRules(data.rules);
    } catch {
      addToast("Erreur lors du chargement", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const toggleRule = async (rule: AutomationRule) => {
    try {
      const res = await fetch("/api/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
        addToast(rule.enabled ? "Règle désactivée" : "Règle activée", "success");
      }
    } catch {
      addToast("Erreur lors de la mise à jour", "error");
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const res = await fetch(`/api/automation?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.filter((r) => r.id !== id));
        addToast("Règle supprimée", "success");
      }
    } catch {
      addToast("Erreur lors de la suppression", "error");
    }
  };

  const executeRule = async (rule: AutomationRule) => {
    setExecuting(rule.id);
    try {
      const res = await fetch("/api/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rule.id, execute: true }),
      });
      const data = await res.json();
      if (data.success) {
        setRules((prev) => prev.map((r) => r.id === rule.id ? data.rule : r));
        setLogs((prev) => [{
          id: Date.now().toString(),
          ruleId: rule.id,
          ruleName: rule.name,
          status: "success",
          timestamp: new Date().toLocaleString("fr-FR"),
          details: `Action: ${ACTION_LABELS[rule.action_type]} (${rule.action_value}%)`,
        }, ...prev]);
        addToast(`Règle "${rule.name}" exécutée`, "success");
      }
    } catch {
      setLogs((prev) => [{
        id: Date.now().toString(),
        ruleId: rule.id,
        ruleName: rule.name,
        status: "error",
        timestamp: new Date().toLocaleString("fr-FR"),
        details: "Erreur lors de l'exécution",
      }, ...prev]);
      addToast("Erreur lors de l'exécution", "error");
    } finally {
      setExecuting(null);
    }
  };

  const createRule = async () => {
    if (!newName) return;
    try {
      const res = await fetch("/api/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          condition_type: newConditionType,
          condition_value: newConditionValue,
          action_type: newActionType,
          action_value: newActionValue,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRules((prev) => [...prev, data.rule]);
        setShowCreate(false);
        setNewName("");
        setNewConditionValue("5");
        setNewActionValue("10");
        addToast("Règle créée avec succès", "success");
      }
    } catch {
      addToast("Erreur lors de la création", "error");
    }
  };

  const executeAll = async () => {
    const activeRules = rules.filter((r) => r.enabled);
    if (activeRules.length === 0) {
      addToast("Aucune règle active", "error");
      return;
    }
    await Promise.all(activeRules.map((rule) => executeRule(rule)));
    addToast(`${activeRules.length} règles exécutées`, "success");
  };

  const filteredRules = rules.filter((r) => {
    if (filter === "active") return r.enabled;
    if (filter === "inactive") return !r.enabled;
    return true;
  });

  const activeCount = rules.filter((r) => r.enabled).length;
  const totalExecutions = rules.reduce((s, r) => s + r.run_count, 0);

  const getConditionIcon = (type: string) => {
    switch (type) {
      case "stock_low":
      case "stock_zero": return <AlertTriangle className="w-4 h-4" style={{ color: "#f59e0b" }} />;
      case "price_above": return <TrendingUp className="w-4 h-4" style={{ color: "#ef4444" }} />;
      case "price_below": return <TrendingDown className="w-4 h-4" style={{ color: "#3b82f6" }} />;
      case "scheduled": return <Clock className="w-4 h-4" style={{ color: "#8b5cf6" }} />;
      case "tag_match": return <Tag className="w-4 h-4" style={{ color: "#06b6d4" }} />;
      default: return <Settings2 className="w-4 h-4" style={{ color: "#64748b" }} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#2563eb" }} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: "#0f172a" }}>Automatisations</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Créez des règles intelligentes pour automatiser votre catalogue
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
            style={{ color: "#374151" }}>
            <History className="w-4 h-4" />
            Historique
          </button>
          <button onClick={executeAll}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-sm font-medium"
            style={{ color: "#065f46" }}>
            <Play className="w-4 h-4" />
            Tout exécuter
          </button>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" style={{ color: "#fff" }} />
            <span style={{ color: "#fff" }}>Nouvelle règle</span>
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{rules.length}</p>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Règles totales</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-2xl font-bold" style={{ color: "#059669" }}>{activeCount}</p>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Actives</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{rules.length - activeCount}</p>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Inactives</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-2xl font-bold" style={{ color: "#2563eb" }}>{totalExecutions}</p>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Exécutions totales</p>
        </div>
      </div>

      {/* Execution logs panel */}
      {showLogs && logs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#0f172a" }}>
              <History className="w-4 h-4" /> Historique d&apos;exécution
            </h2>
            <button onClick={() => setLogs([])} className="text-xs hover:underline" style={{ color: "#ef4444" }}>
              Effacer
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-100">
                {log.status === "success"
                  ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#059669" }} />
                  : <XCircle className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />}
                <span className="font-medium" style={{ color: "#0f172a" }}>{log.ruleName}</span>
                <span style={{ color: "#94a3b8" }}>—</span>
                <span style={{ color: "#64748b" }}>{log.details}</span>
                <span className="ml-auto" style={{ color: "#94a3b8" }}>{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 mb-6">
          <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
            <Zap className="w-4 h-4" style={{ color: "#2563eb" }} />
            Créer une règle d&apos;automatisation
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>
                Nom de la règle
              </label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Stock bas → Prix +15%"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>
                Condition (SI)
              </label>
              <select value={newConditionType} onChange={(e) => setNewConditionType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none"
                style={{ color: "#0f172a" }}>
                {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>
                Valeur de condition
              </label>
              {newConditionType === "scheduled" ? (
                <select value={newConditionValue} onChange={(e) => setNewConditionValue(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none"
                  style={{ color: "#0f172a" }}>
                  {SCHEDULE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={newConditionValue} onChange={(e) => setNewConditionValue(e.target.value)}
                  placeholder={newConditionType.includes("price") ? "29.99" : newConditionType.includes("tag") ? "promo" : "5"}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                  style={{ color: "#0f172a" }} />
              )}
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>
                Action (ALORS)
              </label>
              <select value={newActionType} onChange={(e) => setNewActionType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none"
                style={{ color: "#0f172a" }}>
                {Object.entries(ACTION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>
                Valeur d&apos;action
              </label>
              <input type="text" value={newActionValue} onChange={(e) => setNewActionValue(e.target.value)}
                placeholder={newActionType.includes("price") ? "15" : newActionType.includes("tag") ? "soldes" : "10"}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                style={{ color: "#0f172a" }} />
            </div>
          </div>

          {/* Visual preview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4 flex items-center gap-3">
            <span className="text-xs font-medium px-2 py-1 bg-blue-100 rounded" style={{ color: "#2563eb" }}>
              SI {CONDITION_LABELS[newConditionType]} {newConditionValue && `(${newConditionValue})`}
            </span>
            <span style={{ color: "#94a3b8" }}>→</span>
            <span className="text-xs font-medium px-2 py-1 bg-emerald-100 rounded" style={{ color: "#059669" }}>
              ALORS {ACTION_LABELS[newActionType]} {newActionValue && `(${newActionValue})`}
            </span>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              style={{ color: "#374151" }}>
              Annuler
            </button>
            <button onClick={createRule} disabled={!newName}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
              <span style={{ color: "#fff" }}>Créer la règle</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4" style={{ color: "#94a3b8" }} />
        {(["all", "active", "inactive"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-blue-600" : "bg-gray-100 hover:bg-gray-200"}`}
            style={{ color: filter === f ? "#fff" : "#374151" }}>
            {f === "all" ? `Toutes (${rules.length})` : f === "active" ? `Actives (${activeCount})` : `Inactives (${rules.length - activeCount})`}
          </button>
        ))}
      </div>

      {/* Rules list */}
      {filteredRules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#0f172a" }}>
            {filter === "all" ? "Aucune automatisation" : filter === "active" ? "Aucune règle active" : "Aucune règle inactive"}
          </h3>
          <p className="text-sm" style={{ color: "#64748b" }}>
            {filter === "all" ? "Créez votre première règle pour automatiser votre catalogue" : "Changez le filtre pour voir d'autres règles"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRules.map((rule) => (
            <div key={rule.id}
              className={`bg-white rounded-xl border transition-all ${rule.enabled ? "border-emerald-200" : "border-gray-200"} ${expandedRule === rule.id ? "shadow-md" : ""}`}>
              {/* Main row */}
              <div className="flex items-center gap-4 p-5">
                <button onClick={() => toggleRule(rule)} title={rule.enabled ? "Désactiver" : "Activer"}>
                  {rule.enabled
                    ? <ToggleRight className="w-8 h-8" style={{ color: "#059669" }} />
                    : <ToggleLeft className="w-8 h-8" style={{ color: "#94a3b8" }} />}
                </button>

                <button onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                  className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    {getConditionIcon(rule.condition_type)}
                    <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{rule.name}</p>
                    {rule.enabled && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-emerald-100 rounded"
                        style={{ color: "#059669" }}>ACTIVE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 rounded flex items-center gap-1"
                      style={{ color: "#2563eb" }}>
                      SI: {CONDITION_LABELS[rule.condition_type] || rule.condition_type}
                      {rule.condition_value && ` (${rule.condition_value})`}
                    </span>
                    <span style={{ color: "#d1d5db" }}>→</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-50 rounded flex items-center gap-1"
                      style={{ color: "#059669" }}>
                      ALORS: {ACTION_LABELS[rule.action_type] || rule.action_type}
                      {rule.action_value && ` (${rule.action_value})`}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  {rule.run_count > 0 && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-100 rounded"
                      style={{ color: "#64748b" }}>
                      <BarChart3 className="w-3 h-3" /> {rule.run_count}
                    </span>
                  )}
                  <button onClick={() => executeRule(rule)} disabled={executing === rule.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors">
                    {executing === rule.id
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: "#059669" }} />
                      : <Play className="w-3.5 h-3.5" style={{ color: "#059669" }} />}
                    <span style={{ color: "#065f46" }}>Exécuter</span>
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                  </button>
                  <button onClick={() => setExpandedRule(expandedRule === rule.id ? null : rule.id)}
                    className="p-1 hover:bg-gray-100 rounded">
                    {expandedRule === rule.id
                      ? <ChevronUp className="w-4 h-4" style={{ color: "#64748b" }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: "#64748b" }} />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedRule === rule.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="font-medium mb-1" style={{ color: "#64748b" }}>Condition</p>
                      <p style={{ color: "#0f172a" }}>
                        {CONDITION_LABELS[rule.condition_type] || rule.condition_type}
                      </p>
                      <p className="mt-0.5" style={{ color: "#94a3b8" }}>
                        Valeur: {rule.condition_value || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1" style={{ color: "#64748b" }}>Action</p>
                      <p style={{ color: "#0f172a" }}>
                        {ACTION_LABELS[rule.action_type] || rule.action_type}
                      </p>
                      <p className="mt-0.5" style={{ color: "#94a3b8" }}>
                        Valeur: {rule.action_value || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium mb-1" style={{ color: "#64748b" }}>Statistiques</p>
                      <p style={{ color: "#0f172a" }}>Exécutions: {rule.run_count}</p>
                      {rule.last_run && (
                        <p className="flex items-center gap-1 mt-0.5" style={{ color: "#94a3b8" }}>
                          <Clock className="w-3 h-3" />
                          {new Date(rule.last_run).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
