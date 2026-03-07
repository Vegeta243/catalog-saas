"use client";

import { useState, useEffect, useCallback } from "react";
import {
  User, CreditCard, Store, Bell, Shield, Save, Check,
  Mail, Phone, Globe, Eye, EyeOff,
  RefreshCw, Lock, Key, Trash2, Crown, Zap,
  ExternalLink, Calendar, AlertTriangle, Loader2,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { PLAN_TASKS, PLAN_PRICES, getTasksColor, getResetDate } from "@/lib/credits";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Tab = "profile" | "subscription" | "shops" | "notifications" | "security";

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  timezone: string;
  avatar_url: string;
  plan: string;
  subscription_status: string;
  actions_used: number;
  actions_limit: number;
  notif_email: boolean;
  notif_stock_alert: boolean;
  notif_price_alert: boolean;
  notif_weekly_report: boolean;
  notif_security: boolean;
  created_at: string;
}

interface Shop {
  id: string;
  shop_domain: string;
  shop_name: string;
  is_active: boolean;
  products_count: number;
  last_sync_at: string | null;
}

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
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Europe/Paris");

  const currentPlan = profile?.plan || "free";
  const tasksUsed = profile?.actions_used || 0;
  const tasksTotal = profile?.actions_limit || PLAN_TASKS[currentPlan] || 50;
  const tasksRemaining = Math.max(0, tasksTotal - tasksUsed);
  const resetDate = getResetDate();

  const [shops, setShops] = useState<Shop[]>([]);

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifStock, setNotifStock] = useState(true);
  const [notifSyncErrors, setNotifSyncErrors] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifSecurity, setNotifSecurity] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Fetch user data from Supabase ───
  const fetchData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userData) {
        const u = userData as UserProfile;
        setProfile(u);
        setFullName([u.first_name, u.last_name].filter(Boolean).join(" ") || user.email?.split("@")[0] || "");
        setEmail(u.email || user.email || "");
        setPhone(u.phone || "");
        setTimezone(u.timezone || "Europe/Paris");
        setNotifEmail(u.notif_email ?? true);
        setNotifStock(u.notif_stock_alert ?? true);
        setNotifSyncErrors(u.notif_price_alert ?? false);
        setNotifWeekly(u.notif_weekly_report ?? true);
        setNotifSecurity(u.notif_security ?? true);
      }

      const { data: shopsData } = await supabase
        .from("shops")
        .select("id, shop_domain, shop_name, is_active, products_count, last_sync_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setShops((shopsData || []) as Shop[]);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Save profile ───
  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const nameParts = fullName.trim().split(" ");
      const { error } = await supabase
        .from("users")
        .update({
          first_name: nameParts[0] || "",
          last_name: nameParts.slice(1).join(" ") || null,
          phone: phone || null,
          timezone,
          notif_email: notifEmail,
          notif_stock_alert: notifStock,
          notif_price_alert: notifSyncErrors,
          notif_weekly_report: notifWeekly,
          notif_security: notifSecurity,
        })
        .eq("id", profile.id);
      if (error) throw error;
      addToast("Modifications sauvegardées", "success");
    } catch {
      addToast("Erreur lors de la sauvegarde", "error");
    }
    setSaving(false);
  };

  // ─── Change password ───
  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) return;
    if (newPassword.length < 6) { addToast("6 caractères minimum", "error"); return; }
    setPasswordLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      addToast("Mot de passe mis à jour", "success");
      setNewPassword(""); setConfirmPassword("");
    } catch { addToast("Erreur lors du changement", "error"); }
    setPasswordLoading(false);
  };

  // ─── Delete account ───
  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== email) { addToast("L'email ne correspond pas", "error"); return; }
    setDeleteLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ data: { delete_requested: true } });
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = "/?deleted=1";
    } catch { addToast("Erreur lors de la suppression — contactez le support", "error"); setDeleteLoading(false); setDeleteStep(0); }
  };

  const initials = fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

  const formatDate = (d: string | null) => {
    if (!d) return "Jamais";
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`;
    return new Date(d).toLocaleDateString("fr-FR");
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

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2563eb" }} /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: "#0f172a" }}>Mon compte</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Gérez votre profil, abonnement et sécurité</p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors self-start sm:self-auto">
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Save className="w-4 h-4" style={{ color: "#fff" }} />}
          <span style={{ color: "#fff" }}>Sauvegarder</span>
        </button>
      </div>

      {/* Mobile: horizontal tabs scroll | Desktop: vertical sidebar */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
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
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          {/* ─── Profil ─── */}
          {activeTab === "profile" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                <User className="w-4 h-4" style={{ color: "#2563eb" }} /> Informations personnelles
              </h2>
              <p className="text-xs mb-6" style={{ color: "#64748b" }}>Gérez votre profil et vos coordonnées</p>

              <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: "#2563eb" }}>{initials}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{fullName}</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>{email}</p>
                  <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                    Membre depuis {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long" }) : "—"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" style={{ color: "#0f172a" }} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="email" value={email} disabled className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 cursor-not-allowed" style={{ color: "#64748b" }} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" style={{ color: "#0f172a" }}
                      placeholder="+33 6 00 00 00 00" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Fuseau horaire</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:border-blue-400 outline-none" style={{ color: "#0f172a" }}>
                      <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                      <option value="America/New_York">America/New York (GMT-5)</option>
                      <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Abonnement ─── */}
          {activeTab === "subscription" && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5" style={{ color: "#fbbf24" }} />
                      <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>Votre plan</span>
                    </div>
                    <p className="text-2xl font-bold" style={{ color: "#fff" }}>
                      {currentPlan === "free" ? "Gratuit" : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
                    </p>
                    <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                      {currentPlan === "free" ? "50 actions gratuites" : `${PLAN_PRICES[currentPlan]} / mois`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Actions restantes</p>
                    <p className="text-3xl font-bold" style={{ color: "#fff" }}>{tasksRemaining}</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>sur {tasksTotal}</p>
                  </div>
                </div>
                <div className="mt-4 bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${Math.max(0, (tasksRemaining / tasksTotal) * 100)}%` }} />
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Calendar className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.6)" }} />
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Renouvellement le {resetDate}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Zap className="w-4 h-4" style={{ color: "#d97706" }} /> Utilisation des actions
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="h-3 bg-gray-100 rounded-full">
                      <div className="h-3 rounded-full transition-all" style={{
                        width: `${Math.min(100, (tasksUsed / tasksTotal) * 100)}%`,
                        backgroundColor: getTasksColor(tasksRemaining),
                      }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold" style={{ color: getTasksColor(tasksRemaining) }}>{tasksUsed} / {tasksTotal}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Changer de plan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {([
                    { name: "Starter", key: "starter" as const, features: ["1 boutique", "1 000 actions/mois", "Support email"] },
                    { name: "Pro", key: "pro" as const, features: ["3 boutiques", "20 000 actions/mois", "Support prioritaire"] },
                    { name: "Scale", key: "scale" as const, features: ["Boutiques illimitées", "100 000 actions/mois", "Support dédié"] },
                  ]).map((p) => {
                    const isCurrent = p.key === currentPlan;
                    return (
                      <div key={p.name} className={`rounded-xl border p-4 ${isCurrent ? "border-blue-400 bg-blue-50/50" : "border-gray-200"}`}>
                        <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{p.name}</p>
                        <p className="text-xl font-bold mt-1" style={{ color: "#0f172a" }}>{PLAN_PRICES[p.key]}<span className="text-xs font-normal" style={{ color: "#64748b" }}>/mois</span></p>
                        <ul className="mt-3 space-y-1.5">
                          {p.features.map((f) => (<li key={f} className="flex items-center gap-1.5 text-xs" style={{ color: "#64748b" }}><Check className="w-3 h-3" style={{ color: "#059669" }} /> {f}</li>))}
                        </ul>
                        {isCurrent ? (
                          <div className="w-full mt-4 py-2 rounded-lg text-xs font-medium text-center bg-blue-600" style={{ color: "#fff" }}>Plan actuel</div>
                        ) : (
                          <Link href="/dashboard/upgrade" className="block w-full mt-4 py-2 rounded-lg text-xs font-medium text-center bg-gray-100 hover:bg-gray-200" style={{ color: "#374151" }}>Changer</Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── Boutiques ─── */}
          {activeTab === "shops" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold flex items-center gap-2" style={{ color: "#0f172a" }}>
                    <Store className="w-4 h-4" style={{ color: "#2563eb" }} /> Boutiques connectées
                  </h2>
                  <p className="text-xs mt-1" style={{ color: "#64748b" }}>{shops.filter((s) => s.is_active).length} active{shops.filter((s) => s.is_active).length !== 1 ? "s" : ""}</p>
                </div>
                <Link href="/dashboard/shops" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium" style={{ color: "#fff" }}>+ Ajouter</Link>
              </div>
              {shops.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="w-10 h-10 mx-auto mb-3" style={{ color: "#d1d5db" }} />
                  <p className="text-sm" style={{ color: "#64748b" }}>Aucune boutique connectée</p>
                  <Link href="/dashboard/shops" className="inline-block mt-4 px-4 py-2 bg-blue-600 rounded-lg text-xs font-medium" style={{ color: "#fff" }}>Connecter ma boutique</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {shops.map((shop) => (
                    <div key={shop.id} className="p-4 border border-gray-200 rounded-lg">
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
                          <div className="text-right">
                            <p className="text-xs" style={{ color: "#64748b" }}>{shop.products_count || 0} produits</p>
                            <p className="text-xs" style={{ color: "#94a3b8" }}>Synchro : {formatDate(shop.last_sync_at)}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${shop.is_active ? "bg-emerald-50" : "bg-red-50"}`}
                            style={{ color: shop.is_active ? "#059669" : "#dc2626" }}>
                            {shop.is_active ? "Connectée" : "Déconnectée"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Notifications ─── */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                <Bell className="w-4 h-4" style={{ color: "#2563eb" }} /> E-mails & alertes
              </h2>
              <p className="text-xs mb-5" style={{ color: "#64748b" }}>Choisissez les notifications à recevoir</p>
              <ToggleSwitch on={notifEmail} onToggle={() => setNotifEmail(!notifEmail)} label="Notifications par email" desc="Résumé des actions sur votre compte" />
              <ToggleSwitch on={notifStock} onToggle={() => setNotifStock(!notifStock)} label="Alertes stock bas" desc="Quand un produit est presque en rupture" />
              <ToggleSwitch on={notifSyncErrors} onToggle={() => setNotifSyncErrors(!notifSyncErrors)} label="Erreurs de synchronisation" desc="Quand la sync Shopify échoue" />
              <ToggleSwitch on={notifWeekly} onToggle={() => setNotifWeekly(!notifWeekly)} label="Rapport hebdomadaire" desc="Résumé chaque lundi" />
              <ToggleSwitch on={notifSecurity} onToggle={() => setNotifSecurity(!notifSecurity)} label="Alertes de sécurité" desc="Connexions suspectes" />
              <p className="text-xs mt-4" style={{ color: "#94a3b8" }}>Cliquez sur &quot;Sauvegarder&quot; pour enregistrer vos préférences</p>
            </div>
          )}

          {/* ─── Sécurité ─── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Session info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Shield className="w-4 h-4" style={{ color: "#2563eb" }} /> Session actuelle
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Navigateur actuel</p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>Session authentifiée via Supabase</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-emerald-100 rounded-full font-medium" style={{ color: "#059669" }}>Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Dernière connexion</p>
                      <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("fr-FR", { dateStyle: "medium" }) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold mb-1 flex items-center gap-2" style={{ color: "#0f172a" }}>
                  <Lock className="w-4 h-4" style={{ color: "#2563eb" }} /> Changer le mot de passe
                </h2>
                <p className="text-xs mb-5" style={{ color: "#64748b" }}>Utilisez un mot de passe fort</p>
                <div className="space-y-3 max-w-md">
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nouveau mot de passe</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                      <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" style={{ color: "#0f172a" }} placeholder="6 caractères minimum" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showPassword ? <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} /> : <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Confirmer</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                      <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" style={{ color: "#0f172a" }} />
                      <button onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} /> : <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                      </button>
                    </div>
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs" style={{ color: "#dc2626" }}>Les mots de passe ne correspondent pas</p>
                  )}
                  <button onClick={handleChangePassword} disabled={!newPassword || newPassword !== confirmPassword || passwordLoading}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2" style={{ color: "#fff" }}>
                    {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />} Mettre à jour
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-red-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
                  <h2 className="text-base font-semibold" style={{ color: "#ef4444" }}>Zone de danger</h2>
                </div>
                <p className="text-xs mb-4" style={{ color: "#64748b" }}>La suppression du compte est irréversible. Toutes vos données seront effacées.</p>
                {deleteStep === 0 && (
                  <button onClick={() => setDeleteStep(1)} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "#fff" }} /><span style={{ color: "#fff" }}>Supprimer le compte</span>
                  </button>
                )}
                {deleteStep === 1 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium" style={{ color: "#dc2626" }}>⚠️ Cette action supprimera définitivement votre compte, toutes vos boutiques connectées et vos données.</p>
                    <p className="text-xs" style={{ color: "#64748b" }}>Saisissez votre email <strong>{email}</strong> pour confirmer :</p>
                    <input type="email" value={deleteConfirmEmail} onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                      placeholder={email} className="w-full px-3 py-2.5 border border-red-300 rounded-lg text-sm" style={{ color: "#0f172a" }} />
                    <div className="flex gap-2">
                      <button onClick={() => { setDeleteStep(0); setDeleteConfirmEmail(""); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium" style={{ color: "#374151" }}>Annuler</button>
                      <button onClick={handleDeleteAccount} disabled={deleteConfirmEmail !== email || deleteLoading}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-1.5">
                        {deleteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#fff" }} />}
                        <span style={{ color: "#fff" }}>Confirmer la suppression</span>
                      </button>
                    </div>
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
