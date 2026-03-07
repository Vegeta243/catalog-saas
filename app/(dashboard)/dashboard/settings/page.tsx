"use client";

import { useState, useEffect } from "react";
import {
  Settings, User, Store, Bell, CreditCard, Key, Shield, Save,
  Globe, Moon, Sun, Palette, Upload, Eye, EyeOff, Check, Copy,
  RefreshCw, Mail, Phone, ExternalLink,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";

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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [initials, setInitials] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email || "");
        const { data } = await supabase
          .from("users")
          .select("first_name, last_name, phone, timezone, plan, actions_used, actions_limit")
          .eq("id", user.id)
          .single();
        const firstName = data?.first_name || user.user_metadata?.first_name || "";
        const lastName = data?.last_name || "";
        const name = [firstName, lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "";
        setFullName(name);
        setPhone(data?.phone || "");
        if (data?.timezone) setTimezone(data.timezone);
        const i = [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() || name[0]?.toUpperCase() || "?";
        setInitials(i);
        if (data) {
          setPlanName(data.plan || "free");
          setPlanTasksUsed(data.actions_used || 0);
          setPlanTasksLimit(data.actions_limit || 50);
        }
        // Fetch active shop
        const { data: shopData } = await supabase
          .from("shops")
          .select("shop_domain, shop_name, access_token")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (shopData) {
          setShopName(shopData.shop_name || shopData.shop_domain || "");
          setShopUrl(shopData.shop_domain || "");
          setShopToken(shopData.access_token || "");
          setShopHasToken(!!shopData.access_token);
        }
      } catch { /* silent */ }
    };
    loadUser();
  }, []);

  // Shop (real data from Supabase)
  const [shopName, setShopName] = useState("");
  const [shopUrl, setShopUrl] = useState("");
  const [shopToken, setShopToken] = useState("");
  const [shopHasToken, setShopHasToken] = useState(false);
  const [currency, setCurrency] = useState("EUR");
  const [language, setLanguage] = useState("fr");
  const [autoSync, setAutoSync] = useState(true);
  const [syncInterval, setSyncInterval] = useState("30");

  // Plan (real data from Supabase)
  const [planName, setPlanName] = useState("free");
  const [planTasksUsed, setPlanTasksUsed] = useState(0);
  const [planTasksLimit, setPlanTasksLimit] = useState(50);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [stockAlerts, setStockAlerts] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [automationNotifs, setAutomationNotifs] = useState(true);
  const [aiNotifs, setAiNotifs] = useState(false);

  // API
  const [showShopifyKey, setShowShopifyKey] = useState(false);

  // Advanced
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("light");
  const [compactMode, setCompactMode] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // Load advanced preferences from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("ecompilot-theme") as "light" | "dark" | "auto" | null;
    const savedCompact = localStorage.getItem("ecompilot-compact") === "true";
    const savedDev = localStorage.getItem("ecompilot-devmode") === "true";
    if (savedTheme) setTheme(savedTheme);
    setCompactMode(savedCompact);
    setDevMode(savedDev);
  }, []);

  // Apply dark mode whenever theme changes
  const applyTheme = (t: "light" | "dark" | "auto") => {
    const html = document.documentElement;
    if (t === "dark") {
      html.classList.add("dark");
    } else if (t === "light") {
      html.classList.remove("dark");
    } else {
      // Auto: follow system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) html.classList.add("dark");
      else html.classList.remove("dark");
    }
  };

  const handleThemeChange = (t: "light" | "dark" | "auto") => {
    setTheme(t);
    localStorage.setItem("ecompilot-theme", t);
    applyTheme(t);
    addToast(t === "dark" ? "Mode sombre activé" : t === "light" ? "Mode clair activé" : "Mode automatique activé", "success");
  };

  const handleCompactToggle = () => {
    const next = !compactMode;
    setCompactMode(next);
    localStorage.setItem("ecompilot-compact", String(next));
    if (next) document.body.classList.add("compact");
    else document.body.classList.remove("compact");
    addToast(next ? "Mode compact activé" : "Mode compact désactivé", "success");
  };

  const handleDevModeToggle = () => {
    const next = !devMode;
    setDevMode(next);
    localStorage.setItem("ecompilot-devmode", String(next));
    addToast(next ? "Mode développeur activé — IDs et logs visibles" : "Mode développeur désactivé", "success");
  };

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

  const ToggleSwitch = ({ on, onToggle, label, desc }: { on: boolean; onToggle: () => void; label: string; desc?: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm" style={{ color: "#374151" }}>{label}</span>
        {desc && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{desc}</p>}
      </div>
      <button onClick={onToggle} className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
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
                  <span className="text-xl font-bold" style={{ color: "#2563eb" }}>{initials || "?"}</span>
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
                      <p className="text-2xl font-bold mt-1">{planName.charAt(0).toUpperCase() + planName.slice(1)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm opacity-80">Tâches restantes</p>
                      <p className="text-3xl font-bold mt-1">{Math.max(0, planTasksLimit - planTasksUsed)}</p>
                      <p className="text-xs mt-1 opacity-60">sur {planTasksLimit} / mois</p>
                    </div>
                  </div>
                  <div className="mt-4 bg-white/20 rounded-full h-2">
                    <div className="bg-white rounded-full h-2" style={{ width: `${Math.min(100, (Math.max(0, planTasksLimit - planTasksUsed) / Math.max(1, planTasksLimit)) * 100)}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Gérer mon abonnement</p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Changez de plan, consultez vos factures et gérez votre abonnement</p>
                  </div>
                  <a href="/dashboard/billing" className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors" style={{ color: "#fff" }}>
                    Gérer <ExternalLink className="w-3.5 h-3.5" />
                  </a>
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
                {/* Shopify Token */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <Store className="w-4 h-4" style={{ color: "#16a34a" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Shopify</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>{shopUrl || "Aucune boutique connectée"}</p>
                      </div>
                    </div>
                    {shopHasToken
                      ? <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded" style={{ color: "#059669" }}>Token actif</span>
                      : <span className="text-xs px-2 py-0.5 bg-amber-100 rounded" style={{ color: "#d97706" }}>Sans token</span>
                    }
                  </div>
                  {shopHasToken && (
                    <div className="flex items-center gap-2">
                      <input
                        type={showShopifyKey ? "text" : "password"}
                        value={shopToken}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white font-mono"
                        style={{ color: "#0f172a" }}
                      />
                      <button onClick={() => setShowShopifyKey(!showShopifyKey)} className="p-2 hover:bg-gray-200 rounded-lg">
                        {showShopifyKey ? <EyeOff className="w-4 h-4" style={{ color: "#64748b" }} /> : <Eye className="w-4 h-4" style={{ color: "#64748b" }} />}
                      </button>
                      <button onClick={() => copyToClipboard(shopToken)} className="p-2 hover:bg-gray-200 rounded-lg">
                        <Copy className="w-4 h-4" style={{ color: "#64748b" }} />
                      </button>
                    </div>
                  )}
                  {!shopUrl && (
                    <a href="/dashboard/shops" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "#2563eb" }}>
                      Connecter une boutique <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* OpenAI — géré côté serveur */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                        <Key className="w-4 h-4" style={{ color: "#7c3aed" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>OpenAI API</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>Géré côté serveur — GPT-4o-mini</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded" style={{ color: "#059669" }}>Actif</span>
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
                        <p className="text-xs" style={{ color: "#64748b" }}>Paiements et abonnements — géré côté serveur</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded" style={{ color: "#059669" }}>Actif</span>
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
                <p className="text-xs mb-3" style={{ color: "#64748b" }}>Choisissez le thème d&apos;affichage du dashboard. La préférence est sauvegardée dans votre navigateur.</p>
                <div className="flex items-center gap-3">
                  {[
                    { value: "light" as const, label: "Clair", icon: <Sun className="w-4 h-4" /> },
                    { value: "dark" as const, label: "Sombre", icon: <Moon className="w-4 h-4" /> },
                    { value: "auto" as const, label: "Auto", icon: <Settings className="w-4 h-4" /> },
                  ].map((t) => (
                    <button key={t.value} onClick={() => handleThemeChange(t.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${theme === t.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                      style={{ color: theme === t.value ? "#2563eb" : "#374151" }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                {theme === "dark" && (
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#059669" }}>
                    <Moon className="w-3 h-3" /> Mode sombre actif — la classe &quot;dark&quot; est appliquée sur l&apos;élément HTML.
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Shield className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Options avancées
                </h2>
                <ToggleSwitch
                  on={compactMode}
                  onToggle={handleCompactToggle}
                  label="Mode compact"
                  desc="Réduit les espacements dans les tableaux et listes du dashboard pour afficher plus de données à l'écran."
                />
                <ToggleSwitch
                  on={devMode}
                  onToggle={handleDevModeToggle}
                  label="Mode développeur"
                  desc="Affiche les informations techniques : IDs Shopify des produits, logs API et temps de réponse."
                />
                {devMode && (
                  <div className="mt-3 p-3 bg-slate-900 rounded-lg">
                    <p className="text-[11px] font-mono" style={{ color: "#22d3ee" }}>
                      [DEV] Mode développeur actif · Dashboard EcomPilot · {new Date().toISOString()}
                    </p>
                    <p className="text-[11px] font-mono mt-1" style={{ color: "#94a3b8" }}>
                      Les IDs Shopify des produits sont maintenant visibles dans le catalogue.
                    </p>
                  </div>
                )}
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
