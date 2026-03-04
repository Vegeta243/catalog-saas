"use client";

import { useState } from "react";
import { Zap, Play, Plus, Trash2, ToggleLeft, ToggleRight, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/lib/toast";

interface Rule {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  lastRun?: string;
}

export default function AutomationPage() {
  const { addToast } = useToast();
  const [rules, setRules] = useState<Rule[]>([
    { id: "1", name: "Stock bas → Prix +15%", condition: "stock < 5", action: "augmenter prix de 15%", enabled: true, lastRun: "2026-03-03 14:30" },
    { id: "2", name: "Promo vendredi", condition: "Tous les vendredis", action: "réduire prix de 10% (tag: promo)", enabled: false },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCondition, setNewCondition] = useState("stock_low");
  const [newAction, setNewAction] = useState("price_increase");
  const [newValue, setNewValue] = useState("10");
  const [executing, setExecuting] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
    addToast("Règle mise à jour", "success");
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    addToast("Règle supprimée", "success");
  };

  const executeRule = async (rule: Rule) => {
    setExecuting(rule.id);
    // Simulate execution
    await new Promise((r) => setTimeout(r, 1500));
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, lastRun: new Date().toLocaleString("fr-FR") } : r));
    addToast(`Règle "${rule.name}" exécutée avec succès`, "success");
    setExecuting(null);
  };

  const createRule = () => {
    if (!newName) return;
    const conditionLabels: Record<string, string> = {
      stock_low: "stock < 5",
      every_friday: "Tous les vendredis",
      price_below: "prix < seuil",
    };
    const actionLabels: Record<string, string> = {
      price_increase: `augmenter prix de ${newValue}%`,
      price_decrease: `réduire prix de ${newValue}%`,
      archive: "archiver les produits",
    };

    setRules((prev) => [...prev, {
      id: Date.now().toString(),
      name: newName,
      condition: conditionLabels[newCondition] || newCondition,
      action: actionLabels[newAction] || newAction,
      enabled: true,
    }]);
    setShowCreate(false);
    setNewName("");
    setNewValue("10");
    addToast("Règle créée avec succès", "success");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Automatisations</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Créez des règles automatiques pour votre catalogue</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" style={{ color: "#fff" }} />
          <span style={{ color: "#fff" }}>Nouvelle règle</span>
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: "#0f172a" }}>Créer une règle</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nom de la règle</label>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Stock bas → Prix +15%"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Valeur (%)</label>
              <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Condition</label>
              <select value={newCondition} onChange={(e) => setNewCondition(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white" style={{ color: "#0f172a" }}>
                <option value="stock_low">Si stock &lt; 5 unités</option>
                <option value="every_friday">Tous les vendredis</option>
                <option value="price_below">Si prix inférieur au seuil</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Action</label>
              <select value={newAction} onChange={(e) => setNewAction(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white" style={{ color: "#0f172a" }}>
                <option value="price_increase">Augmenter le prix</option>
                <option value="price_decrease">Réduire le prix</option>
                <option value="archive">Archiver les produits</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium" style={{ color: "#374151" }}>Annuler</button>
            <button onClick={createRule} disabled={!newName} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
              <span style={{ color: "#fff" }}>Créer la règle</span>
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#0f172a" }}>Aucune automatisation</h3>
          <p className="text-sm" style={{ color: "#64748b" }}>Créez votre première règle pour automatiser votre catalogue</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className={`bg-white rounded-xl border ${rule.enabled ? "border-emerald-200" : "border-gray-200"} p-5`}>
              <div className="flex items-center gap-4">
                <button onClick={() => toggleRule(rule.id)} title={rule.enabled ? "Désactiver" : "Activer"}>
                  {rule.enabled
                    ? <ToggleRight className="w-8 h-8" style={{ color: "#059669" }} />
                    : <ToggleLeft className="w-8 h-8" style={{ color: "#94a3b8" }} />}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{rule.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-blue-50 rounded" style={{ color: "#2563eb" }}>Si: {rule.condition}</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-50 rounded" style={{ color: "#059669" }}>Alors: {rule.action}</span>
                  </div>
                  {rule.lastRun && (
                    <p className="flex items-center gap-1 text-xs mt-1" style={{ color: "#94a3b8" }}>
                      <Clock className="w-3 h-3" /> Dernière exécution: {rule.lastRun}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => executeRule(rule)} disabled={executing === rule.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-medium">
                    {executing === rule.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: "#059669" }} /> : <Play className="w-3.5 h-3.5" style={{ color: "#059669" }} />}
                    <span style={{ color: "#065f46" }}>Exécuter</span>
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
