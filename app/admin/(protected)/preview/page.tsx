"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, ExternalLink, AlertTriangle } from "lucide-react";

const PLANS = ["free", "starter", "pro", "scale"] as const;

export default function PreviewModePage() {
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("pro");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/admin/preview/status")
      .then(r => r.json())
      .then(d => { if (d.plan) setActivePlan(d.plan); })
      .finally(() => setChecking(false));
  }, []);

  async function activate() {
    setLoading(true);
    const r = await fetch("/api/admin/preview/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: selected }),
    });
    if (r.ok) setActivePlan(selected);
    setLoading(false);
  }

  async function deactivate() {
    setLoading(true);
    await fetch("/api/admin/preview/stop", { method: "POST" });
    setActivePlan(null);
    setLoading(false);
  }

  const PLAN_INFO: Record<string, { color: string; desc: string }> = {
    free: { color: "#94a3b8", desc: "Tableau de bord limité, 0 produit actif, pas d'IA" },
    starter: { color: "#3b82f6", desc: "10 produits, 5 tâches IA/mois, import basique" },
    pro: { color: "#8b5cf6", desc: "50 produits, tâches IA illimitées, boutique connectée" },
    scale: { color: "#f59e0b", desc: "Illimité, toutes les fonctionnalités premium actives" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>👁 Mode Aperçu</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
          Simule l&apos;expérience d&apos;un utilisateur selon son plan, sans changer de compte.
        </p>
      </div>

      {activePlan && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b" }}>
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-sm font-medium text-amber-800">
            Mode aperçu actif : plan <strong className="uppercase">{activePlan}</strong> simulé
          </span>
          <a href="/dashboard" target="_blank" rel="noreferrer"
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-amber-700 underline">
            <ExternalLink className="w-3 h-3" /> Voir le dashboard
          </a>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Sélectionner un plan à simuler</h2>
        <div className="grid grid-cols-4 gap-3">
          {PLANS.map(plan => {
            const info = PLAN_INFO[plan];
            const isActive = activePlan === plan;
            const isSelected = selected === plan;
            return (
              <button key={plan} onClick={() => setSelected(plan)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase" style={{ color: info.color }}>{plan}</span>
                  {isActive && (
                    <span className="text-[9px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">ACTIF</span>
                  )}
                </div>
                <p className="text-[10px]" style={{ color: "#64748b" }}>{info.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={activate} disabled={loading || checking}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
            style={{ backgroundColor: "#3b82f6" }}>
            <Eye className="w-4 h-4" />
            {loading ? "Activation…" : `Activer preview (${selected})`}
          </button>
          {activePlan && (
            <button onClick={deactivate} disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-60 transition-opacity"
              style={{ color: "#64748b" }}>
              <EyeOff className="w-4 h-4" />
              Désactiver le preview
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Comment ça marche</h2>
        <ol className="space-y-2 text-xs" style={{ color: "#64748b" }}>
          <li className="flex gap-2"><span className="font-bold text-blue-500">1.</span> Sélectionne un plan ci-dessus</li>
          <li className="flex gap-2"><span className="font-bold text-blue-500">2.</span> Clique sur &quot;Activer preview&quot; — un cookie admin_preview_plan est posé</li>
          <li className="flex gap-2"><span className="font-bold text-blue-500">3.</span> Navigue vers <a href="/dashboard" target="_blank" className="text-blue-600 underline">/dashboard</a> pour voir l&apos;interface comme cet abonné</li>
          <li className="flex gap-2"><span className="font-bold text-blue-500">4.</span> Désactive le preview pour revenir à l&apos;interface admin normale</li>
        </ol>
        <p className="text-[10px] mt-3 p-2 bg-gray-50 rounded-lg" style={{ color: "#94a3b8" }}>
          Le cookie expire après 1 heure. Il ne modifie pas le vrai plan de l&apos;utilisateur.
        </p>
      </div>
    </div>
  );
}
