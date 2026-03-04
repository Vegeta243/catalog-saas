"use client";

import { useState } from "react";
import {
  User, CreditCard, Store, Bell, Shield, Save, Check,
  Mail, Phone, MapPin, Globe, Upload, Eye, EyeOff,
  RefreshCw, Lock, Key, Trash2, Crown, Zap,
  ExternalLink, Calendar, AlertTriangle,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { PLAN_TASKS, PLAN_PRICES, getTasksColor, getResetDate } from "@/lib/credits";

type Tab = "profile" | "subscription" | "shops" | "notifications" | "security";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profil", icon: <User className="w-4 h-4" /> },
  { id: "subscription", label: "Abonnement", icon: <CreditCard className="w-4 h-4" /> },
  { id: "shops", label: "Boutiques", icon: <Store className="w-4 h-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { id: "security", label: "Sécurité", icon: <Shield className="w-4 h-4" /> },
];

export default function AccountPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saving, setSaving] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState("Jean Dupont");
  const [email, setEmail] = useState("jean@ecompilot.com");
  const [phone, setPhone] = useState("+33 6 12 34 56 78");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [bio, setBio] = useState("E-commerçant depuis 2022. Spécialisé en dropshipping.");

  // Subscription
  const currentPlan = "pro";
  const tasksUsed = 16;
  const tasksTotal = PLAN_TASKS[currentPlan] || 300;
  const tasksRemaining = tasksTotal - tasksUsed;
  const resetDate = getResetDate();

  // Shops
  const [shops] = useState([
    { id: 1, name: "Ma Boutique", url: "ma-boutique.myshopify.com", products: 120, status: "connected", lastSync: "Il y a 5 min" },
    { id: 2, name: "Shop Express", url: "shop-express.myshopify.com", products: 45, status: "connected", lastSync: "Il y a 30 min" },
    { id: 3, name: "Boutique Test", url: "boutique-test.myshopify.com", products: 0, status: "disconnected", lastSync: "Jamais" },
  ]);

  // Notifications
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifStock, setNotifStock] = useState(true);
  const [notifPrice, setNotifPrice] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifAutomation, setNotifAutomation] = useState(true);
  const [notifAI, setNotifAI] = useState(false);
  const [notifSecurity, setNotifSecurity] = useState(true);

  // Security
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFA, setTwoFA] = useState(false);

  const [sessions] = useState([
    { device: "Chrome — Windows 11", location: "Paris, France", date: "Aujourd'hui", current: true },
    { device: "Safari — iPhone 15", location: "Lyon, France", date: "Hier" },
    { device: "Firefox — macOS", location: "Marseille, France", date: "Il y a 3 jours" },
  ]);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    addToast("Modifications sauvegardées", "success");
  };

  const ToggleSwitch = ({ on, onToggle, label, desc }: { on: boolean; onToggle: () => void; label: string; desc?: string }) => (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
      <div>
        <span className="text-sm font-medium" style={{ color: "#374151" }}>{label}</span>
        {desc && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{desc}</p>}
      </div>
      <button onClick={onToggle} className="relative w-10 h-6 rounded-full transition-colors"
        style={{ backgroundColor: on ? "#2563eb" : "#d1d5db" }}>
        <span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: on ? "translateX(16px)" : "translateX(0)" }} />
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Mon compte</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Gérez votre profil, abonnement et sécurité</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Save className="w-4 h-4" style={{ color: "#fff" }} />}
          <span style={{ color: "#fff" }}>Sauvegarder</span>
        </button>
      </div>

      <div className="flex gap-6">
        {/* Tabs sidebar */}
        <div className="w-52 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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

          {/* ─── Profil ─── */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                <User className="w-4 h-4" style={{ color: "#2563eb" }} />
                Informations personnelles
              </h2>
              <p className="text-xs mb-6" style={{ color: "#64748b" }}>Gérez votre profil public et vos coordonnées</p>

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

              <div className="grid grid-cols-2 gap-4 mb-4">
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

              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none resize-none"
                  style={{ color: "#0f172a" }} placeholder="Décrivez-vous en quelques mots..." />
              </div>
            </div>
          )}

          {/* ─── Abonnement ─── */}
          {activeTab === "subscription" && (
            <div className="space-y-6">
              {/* Plan card */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5" style={{ color: "#fbbf24" }} />
                      <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>Votre plan</span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: "#fff" }}>
                      {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                    </p>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {PLAN_PRICES[currentPlan]} / mois
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Tâches restantes</p>
                    <p className="text-3xl font-bold" style={{ color: "#fff" }}>{tasksRemaining}</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>sur {tasksTotal} / mois</p>
                  </div>
                </div>
                <div className="mt-4 bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${(tasksRemaining / tasksTotal) * 100}%` }} />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Calendar className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.6)" }} />
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Renouvellement le {resetDate}</p>
                </div>
              </div>

              {/* Tasks usage */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Zap className="w-4 h-4" style={{ color: "#d97706" }} />
                  Utilisation des tâches
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded-full">
                      <div className="h-3 rounded-full transition-all" style={{
                        width: `${(tasksUsed / tasksTotal) * 100}%`,
                        backgroundColor: getTasksColor(tasksRemaining),
                      }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: getTasksColor(tasksRemaining) }}>
                    {tasksUsed} / {tasksTotal}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-lg font-bold" style={{ color: "#0f172a" }}>8</p>
                    <p className="text-xs" style={{ color: "#64748b" }}>Titres générés</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-lg font-bold" style={{ color: "#0f172a" }}>5</p>
                    <p className="text-xs" style={{ color: "#64748b" }}>Descriptions IA</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-lg font-bold" style={{ color: "#0f172a" }}>3</p>
                    <p className="text-xs" style={{ color: "#64748b" }}>Tags générés</p>
                  </div>
                </div>
              </div>

              {/* Plan comparison */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Changer de plan</h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: "Starter", key: "starter" as const, features: ["1 boutique", "50 tâches/mois", "Support email"] },
                    { name: "Pro", key: "pro" as const, features: ["3 boutiques", "300 tâches/mois", "Support prioritaire", "Automatisations"] },
                    { name: "Scale", key: "scale" as const, features: ["Boutiques illimitées", "1 000 tâches/mois", "Support dédié", "API complète"] },
                  ].map((plan) => {
                    const isCurrent = plan.key === currentPlan;
                    return (
                      <div key={plan.name} className={`rounded-xl border p-4 ${isCurrent ? "border-blue-400 bg-blue-50/50" : "border-gray-200"}`}>
                        <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{plan.name}</p>
                        <p className="text-xl font-bold mt-1" style={{ color: "#0f172a" }}>
                          {PLAN_PRICES[plan.key]}
                          <span className="text-xs font-normal" style={{ color: "#64748b" }}>/mois</span>
                        </p>
                        <ul className="mt-3 space-y-1.5">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-xs" style={{ color: "#64748b" }}>
                              <Check className="w-3 h-3" style={{ color: "#059669" }} /> {f}
                            </li>
                          ))}
                        </ul>
                        <button className={`w-full mt-4 py-2 rounded-lg text-xs font-medium ${isCurrent ? "bg-blue-600" : "bg-gray-100 hover:bg-gray-200"}`}
                          style={{ color: isCurrent ? "#fff" : "#374151" }}>
                          {isCurrent ? "Plan actuel" : "Changer"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── Boutiques connectées ─── */}
          {activeTab === "shops" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "#0f172a" }}>
                      <Store className="w-4 h-4" style={{ color: "#2563eb" }} />
                      Boutiques connectées
                    </h2>
                    <p className="text-xs mt-1" style={{ color: "#64748b" }}>
                      {shops.filter((s) => s.status === "connected").length} boutique{shops.filter((s) => s.status === "connected").length > 1 ? "s" : ""} active{shops.filter((s) => s.status === "connected").length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <button className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium" style={{ color: "#fff" }}>
                    + Ajouter une boutique
                  </button>
                </div>

                <div className="space-y-3">
                  {shops.map((shop) => (
                    <div key={shop.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${shop.status === "connected" ? "bg-emerald-50" : "bg-gray-100"}`}>
                            <Store className="w-5 h-5" style={{ color: shop.status === "connected" ? "#059669" : "#94a3b8" }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{shop.name}</p>
                            <div className="flex items-center gap-2">
                              <a href={`https://${shop.url}`} target="_blank" rel="noopener noreferrer"
                                className="text-xs flex items-center gap-1" style={{ color: "#2563eb" }}>
                                {shop.url} <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-xs" style={{ color: "#64748b" }}>{shop.products} produits</p>
                            <p className="text-xs" style={{ color: "#94a3b8" }}>Synchro : {shop.lastSync}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${shop.status === "connected" ? "bg-emerald-50" : "bg-red-50"}`}
                            style={{ color: shop.status === "connected" ? "#059669" : "#dc2626" }}>
                            {shop.status === "connected" ? "Connectée" : "Déconnectée"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Notifications ─── */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Bell className="w-4 h-4" style={{ color: "#2563eb" }} />
                  E-mails & alertes
                </h2>
                <p className="text-xs mb-5" style={{ color: "#64748b" }}>Choisissez les notifications que vous souhaitez recevoir</p>
                <div className="space-y-0">
                  <ToggleSwitch on={notifEmail} onToggle={() => setNotifEmail(!notifEmail)}
                    label="Notifications par email" desc="Recevoir un résumé des actions sur votre compte" />
                  <ToggleSwitch on={notifStock} onToggle={() => setNotifStock(!notifStock)}
                    label="Alertes stock bas" desc="Quand un produit est presque en rupture" />
                  <ToggleSwitch on={notifPrice} onToggle={() => setNotifPrice(!notifPrice)}
                    label="Alertes de prix" desc="Quand un concurrent change ses prix" />
                  <ToggleSwitch on={notifWeekly} onToggle={() => setNotifWeekly(!notifWeekly)}
                    label="Rapport hebdomadaire" desc="Résumé de votre activité chaque lundi" />
                  <ToggleSwitch on={notifAutomation} onToggle={() => setNotifAutomation(!notifAutomation)}
                    label="Automatisations" desc="Quand une règle automatique s'exécute" />
                  <ToggleSwitch on={notifAI} onToggle={() => setNotifAI(!notifAI)}
                    label="Suggestions IA" desc="Nouvelles recommandations pour vos produits" />
                  <ToggleSwitch on={notifSecurity} onToggle={() => setNotifSecurity(!notifSecurity)}
                    label="Alertes de sécurité" desc="Connexions suspectes ou changements de mot de passe" />
                </div>
              </div>
            </div>
          )}

          {/* ─── Sécurité ─── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Change password */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Lock className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Changer le mot de passe
                </h2>
                <p className="text-xs mb-5" style={{ color: "#64748b" }}>Assurez-vous d&apos;utiliser un mot de passe fort</p>
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Mot de passe actuel</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                      <input type={showPassword ? "text" : "password"} value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                        style={{ color: "#0f172a" }} />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showPassword ? <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} /> : <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nouveau mot de passe</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                      style={{ color: "#0f172a" }} placeholder="8 caractères minimum" />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Confirmer</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none"
                      style={{ color: "#0f172a" }} />
                  </div>
                  <button onClick={() => { addToast("Mot de passe mis à jour", "success"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
                    disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium"
                    style={{ color: "#fff" }}>
                    Mettre à jour
                  </button>
                </div>
              </div>

              {/* 2FA */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Shield className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Authentification à deux facteurs
                </h2>
                <p className="text-xs mb-4" style={{ color: "#64748b" }}>Ajoutez une couche de sécurité supplémentaire</p>
                <ToggleSwitch on={twoFA} onToggle={() => { setTwoFA(!twoFA); addToast(twoFA ? "2FA désactivée" : "2FA activée", "success"); }}
                  label="Activer la double authentification" desc="Recevez un code par SMS ou email à chaque connexion" />
              </div>

              {/* Active sessions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Globe className="w-4 h-4" style={{ color: "#2563eb" }} />
                  Sessions actives
                </h2>
                <div className="space-y-3">
                  {sessions.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>
                          {s.device} {s.current && <span className="text-xs px-2 py-0.5 bg-emerald-100 rounded ml-2" style={{ color: "#059669" }}>Session actuelle</span>}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{s.location} — {s.date}</p>
                      </div>
                      {!s.current && (
                        <button className="text-xs font-medium px-3 py-1.5 hover:bg-red-50 rounded-lg" style={{ color: "#dc2626" }}>
                          Déconnecter
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="bg-white rounded-xl border border-red-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
                  <h2 className="text-base font-semibold" style={{ color: "#ef4444" }}>Zone de danger</h2>
                </div>
                <p className="text-xs mb-4" style={{ color: "#64748b" }}>Ces actions sont irréversibles</p>
                <div className="flex gap-3">
                  <button className="px-4 py-2 border border-red-300 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                    style={{ color: "#ef4444" }}>
                    <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Réinitialiser les données</span>
                  </button>
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#fff" }} />
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
