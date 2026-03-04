"use client";

import { useState } from "react";
import { Settings, Shield, Mail, Globe, Database, Save, CheckCircle, AlertTriangle } from "lucide-react";

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    siteName: "EcomPilot",
    siteUrl: "https://ecompilot.com",
    supportEmail: "support@ecompilot.com",
    maxProductsFree: "50",
    maxProductsStarter: "500",
    maxProductsPro: "2000",
    maxProductsScale: "10000",
    maintenanceMode: false,
    registrationOpen: true,
    trialDays: "7",
    defaultModel: "gpt-4o-mini",
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Paramètres</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Configuration globale de la plateforme</p>
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ backgroundColor: "#dc2626", color: "#fff" }}>
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "Sauvegardé !" : "Sauvegarder"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Globe className="w-5 h-5" style={{ color: "#2563eb" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Général</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nom du site</label>
              <input type="text" value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>URL du site</label>
              <input type="url" value={settings.siteUrl} onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Email support</label>
              <input type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
            </div>
          </div>
        </div>

        {/* Limites plans */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Database className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Limites des plans</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "maxProductsFree", label: "Free — max produits" },
              { key: "maxProductsStarter", label: "Starter — max produits" },
              { key: "maxProductsPro", label: "Pro — max produits" },
              { key: "maxProductsScale", label: "Scale — max produits" },
            ].map((item) => (
              <div key={item.key}>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>{item.label}</label>
                <input type="number" value={settings[item.key as keyof typeof settings] as string}
                  onChange={(e) => setSettings({ ...settings, [item.key]: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Shield className="w-5 h-5" style={{ color: "#059669" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Sécurité</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
              <div>
                <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Mode maintenance</p>
                <p className="text-xs" style={{ color: "#94a3b8" }}>Désactiver l'accès public temporairement</p>
              </div>
              <button onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                className={`w-11 h-6 rounded-full transition-colors relative`}
                style={{ backgroundColor: settings.maintenanceMode ? "#dc2626" : "#d1d5db" }}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.maintenanceMode ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
              <div>
                <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Inscriptions ouvertes</p>
                <p className="text-xs" style={{ color: "#94a3b8" }}>Permettre les nouvelles inscriptions</p>
              </div>
              <button onClick={() => setSettings({ ...settings, registrationOpen: !settings.registrationOpen })}
                className={`w-11 h-6 rounded-full transition-colors relative`}
                style={{ backgroundColor: settings.registrationOpen ? "#059669" : "#d1d5db" }}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.registrationOpen ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* AI Config */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Settings className="w-5 h-5" style={{ color: "#f59e0b" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Configuration IA</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Jours d'essai</label>
              <input type="number" value={settings.trialDays} onChange={(e) => setSettings({ ...settings, trialDays: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Modèle IA par défaut</label>
              <select value={settings.defaultModel} onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }}>
                <option value="gpt-4o-mini">GPT-4o Mini (économique)</option>
                <option value="gpt-4o">GPT-4o (premium)</option>
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5" style={{ color: "#d97706" }} />
            <p className="text-xs" style={{ color: "#92400e" }}>GPT-4o est 10x plus cher que GPT-4o Mini. Réservez-le aux plans Scale.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
