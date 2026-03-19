"use client";

import { useState } from "react";
import { Save, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/lib/toast";

interface SystemConfig {
  id: number;
  key: string;
  value: Record<string, unknown>;
  description: string;
  updated_at: string;
  updated_by?: string;
}

const CONFIG_META: Record<string, { label: string; icon: string; fields: Array<{ key: string; label: string; type: string }> }> = {
  maintenance_mode: {
    label: "Mode Maintenance",
    icon: "🔧",
    fields: [
      { key: "enabled", label: "Activer la maintenance", type: "boolean" },
      { key: "message", label: "Message affiché aux utilisateurs", type: "text" },
    ],
  },
  announcement_banner: {
    label: "Bannière d'annonce",
    icon: "📢",
    fields: [
      { key: "enabled", label: "Afficher la bannière", type: "boolean" },
      { key: "text", label: "Texte de la bannière", type: "text" },
      { key: "color", label: "Couleur (blue/green/amber/red)", type: "text" },
      { key: "link", label: "Lien (optionnel)", type: "text" },
      { key: "link_text", label: "Texte du lien", type: "text" },
    ],
  },
  plan_limits: {
    label: "Limites des plans",
    icon: "📊",
    fields: [
      { key: "free", label: "Free — tâches/mois", type: "number" },
      { key: "starter", label: "Starter — tâches/mois", type: "number" },
      { key: "pro", label: "Pro — tâches/mois", type: "number" },
      { key: "scale", label: "Scale — tâches/mois", type: "number" },
    ],
  },
  global_settings: {
    label: "Paramètres globaux",
    icon: "⚙️",
    fields: [
      { key: "app_name", label: "Nom de l'application", type: "text" },
      { key: "support_email", label: "Email support", type: "text" },
      { key: "max_referral_discount", label: "Réduction parrainage max (%)", type: "number" },
      { key: "referral_discount_per", label: "Réduction par parrainage (%)", type: "number" },
    ],
  },
};

export default function ConfigClient({ initialConfigs }: { initialConfigs: SystemConfig[] }) {
  const { addToast } = useToast();
  const [configs, setConfigs] = useState<Record<string, SystemConfig>>(
    Object.fromEntries(initialConfigs.map(c => [c.key, c]))
  );
  const [saving, setSaving] = useState<string | null>(null);

  const updateField = (configKey: string, field: string, value: unknown) => {
    setConfigs(cs => ({
      ...cs,
      [configKey]: { ...cs[configKey], value: { ...cs[configKey].value, [field]: value } },
    }));
  };

  const save = async (configKey: string) => {
    setSaving(configKey);
    try {
      const res = await fetch(`/api/admin/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: configKey, value: configs[configKey].value }),
      });
      if (res.ok) {
        addToast("Configuration sauvegardée", "success");
      } else {
        addToast("Erreur lors de la sauvegarde", "error");
      }
    } finally {
      setSaving(null);
    }
  };

  const maintenanceEnabled = Boolean(configs["maintenance_mode"]?.value?.enabled);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>⚙️ Configuration système</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>Paramètres globaux, maintenance, limites et annonces</p>
      </div>

      {maintenanceEnabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-medium text-amber-800">⚠️ Mode maintenance ACTIF — les utilisateurs voient le message de maintenance</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(CONFIG_META).map(([configKey, meta]) => {
          const config = configs[configKey];
          if (!config) return null;
          return (
            <div key={configKey} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                  {meta.icon} {meta.label}
                </h2>
                <span className="text-[10px] text-gray-400">
                  {config.updated_at ? new Date(config.updated_at).toLocaleDateString("fr-FR") : ""}
                </span>
              </div>

              <div className="space-y-3">
                {meta.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>{f.label}</label>
                    {f.type === "boolean" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`${configKey}.${f.key}`}
                          checked={Boolean(config.value[f.key])}
                          onChange={e => updateField(configKey, f.key, e.target.checked)}
                          className="rounded w-4 h-4"
                        />
                        <label htmlFor={`${configKey}.${f.key}`} className="text-xs text-gray-500">
                          {Boolean(config.value[f.key]) ? "Activé" : "Désactivé"}
                        </label>
                      </div>
                    ) : f.type === "number" ? (
                      <input
                        type="number"
                        value={Number(config.value[f.key] ?? 0)}
                        onChange={e => updateField(configKey, f.key, Number(e.target.value))}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        style={{ color: "#0f172a" }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(config.value[f.key] ?? "")}
                        onChange={e => updateField(configKey, f.key, e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        style={{ color: "#0f172a" }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => save(configKey)}
                  disabled={saving === configKey}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-xs font-medium text-white"
                >
                  {saving === configKey
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Save className="w-3.5 h-3.5" />}
                  Sauvegarder
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* All configs raw view */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Toutes les clés de configuration</h2>
        <div className="space-y-2">
          {initialConfigs.map(c => (
            <div key={c.key} className="flex items-start justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-xs font-mono font-medium" style={{ color: "#0f172a" }}>{c.key}</p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{c.description}</p>
              </div>
              <span className="text-[10px] text-gray-400 whitespace-nowrap ml-4">
                {c.updated_at ? new Date(c.updated_at).toLocaleDateString("fr-FR") : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
