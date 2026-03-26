"use client";

import { useState } from "react";
import { ToggleLeft, ToggleRight, Edit2, Save, X, Plus } from "lucide-react";
import { useToast } from "@/lib/toast";

interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  visible_plans: string[];
  badge: string | null;
  admin_preview: boolean;
}

const ALL_PLANS = ["free", "starter", "pro", "agency"];
const BADGE_OPTIONS = [null, "BETA", "NEW", "SOON"];

export default function FeaturesClient({ initialFlags }: { initialFlags: FeatureFlag[] }) {
  const { addToast } = useToast();
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);
  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const toggleFlag = async (flag: FeatureFlag) => {
    setSaving(flag.key);
    try {
      const res = await fetch(`/api/admin/features/${flag.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !flag.enabled }),
      });
      if (res.ok) {
        setFlags(fs => fs.map(f => f.key === flag.key ? { ...f, enabled: !f.enabled } : f));
        addToast(`"${flag.name}" ${!flag.enabled ? "activé" : "désactivé"}`, "success");
      } else {
        addToast("Erreur lors de la mise à jour", "error");
      }
    } finally {
      setSaving(null);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(editing.key);
    try {
      const res = await fetch(`/api/admin/features/${editing.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          description: editing.description,
          badge: editing.badge,
          visible_plans: editing.visible_plans,
          admin_preview: editing.admin_preview,
        }),
      });
      if (res.ok) {
        setFlags(fs => fs.map(f => f.key === editing.key ? editing : f));
        setEditing(null);
        addToast("Feature flag mis à jour", "success");
      } else {
        addToast("Erreur", "error");
      }
    } finally {
      setSaving(null);
    }
  };

  const togglePlan = (plan: string) => {
    if (!editing) return;
    setEditing(e => e ? {
      ...e,
      visible_plans: e.visible_plans.includes(plan)
        ? e.visible_plans.filter(p => p !== plan)
        : [...e.visible_plans, plan],
    } : null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>🚩 Feature Flags</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>Activez/désactivez des fonctionnalités par plan</p>
        </div>
        <span className="text-sm font-medium px-3 py-1 bg-blue-50 text-blue-700 rounded-full">{flags.length} flags</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: "#64748b" }}>Feature</th>
              <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: "#64748b" }}>Plans visibles</th>
              <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: "#64748b" }}>Badge</th>
              <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: "#64748b" }}>Statut</th>
              <th className="text-left text-xs font-semibold px-4 py-3" style={{ color: "#64748b" }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {flags.map(flag => (
              <tr key={flag.key} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{flag.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{flag.key}</p>
                  {flag.description && <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{flag.description}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {(flag.visible_plans || []).map(p => (
                      <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">{p}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {flag.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                      flag.badge === "BETA" ? "bg-violet-500" :
                      flag.badge === "NEW" ? "bg-emerald-500" :
                      "bg-amber-500"
                    }`}>{flag.badge}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleFlag(flag)}
                    disabled={saving === flag.key}
                    className="flex items-center gap-1.5 text-sm font-medium disabled:opacity-50"
                    style={{ color: flag.enabled ? "#059669" : "#94a3b8" }}
                  >
                    {flag.enabled
                      ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                      : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    {flag.enabled ? "Actif" : "Inactif"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setEditing({ ...flag })}
                    className="p-1.5 hover:bg-blue-50 rounded text-blue-600 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: "#0f172a" }}>Modifier : {editing.key}</h3>
              <button onClick={() => setEditing(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Nom</label>
              <input value={editing.name} onChange={e => setEditing(f => f ? { ...f, name: e.target.value } : null)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Description</label>
              <input value={editing.description} onChange={e => setEditing(f => f ? { ...f, description: e.target.value } : null)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Badge</label>
              <div className="flex gap-2 mt-1">
                {BADGE_OPTIONS.map(b => (
                  <button key={String(b)} onClick={() => setEditing(f => f ? { ...f, badge: b } : null)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${editing.badge === b ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
                    {b === null ? "Aucun" : b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Plans visibles</label>
              <div className="flex gap-2">
                {ALL_PLANS.map(p => (
                  <button key={p} onClick={() => togglePlan(p)}
                    className={`px-2.5 py-1 rounded text-xs font-bold uppercase border transition-colors ${editing.visible_plans.includes(p) ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-500"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="admin_preview" checked={editing.admin_preview}
                onChange={e => setEditing(f => f ? { ...f, admin_preview: e.target.checked } : null)}
                className="rounded" />
              <label htmlFor="admin_preview" className="text-xs text-gray-600">Admin preview uniquement</label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Annuler</button>
              <button onClick={saveEdit} disabled={saving === editing.key}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-sm font-medium text-white">
                <Save className="w-3.5 h-3.5" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
