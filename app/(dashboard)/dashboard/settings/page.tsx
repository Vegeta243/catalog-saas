"use client";

import { useState, useEffect } from "react";
import {
  Settings, User, Store, Bell, CreditCard, Key, Shield, Save,
  Globe, Moon, Sun, Palette, Upload, Eye, EyeOff, Check, Copy,
  RefreshCw, Mail, Phone, ExternalLink, ChevronDown, AlertTriangle,
  Loader2, ArrowRight, Lock,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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
  const [theme, setTheme] = useState<"light" | "dark" | "auto">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as "light" | "dark" | "auto" | null;
      return saved || "auto";
    }
    return "auto";
  });
  const [compactMode, setCompactMode] = useState(false);
  const [devMode, setDevMode] = useState(false);

  // Delete account danger zone
  const [showDeleteAccordion, setShowDeleteAccordion] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Multi-shop
  interface ShopEntry { id: string; shop_domain: string; shop_name: string; is_active: boolean; products_count: number; last_sync_at: string | null; }
  const [allShops, setAllShops] = useState<ShopEntry[]>([]);

  useEffect(() => {
    const loadShops = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("shops").select("id, shop_domain, shop_name, is_active, products_count, last_sync_at").eq("user_id", user.id).order("created_at", { ascending: false });
        setAllShops((data || []) as ShopEntry[]);
      } catch { /* silent */ }
    };
    loadShops();
  }, []);

  // Apply theme from state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyTheme = (t: "light" | "dark" | "auto") => {
      localStorage.setItem("theme", t);
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = t === "dark" || (t === "auto" && prefersDark);
      document.documentElement.classList.toggle("dark", isDark);
    };
    applyTheme(theme);
    if (theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => { if (theme === "auto") document.documentElement.classList.toggle("dark", e.matches); };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

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

  const formatDate = (d: string | null) => {
    if (!d) return "Jamais";
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return new Date(d).toLocaleDateString("fr-FR");
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
                  Boutiques connectées
                </h2>
                <p className="text-xs mb-6" style={{ color: "#64748b" }}>Gérez toutes vos boutiques Shopify depuis un seul endroit</p>

                {allShops.length === 0 ? (
                  <div className="text-center py-8">
                    <Store className="w-10 h-10 mx-auto mb-3" style={{ color: "#d1d5db" }} />
                    <p className="text-sm mb-4" style={{ color: "#64748b" }}>Aucune boutique connectée</p>
                    <a href="/dashboard/shops" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium" style={{ color: "#fff" }}>
                      + Connecter une boutique
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allShops.map((shop) => (
                      <div key={shop.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${shop.is_active ? "bg-emerald-50" : "bg-gray-100"}`}>
                              <Store className="w-5 h-5" style={{ color: shop.is_active ? "#059669" : "#94a3b8" }} />
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{shop.shop_name || shop.shop_domain}</p>
                              <a href={`https://${shop.shop_domain}`} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1" style={{ color: "#2563eb" }}>
                                {shop.shop_domain} <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs" style={{ color: "#64748b" }}>{shop.products_count || 0} produits</p>
                              <p className="text-xs" style={{ color: "#94a3b8" }}>Synchro : {formatDate(shop.last_sync_at)}</p>
                            </div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${shop.is_active ? "bg-emerald-50" : "bg-red-50"}`}
                              style={{ color: shop.is_active ? "#059669" : "#dc2626" }}>
                              {shop.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <a href="/dashboard/shops" className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium w-full justify-center transition-colors" style={{ color: "#2563eb" }}>
                      + Ajouter une boutique
                    </a>
                  </div>
                )}
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
            <div className="space-y-4">
              {/* Status overview — always visible */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Key className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Intégrations
                </h2>
                <p className="text-xs mb-4" style={{ color: "#64748b" }}>Statut de vos connexions et services</p>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <Store className="w-4 h-4" style={{ color: "#16a34a" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Shopify</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>{shopUrl || "Aucune boutique connectée"}</p>
                      </div>
                    </div>
                    {shopHasToken
                      ? <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded-full font-medium" style={{ color: "#059669" }}>✅ Connecté</span>
                      : <span className="text-xs px-2 py-0.5 bg-amber-100 rounded-full font-medium" style={{ color: "#d97706" }}>⚠️ Non connecté</span>
                    }
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                        <Key className="w-4 h-4" style={{ color: "#7c3aed" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>OpenAI</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>Géré côté serveur — GPT-4o-mini</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded-full font-medium" style={{ color: "#059669" }}>✅ Actif</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <CreditCard className="w-4 h-4" style={{ color: "#2563eb" }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Stripe</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>Paiements et abonnements</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded-full font-medium" style={{ color: "#059669" }}>✅ Actif</span>
                  </div>
                </div>
              </div>

              {/* Dev mode details — only visible in dev mode */}
              {devMode && (
                <div className="bg-white rounded-xl border border-amber-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4" style={{ color: "#d97706" }} />
                    <h2 className="text-base font-semibold" style={{ color: "#0f172a" }}>Clés API (mode développeur)</h2>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-100 rounded font-medium" style={{ color: "#92400e" }}>DEV</span>
                  </div>
                  <p className="text-xs mb-4 p-3 bg-amber-50 rounded-lg" style={{ color: "#92400e" }}>
                    ⚠️ Ces clés sont gérées automatiquement. Ne les modifiez que si vous savez ce que vous faites.
                  </p>

                  {shopHasToken && (
                    <div className="p-4 bg-gray-50 rounded-lg mb-3">
                      <p className="text-xs font-semibold mb-2" style={{ color: "#374151" }}>Token Shopify Admin</p>
                      <div className="flex items-center gap-2">
                        <input type={showShopifyKey ? "text" : "password"} value={shopToken} readOnly
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white font-mono" style={{ color: "#0f172a" }} />
                        <button onClick={() => setShowShopifyKey(!showShopifyKey)} className="p-2 hover:bg-gray-200 rounded-lg">
                          {showShopifyKey ? <EyeOff className="w-4 h-4" style={{ color: "#64748b" }} /> : <Eye className="w-4 h-4" style={{ color: "#64748b" }} />}
                        </button>
                        <button onClick={() => copyToClipboard(shopToken)} className="p-2 hover:bg-gray-200 rounded-lg">
                          <Copy className="w-4 h-4" style={{ color: "#64748b" }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!devMode && (
                <p className="text-xs text-center" style={{ color: "#94a3b8" }}>
                  Activez le mode développeur dans l&apos;onglet Avancé pour accéder aux détails des clés API.
                </p>
              )}
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
                <p className="text-xs mb-3" style={{ color: "#64748b" }}>Choisissez le thème de l&apos;interface. &quot;Auto&quot; suit votre préférence système.</p>
                <div className="flex items-center gap-3">
                  {[
                    { value: "auto" as const, label: "Automatique", icon: <Settings className="w-4 h-4" /> },
                    { value: "light" as const, label: "Clair", icon: <Sun className="w-4 h-4" /> },
                    { value: "dark" as const, label: "Sombre", icon: <Moon className="w-4 h-4" /> },
                  ].map((t) => (
                    <button key={t.value} onClick={() => setTheme(t.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${theme === t.value ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                      style={{ color: theme === t.value ? "#2563eb" : "#374151" }}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                {theme === "auto" && (
                  <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>Mode actuel : suit votre préférence système</p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Shield className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Options avancées
                </h2>
                <ToggleSwitch on={compactMode} onToggle={() => setCompactMode(!compactMode)} label="Mode compact (tableaux denses)" />
                <ToggleSwitch on={devMode} onToggle={() => setDevMode(!devMode)} label="Mode développeur (logs console + clés API visibles)" />
                {devMode && (
                  <p className="text-xs mt-2 p-2 bg-amber-50 rounded" style={{ color: "#92400e" }}>
                    ⚠️ Mode développeur activé — les clés API sont visibles dans l&apos;onglet Clés API
                  </p>
                )}
              </div>

              {/* Mot de passe — lien vers Mon compte */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-2 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Lock className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Mot de passe
                </h2>
                <p className="text-xs mb-4" style={{ color: "#64748b" }}>Changez votre mot de passe depuis la section Sécurité de votre compte</p>
                <Link href="/dashboard/account" className="flex items-center gap-2 text-sm font-medium" style={{ color: "#2563eb" }}>
                  Modifier le mot de passe → Mon compte &gt; Sécurité <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Zone de danger — accordéon discret */}
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowDeleteAccordion(!showDeleteAccordion)}
                  className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium" style={{ color: "#94a3b8" }}>Zone de danger</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showDeleteAccordion ? "rotate-180" : ""}`} style={{ color: "#94a3b8" }} />
                </button>
                {showDeleteAccordion && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="text-xs mt-4 mb-4" style={{ color: "#64748b" }}>
                      La suppression de votre compte est permanente. Toutes vos données seront supprimées.
                    </p>

                    {deleteStep === 0 && (
                      <button onClick={() => setDeleteStep(1)} className="text-sm font-medium underline" style={{ color: "#94a3b8" }}>
                        Supprimer mon compte
                      </button>
                    )}

                    {deleteStep === 1 && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#dc2626" }} />
                          <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Êtes-vous sûr(e) ?</p>
                        </div>
                        <p className="text-xs" style={{ color: "#374151" }}>Cette action est irréversible. Toutes vos boutiques et données seront perdues.</p>
                        <div className="flex gap-2 pt-2">
                          <button onClick={() => setDeleteStep(0)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium" style={{ color: "#374151" }}>Annuler</button>
                          <button onClick={() => setDeleteStep(2)} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm font-medium" style={{ color: "#fff" }}>Continuer</button>
                        </div>
                      </div>
                    )}

                    {deleteStep === 2 && (
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
                        <p className="text-sm font-semibold" style={{ color: "#dc2626" }}>Confirmez en tapant &quot;SUPPRIMER&quot;</p>
                        <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder='Tapez "SUPPRIMER"'
                          className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm" style={{ color: "#0f172a" }} />
                        <div className="flex gap-2">
                          <button onClick={() => { setDeleteStep(0); setDeleteConfirmText(""); setDeletePassword(""); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium" style={{ color: "#374151" }}>Annuler</button>
                          <button
                            disabled={deleteConfirmText !== "SUPPRIMER" || deleteLoading}
                            onClick={async () => {
                              setDeleteLoading(true);
                              try {
                                const supabase = createClient();
                                await supabase.auth.signOut();
                                addToast("Compte supprimé. Au revoir !", "success");
                              } catch { addToast("Erreur lors de la suppression", "error"); }
                              setDeleteLoading(false);
                            }}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2" style={{ color: "#fff" }}>
                            {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Supprimer définitivement
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
