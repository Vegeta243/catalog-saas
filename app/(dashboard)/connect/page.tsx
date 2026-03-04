"use client";

import { useState, useEffect } from "react";
import {
  Store, Lock, ArrowRight, CheckCircle2, ShieldCheck, Zap, RefreshCw, Package, ArrowLeft, Loader2,
} from "lucide-react";

type Step = 1 | 2 | 3;

export default function ConnectShopify() {
  const [step, setStep] = useState<Step>(1);
  const [shopDomain, setShopDomain] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncDone, setSyncDone] = useState(false);

  const handleConnect = () => {
    if (!shopDomain) return;
    setIsConnecting(true);
    // Move to step 2 (authorizing via Shopify)
    setStep(2);
    // Simulate OAuth redirect delay, then move to step 3 (sync)
    setTimeout(() => {
      setStep(3);
      setIsConnecting(false);
    }, 2000);
  };

  // Simulate sync progress when on step 3
  useEffect(() => {
    if (step !== 3 || syncDone) return;
    const interval = setInterval(() => {
      setSyncProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setSyncDone(true);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [step, syncDone]);

  const goToProducts = () => {
    window.location.href = "/dashboard/products";
  };

  const realConnect = () => {
    if (!shopDomain) return;
    window.location.href = `/api/auth/shopify?shop=${shopDomain}`;
  };

  const steps = [
    { num: 1 as Step, label: "Boutique", desc: "Entrez l'URL" },
    { num: 2 as Step, label: "Autorisation", desc: "Via Shopify" },
    { num: 3 as Step, label: "Synchronisation", desc: "Import produits" },
  ];

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Stepper */}
      <div className="flex items-center justify-center mb-10">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.num ? "bg-emerald-500" : step === s.num ? "bg-blue-600" : "bg-gray-200"
              }`} style={{ color: step >= s.num ? "#fff" : "#94a3b8" }}>
                {step > s.num ? <CheckCircle2 className="w-5 h-5" style={{ color: "#fff" }} /> : s.num}
              </div>
              <p className="text-xs font-medium mt-2" style={{ color: step >= s.num ? "#0f172a" : "#94a3b8" }}>{s.label}</p>
              <p className="text-[10px]" style={{ color: "#94a3b8" }}>{s.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-20 h-0.5 mx-4 mt-[-20px] rounded-full transition-all ${step > s.num ? "bg-emerald-500" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Enter shop URL */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <Store className="w-6 h-6" style={{ color: "#fff" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#0f172a" }}>Connecter votre boutique Shopify</h1>
              <p className="text-sm" style={{ color: "#64748b" }}>Étape 1 — Entrez l&apos;URL de votre boutique</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block" style={{ color: "#374151" }}>URL de votre boutique</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
              <input type="text" placeholder="ma-boutique.myshopify.com" value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                style={{ color: "#0f172a" }}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()} />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleConnect} disabled={!shopDomain}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ color: "#fff" }}>
              Simuler la connexion <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={realConnect} disabled={!shopDomain}
              className="px-4 py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl text-sm font-medium transition-all"
              style={{ color: "#374151" }}>
              Connexion réelle
            </button>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <p className="text-xs" style={{ color: "#94a3b8" }}>Connexion sécurisée via OAuth 2.0 Shopify</p>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: Package, text: "Sync automatique" },
              { icon: RefreshCw, text: "Temps réel" },
              { icon: Zap, text: "Masse editing" },
              { icon: ShieldCheck, text: "Sécurisé" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.text} className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                  <Icon className="w-4 h-4" style={{ color: "#059669" }} />
                  <span className="text-xs font-medium" style={{ color: "#374151" }}>{f.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Authorization */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2563eb" }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#0f172a" }}>Autorisation en cours…</h2>
          <p className="text-sm mb-4" style={{ color: "#64748b" }}>Redirection vers Shopify pour autoriser EcomPilot</p>
          <p className="text-xs" style={{ color: "#94a3b8" }}>Boutique : {shopDomain}</p>
        </div>
      )}

      {/* Step 3: Sync */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="text-center mb-8">
            {syncDone ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" style={{ color: "#059669" }} />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "#0f172a" }}>Synchronisation terminée !</h2>
                <p className="text-sm" style={{ color: "#64748b" }}>Tous vos produits ont été importés avec succès</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "#2563eb" }} />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "#0f172a" }}>Synchronisation en cours…</h2>
                <p className="text-sm" style={{ color: "#64748b" }}>Import de vos produits depuis {shopDomain}</p>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "#374151" }}>Progression</span>
              <span className="text-xs font-medium" style={{ color: "#374151" }}>{Math.min(100, Math.round(syncProgress))}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-3 rounded-full transition-all duration-300" style={{
                width: `${Math.min(100, syncProgress)}%`,
                backgroundColor: syncDone ? "#059669" : "#2563eb",
              }} />
            </div>
          </div>

          {syncDone && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <span className="text-sm" style={{ color: "#065f46" }}>Produits importés</span>
                <span className="text-sm font-bold" style={{ color: "#065f46" }}>245</span>
              </div>
              <button onClick={goToProducts}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{ color: "#fff" }}>
                Voir mes produits <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {!syncDone && (
            <p className="text-xs text-center" style={{ color: "#94a3b8" }}>Cela peut prendre quelques secondes…</p>
          )}
        </div>
      )}
    </div>
  );
}
