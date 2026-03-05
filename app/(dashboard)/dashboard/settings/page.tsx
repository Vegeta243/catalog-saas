"use client";

import { useState } from "react";
import {
  Settings, User, Store, Bell, CreditCard, Key, Shield, Save,
  Globe, Moon, Sun, Palette, Upload, Eye, EyeOff, Check, Copy,
  RefreshCw, Mail, Phone, ExternalLink,
} from "lucide-react";
import { useToast } from "@/lib/toast";

type Tab = "profile" | "shop" | "notifications" | "billing" | "api" | "advanced";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profil", icon: <User className="w-4 h-4" /> },
  { id: "shop", label: "Boutique", icon: <Store className="w-4 h-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { id: "billing", label: "Facturation", icon: <CreditCard className="w-4 h-4" /> },
  { id: "api", label: "Clés API", icon: <Key className="w-4 h-4" /> },
  { id: "advanced", label: "Avancé", icon: <Shield className="w-4 h-4" /> },
];

export default function SettingsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);

  // Profile
  const [fullName, setFullName] = useState("Jean Dupont");
  const [email, setEmail] = useState("jean@ecompilot.com");
  const [phone, setPhone] = useState("+33 6 12 34 56 78");
  const [timezone, setTimezone] = useState("Europe/Paris");

  // Shop
  const [shopName, setShopName] = useState("Ma Boutique Shopify");
  const [shopUrl, setShopUrl] = useState("ma-boutique.myshopify.com");
  const [currency, setCurrency] = useState("EUR");
  const [language, setLanguage] = useState("fr");
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState("30");

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [automationNotifs, setAutomationNotifs] = useState(true);
  const [aiNotifs, setAiNotifs] = useState(false);

  // API
  const [showShopifyKey, setShowShopifyKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const shopifyKey = "shpat_xxxxxxxxxxxx";
  const openaiKey = "sk-xxxxxxxxxxxxxxxx";

  // Advanced
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("light");
  const [compactMode, setCompactMode] = useState(false);
  const [devMode, setDevMode] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    addToast("Paramètres sauvegardés", "success");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast("Copié dans le presse-papier", "success");
  };

  const ToggleSwitch = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm" style={{ color: "#374151" }}>{label}</span>
      <button onClick={onToggle} className="relative w-10 h-6 rounded-full transition-colors"
        style={{ backgroundColor: on ? "#2563eb" : "#d1d5db" }}>
        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: on ? "translateX(16px)" : "translateX(0)" }} />
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: "#0f172a" }}>Paramètres</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Gérez les préférences de votre compte et boutique</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors self-start sm:self-auto">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Save className="w-4 h-4" style={{ color: "#fff" }} />}
          <span style={{ color: "#fff" }}>Sauvegarder</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* Sidebar tabs */}
        <div className="w-full md:w-52 shrink-0">
          {/* Mobile: horizontal scroll tabs */}
          <div className="md:hidden overflow-x-auto -mx-1 px-1 pb-1">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit min-w-full">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
                  style={{ color: activeTab === tab.id ? "#2563eb" : "#374151" }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>
          {/* Desktop: vertical sidebar */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-blue-50 border-r-2 border-blue-600" : "hover:bg-gray-50"}`}
                style={{ color: activeTab === tab.id ? "#2563eb" : "#374151" }}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                <User className="w-4 h-4" style={{ color: "#2563eb" }} />
                Informations personnelles
              </h2>
              <p className="text-xs mb-6" style={{ color: "#64748b" }}>Gérez votre profil et vos coordonnées</p>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xl font-bold" style={{ color: "#2563eb" }}>JD</span>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{fullName}</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>{email}</p>
                  <button className="flex items-center gap-1 mt-1 text-xs font-medium" style={{ color: "#2563eb" }}>
                    <Upload className="w-3 h-3" /> Changer la photo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                      style={{ color: "#0f172a" }} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                      style={{ color: "#0f172a" }} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                      style={{ color: "#0f172a" }} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Fuseau horaire</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none"
                      style={{ color: "#0f172a" }}>
                      <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                      <option value="America/New_York">America/New York (GMT-5)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                      <option value="America/Los_Angeles">America/Los Angeles (GMT-8)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shop Tab */}
          {activeTab === "shop" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Store className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Configuration de la boutique
                </h2>
                <p className="text-xs mb-6" style={{ color: "#64748b" }}>Paramètres de votre boutique Shopify</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nom de la boutique</label>
                    <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                      style={{ color: "#0f172a" }} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>URL Shopify</label>
                    <div className="relative">
                      <input type="text" value={shopUrl} onChange={(e) => setShopUrl(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none pr-8"
                        style={{ color: "#0f172a" }} />
                      <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Devise</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none"
                      style={{ color: "#0f172a" }}>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (C$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Langue du catalogue</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none"
                      style={{ color: "#0f172a" }}>
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <RefreshCw className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Synchronisation
                </h2>
                <ToggleSwitch on={autoSync} onToggle={() => setAutoSync(!autoSync)} label="Synchronisation automatique" />
                {autoSync && (
                  <div className="mt-4">
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Intervalle (minutes)</label>
                    <select value={syncInterval} onChange={(e) => setSyncInterval(e.target.value)}
                      className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none"
                      style={{ color: "#0f172a" }}>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 heure</option>
                      <option value="360">6 heures</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                <Bell className="w-4 h-4" style={{ color: "#2563eb" }} />
                Préférences de notification
              </h2>
              <p className="text-xs mb-6" style={{ color: "#64748b" }}>Choisissez quelles notifications recevoir</p>

              <div className="space-y-1">
                <ToggleSwitch on={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} label="Notifications par email" />
                <ToggleSwitch on={stockAlerts} onToggle={() => setStockAlerts(!stockAlerts)} label="Alertes de stock bas" />
                <ToggleSwitch on={priceAlerts} onToggle={() => setPriceAlerts(!priceAlerts)} label="Alertes de changement de prix" />
                <ToggleSwitch on={weeklyReport} onToggle={() => setWeeklyReport(!weeklyReport)} label="Rapport hebdomadaire" />
                <ToggleSwitch on={automationNotifs} onToggle={() => setAutomationNotifs(!automationNotifs)} label="Notifications d'automatisation" />
                <ToggleSwitch on={aiNotifs} onToggle={() => setAiNotifs(!aiNotifs)} label="Suggestions IA" />
              </div>
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <CreditCard className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Plan actuel
                </h2>
                <p className="text-xs mb-6" style={{ color: "#64748b" }}>Gérez votre abonnement et votre facturation</p>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-80">Votre plan</p>
                      <p className="text-2xl font-bold mt-1">Pro</p>
                      <p className="text-sm mt-2 opacity-80">29€ / mois</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">Tâches restantes</p>
                      <p className="text-3xl font-bold mt-1">847</p>
                      <p className="text-xs mt-1 opacity-60">sur 1 000 / mois</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-white/20 rounded-full h-2">
                    <div className="bg-white rounded-full h-2" style={{ width: "84.7%" }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: "Starter", price: "49€", features: ["1 boutique", "50 tâches/mois", "Support email"] },
                    { name: "Pro", price: "89€", features: ["3 boutiques", "300 tâches/mois", "Support prioritaire", "Automatisations"], current: true },
                    { name: "Scale", price: "129€", features: ["Boutiques illimitées", "1 000 tâches/mois", "Support dédié", "API complète"] },
                  ].map((plan) => (
                    <div key={plan.name}
                      className={`rounded-xl border p-4 ${plan.current ? "border-blue-400 bg-blue-50/50" : "border-gray-200"}`}>
                      <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{plan.name}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: "#0f172a" }}>{plan.price}<span className="text-xs font-normal" style={{ color: "#64748b" }}>/mois</span></p>
                      <ul className="mt-3 space-y-1.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-1.5 text-xs" style={{ color: "#64748b" }}>
                            <Check className="w-3 h-3" style={{ color: "#059669" }} /> {f}
                          </li>
                        ))}
                      </ul>
                      <button className={`w-full mt-4 py-2 rounded-lg text-xs font-medium ${plan.current ? "bg-blue-600" : "bg-gray-100 hover:bg-gray-200"}`}
                        style={{ color: plan.current ? "#fff" : "#374151" }}>
                        {plan.current ? "Plan actuel" : "Changer"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "api" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                <Key className="w-4 h-4" style={{ color: "#2563eb" }} />
                Clés API
              </h2>
              <p className="text-xs mb-6" style={{ color: "#64748b" }}>Gérez vos intégrations API tierces</p>

              <div className="space-y-4">
                {/* Shopify */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <Store className="w-4 h-4" style={{ color: "#16a34a" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Shopify API</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>Token d&apos;accès privé</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded" style={{ color: "#059669" }}>Connecté</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type={showShopifyKey ? "text" : "password"} value={shopifyKey} readOnly
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white font-mono" style={{ color: "#0f172a" }} />
                    <button onClick={() => setShowShopifyKey(!showShopifyKey)} className="p-2 hover:bg-gray-200 rounded-lg">
                      {showShopifyKey ? <EyeOff className="w-4 h-4" style={{ color: "#64748b" }} /> : <Eye className="w-4 h-4" style={{ color: "#64748b" }} />}
                    </button>
                    <button onClick={() => copyToClipboard(shopifyKey)} className="p-2 hover:bg-gray-200 rounded-lg">
                      <Copy className="w-4 h-4" style={{ color: "#64748b" }} />
                    </button>
                  </div>
                </div>

                {/* OpenAI */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                        <Key className="w-4 h-4" style={{ color: "#7c3aed" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>OpenAI API</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>Clé secrète GPT-4o-mini</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded" style={{ color: "#059669" }}>Connecté</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type={showOpenAIKey ? "text" : "password"} value={openaiKey} readOnly
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white font-mono" style={{ color: "#0f172a" }} />
                    <button onClick={() => setShowOpenAIKey(!showOpenAIKey)} className="p-2 hover:bg-gray-200 rounded-lg">
                      {showOpenAIKey ? <EyeOff className="w-4 h-4" style={{ color: "#64748b" }} /> : <Eye className="w-4 h-4" style={{ color: "#64748b" }} />}
                    </button>
                    <button onClick={() => copyToClipboard(openaiKey)} className="p-2 hover:bg-gray-200 rounded-lg">
                      <Copy className="w-4 h-4" style={{ color: "#64748b" }} />
                    </button>
                  </div>
                </div>

                {/* Stripe */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <CreditCard className="w-4 h-4" style={{ color: "#2563eb" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Stripe</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>Paiements et abonnements</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded" style={{ color: "#059669" }}>Connecté</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === "advanced" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Palette className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Apparence
                </h2>
                <div className="flex items-center gap-3">
                  {[
                    { value: "light" as const, label: "Clair", icon: <Sun className="w-4 h-4" /> },
                    { value: "dark" as const, label: "Sombre", icon: <Moon className="w-4 h-4" /> },
                    { value: "auto" as const, label: "Auto", icon: <Settings className="w-4 h-4" /> },
                  ].map((t) => (
                    <button key={t.value} onClick={() => setTheme(t.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${theme === t.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                      style={{ color: theme === t.value ? "#2563eb" : "#374151" }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Shield className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Options avancées
                </h2>
                <ToggleSwitch on={compactMode} onToggle={() => setCompactMode(!compactMode)} label="Mode compact (tableaux denses)" />
                <ToggleSwitch on={devMode} onToggle={() => setDevMode(!devMode)} label="Mode développeur (logs console)" />
              </div>

              <div className="bg-white rounded-xl border border-red-200 p-6">
                <h2 className="text-base font-semibold mb-2" style={{ color: "#ef4444" }}>Zone de danger</h2>
                <p className="text-xs mb-4" style={{ color: "#64748b" }}>Actions irréversibles sur votre compte</p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 border border-red-300 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: "#ef4444" }}>
                    Réinitialiser les données
                  </button>
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors">
                    <span style={{ color: "#fff" }}>Supprimer le compte</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
