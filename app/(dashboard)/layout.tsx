"use client";

import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  PackageSearch,
  Store,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  HelpCircle,
  Bell,
  Zap,
  User,
  Sparkles,
  Clock,
  Crown,
  ImageIcon,
  Coins,
  Menu,
  X,
  CalendarDays,
  Eye,
  ListChecks,
  TrendingUp,
  Gift,
  Search,
} from 'lucide-react';
import { getTasksColor, PLAN_TASKS } from '@/lib/credits';
import AIChatWidget from '@/components/ai-chat-widget';
import { PreviewBanner } from '@/components/preview-banner';
import { UserProvider } from '@/lib/contexts/UserContext';

const NAV_SECTIONS = [
  {
    label: "PRINCIPAL",
    items: [
      { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/dashboard/shops', label: 'Mes boutiques', icon: Store },
      { href: '/dashboard/credits', label: 'Mon forfait', icon: Coins },
      { href: '/dashboard/history', label: 'Historique', icon: Clock },
    ],
  },
  {
    label: "OPTIMISATION",
    items: [
      { href: '/dashboard/products', label: 'Modifier en masse', icon: PackageSearch },
      { href: '/dashboard/ai', label: 'Optimisation IA', icon: Sparkles },
      { href: '/dashboard/images', label: 'Éditeur d\'images', icon: ImageIcon },
    ],
  },
  {
    label: "AUTOMATISATION",
    items: [
      { href: '/dashboard/automation', label: 'Automatisations', icon: Zap },
      { href: '/dashboard/calendrier', label: 'Calendrier', icon: CalendarDays },
      { href: '/dashboard/taches', label: 'Mes tâches', icon: ListChecks },
    ],
  },
  {
    label: "ANALYSE",
    items: [
      { href: '/dashboard/rentabilite', label: 'Rentabilité', icon: TrendingUp },
      { href: '/dashboard/concurrence', label: 'Analyse concurrence', icon: Eye },
    ],
  },
];

const BOTTOM_ITEMS = [
  { href: '/dashboard/parrainage', label: 'Parrainer → -20% par mois', icon: Gift },
  { href: '/dashboard/account', label: 'Mon compte', icon: User },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
  { href: '/dashboard/help', label: "Centre d'aide", icon: HelpCircle },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Real user data from Supabase
  const [plan, setPlan] = useState("free");
  const [tasksUsed, setTasksUsed] = useState(0);
  const [tasksTotalOverride, setTasksTotalOverride] = useState<number | null>(null);
  const [userName, setUserName] = useState("Mon compte");
  const [userEmail, setUserEmail] = useState("");

  const tasksTotal = tasksTotalOverride ?? (PLAN_TASKS[plan] || PLAN_TASKS.free || 30);
  const tasksRemaining = Math.max(0, tasksTotal - tasksUsed);

  // Derive the real plan tier from actions_limit if it exceeds what the plan field says
  const effectivePlan = (() => {
    const effectiveTotal = tasksTotalOverride ?? PLAN_TASKS[plan] ?? 30;
    if (effectiveTotal >= 100000) return "scale";
    if (effectiveTotal >= 20000) return "pro";
    if (effectiveTotal >= 1000) return "starter";
    return plan;
  })();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserEmail(user.email || "");
        const firstName = user.user_metadata?.first_name || user.email?.split("@")[0] || "Mon compte";
        setUserName(firstName);
        const { data } = await supabase
          .from("users")
          .select("plan, actions_used, actions_limit, deleted_at")
          .eq("id", user.id)
          .single();
        if (data) {
          // Redirect soft-deleted users to recovery page
          if (data.deleted_at) {
            router.push("/account-recovery");
            return;
          }
          // Check for admin preview plan (non-httpOnly cookie readable by JS)
          const previewPlan = typeof document !== 'undefined'
            ? document.cookie.split('; ').find(c => c.startsWith('ecompilot_preview='))?.split('=')[1]
            : undefined;
          const p = previewPlan || data.plan || "free";
          setPlan(p);
          setTasksUsed(data.actions_used || 0);
          if (data.actions_limit) {
            setTasksTotalOverride(data.actions_limit);
          }
        }
      } catch { /* silent — Supabase may not be configured locally */ }
    };
    fetchUserProfile();
    const interval = setInterval(fetchUserProfile, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Supabase not configured, just redirect
    }
    router.push('/login');
  };

  return (
    <UserProvider>
    <div className="flex min-h-screen bg-[#e8f0f8] dark:bg-[#060d1c] overflow-x-hidden">
      <PreviewBanner />
      {/* Mobile backdrop overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        ${sidebarCollapsed ? 'md:w-[68px]' : 'md:w-[260px]'}
        w-[260px] bg-[#0f172a] flex flex-col justify-between
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        transition-all duration-300 overflow-y-auto overflow-x-hidden shrink-0
      `}>
        {/* Logo — links to landing page */}
        <div>
          <div className="flex items-center justify-between">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'} h-16 border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors flex-1`}>
              {sidebarCollapsed ? (
                <img src="/logo-icon.svg" alt="" className="w-9 h-9 flex-shrink-0" style={{ filter: 'brightness(0) invert(1)' }} />
              ) : (
                <img src="/logo-white.svg" alt="EcomPilot Elite" className="h-9 w-auto" style={{ maxWidth: '170px' }} />
              )}
            </Link>
            {/* Close button mobile only */}
            <button
              className="md:hidden p-3 text-slate-400 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className={`${sidebarCollapsed ? 'px-2' : 'px-3'} pt-3 space-y-4`}>
            {NAV_SECTIONS.map((section) => (
              <div key={section.label}>
                {!sidebarCollapsed && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-3" style={{ color: '#94a3b8' }}>
                    {section.label}
                  </p>
                )}
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                    const isExactDashboard = item.href === '/dashboard' && pathname === '/dashboard';
                    const active = isActive || isExactDashboard;
                    const Icon = item.icon;
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-lg text-[13px] font-medium transition-all ${
                          active
                            ? 'bg-blue-600/20 border border-blue-500/30'
                            : 'hover:bg-slate-700/50 border border-transparent'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className="w-[17px] h-[17px] flex-shrink-0" style={{ color: active ? '#60a5fa' : '#94a3b8' }} />
                        {!sidebarCollapsed && (
                          <>
                            <span style={{ color: active ? '#f1f5f9' : '#cbd5e1' }}>{item.label}</span>
                            {'badge' in item && item.badge && (
                              <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                item.badge === 'BETA' ? 'bg-purple-900/60 text-purple-300' :
                                item.badge === 'Scale' ? 'bg-amber-900/60 text-amber-300' :
                                'bg-blue-900/60 text-blue-300'
                              }`}>
                                {item.badge as string}
                              </span>
                            )}
                          </>
                        )}
                      </a>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Bottom nav separator */}
          {!sidebarCollapsed && (
            <div className="px-4 pt-5 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest px-3" style={{ color: '#94a3b8' }}>COMPTE</p>
            </div>
          )}
          <nav className={`${sidebarCollapsed ? 'px-2 pt-2' : 'px-3 pt-1'} space-y-0.5`}>
            {BOTTOM_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-lg text-[13px] font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'hover:bg-slate-700/50 border border-transparent'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-[17px] h-[17px] flex-shrink-0" style={{ color: isActive ? '#60a5fa' : '#94a3b8' }} />
                  {!sidebarCollapsed && <span style={{ color: isActive ? '#f1f5f9' : '#cbd5e1' }}>{item.label}</span>}
                </a>
              );
            })}
          </nav>
        </div>

        {/* SIDEBAR BOTTOM */}
        <div className="mt-auto">

          {!sidebarCollapsed && (
            <>
            {/* Task counter — dark card, max contrast */}
            <div className="mx-3 mb-3 rounded-2xl overflow-hidden" style={{ background: '#0f172a', border: '1px solid #334155' }}>
              <div className="px-4 pt-4 pb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-bold text-white">Tâches ce mois</span>
                  <span className={`text-sm font-black tabular-nums ${
                    tasksRemaining <= 3 ? 'text-red-400' :
                    tasksRemaining <= 10 ? 'text-blue-300' : 'text-emerald-400'
                  }`}>{tasksRemaining}<span className="text-gray-500 font-normal">/{tasksTotal}</span></span>
                </div>
                {/* Bar */}
                <div className="h-2.5 rounded-full w-full mb-3" style={{ background: '#1e293b' }}>
                  <div className={`h-2.5 rounded-full transition-all duration-700 ${
                    tasksRemaining <= 3 ? 'bg-red-500' :
                    tasksRemaining <= 10 ? 'bg-blue-400' : 'bg-blue-500'
                  }`} style={{ width: `${tasksTotal > 0 ? Math.min(100, Math.max(5, (tasksUsed / tasksTotal) * 100)) : 5}%` }} />
                </div>
                <p className="text-xs" style={{ color: '#94a3b8' }}>
                  <span className="text-white font-semibold">{tasksUsed}</span> utilisées · renouvellement le 1er
                </p>
              </div>
              {/* Cost table */}
              <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid #1e293b' }}>
                {([
                  ['✨', 'Titre IA', '1 tâche', false],
                  ['📝', 'Description IA', '3 tâches', false],
                  ['🖼️', 'Image', '1 tâche', false],
                  ['✏️', 'Bulk edit', 'Gratuit', true],
                ] as [string, string, string, boolean][]).map(([icon, label, cost, free]) => (
                  <div key={label} className="flex justify-between items-center py-0.5">
                    <span className="text-xs" style={{ color: '#94a3b8' }}>{icon} {label}</span>
                    <span className={`text-xs font-semibold ${free ? 'text-emerald-400' : 'text-slate-300'}`}>{cost}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upsell banner */}
            {effectivePlan === 'free' && (
              <div className="mx-3 mb-3 rounded-2xl p-4 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%)' }}>
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-20" style={{ background: 'white' }} />
                <div className="absolute -bottom-6 -right-2 w-20 h-20 rounded-full opacity-10" style={{ background: 'white' }} />
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-black text-white">🚀 Starter</span>
                    <span className="text-xs font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">29€/mois</span>
                  </div>
                  <p className="text-xs text-blue-200 mb-3 leading-relaxed">
                    1 000 tâches IA · 500 produits<br/>Import AliExpress inclus
                  </p>
                  <a href="/dashboard/account?tab=subscription"
                    className="block text-center text-xs font-black py-2 rounded-xl transition-all hover:scale-105"
                    style={{ background: 'white', color: '#1d4ed8' }}>
                    Débloquer maintenant →
                  </a>
                </div>
              </div>
            )}

            {effectivePlan === 'starter' && (
              <div className="mx-3 mb-3 rounded-2xl p-4 relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)' }}>
                <div className="relative">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm font-black text-white">⚡ Pro</span>
                    <span className="text-xs font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">89€/mois</span>
                  </div>
                  <p className="text-xs text-green-200 mb-3 leading-relaxed">
                    20 000 tâches · 3 boutiques<br/>Webhooks &amp; automatisations avancées
                  </p>
                  <a href="/dashboard/account?tab=subscription"
                    className="block text-center text-xs font-black py-2 rounded-xl transition-all hover:scale-105"
                    style={{ background: 'white', color: '#065f46' }}>
                    Passer au Pro →
                  </a>
                </div>
              </div>
            )}
            </>
          )}

          {/* User row */}
          <div className={`px-3 pb-4 pt-3 flex items-center gap-2.5`} style={{ borderTop: '1px solid #1f2937' }}>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-black">
              {userEmail?.[0]?.toUpperCase() || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{userEmail || 'Chargement…'}</p>
                <p className="text-xs font-medium capitalize" style={{ color: '#60a5fa' }}>{effectivePlan}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all flex-shrink-0"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" style={{ color: '#f87171' }} />
            </button>
          </div>

        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full hidden md:flex items-center justify-center shadow-sm hover:shadow-md"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" style={{ color: '#475569' }} /> : <ChevronLeft className="w-3 h-3" style={{ color: '#475569' }} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden dark:bg-[#060d1c]">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-[#0b1827] dark:border-[#18304a] border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          {/* Hamburger button — mobile only */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors mr-2 flex-shrink-0"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" style={{ color: '#374151' }} />
          </button>
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                style={{ color: '#0f172a' }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-all"
                onClick={() => { setShowNotifPanel((v) => !v); setNotifications(0); }}
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" style={{ color: '#64748b' }} />
                {notifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ color: '#ffffff' }}>
                    {notifications}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#0d1a2e] rounded-xl border border-gray-200 dark:border-[#18304a] shadow-lg z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>Notifications</span>
                    <button onClick={() => setShowNotifPanel(false)} className="text-xs hover:underline" style={{ color: '#64748b' }}>Fermer</button>
                  </div>
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 mx-auto mb-2" style={{ color: '#cbd5e1' }} />
                    <p className="text-sm font-medium" style={{ color: '#0f172a' }}>Aucune notification</p>
                    <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Vous êtes à jour !</p>
                  </div>
                </div>
              )}
            </div>
            <Link href="/dashboard/account" className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer">
              <User className="w-4 h-4" style={{ color: '#ffffff' }} />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 md:p-6 overflow-x-hidden dark:bg-[#060d1c]">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-[#18304a] bg-white dark:bg-[#0b1827] px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs" style={{ color: '#94a3b8' }}>© 2026 EcomPilot. Tous droits réservés.</p>
          <div className="flex items-center gap-4">
            <a href="/mentions-legales" className="text-xs hover:underline" style={{ color: '#94a3b8' }}>Mentions légales</a>
            <a href="/cgv" className="text-xs hover:underline" style={{ color: '#94a3b8' }}>CGV</a>
            <a href="/politique-confidentialite" className="text-xs hover:underline" style={{ color: '#94a3b8' }}>Confidentialité</a>
            <p className="text-xs" style={{ color: '#94a3b8' }}>v6.0.0</p>
          </div>
        </footer>
      </div>

      <AIChatWidget plan={effectivePlan} currentPage={pathname} tasksRemaining={tasksRemaining} tasksTotal={tasksTotal} />
    </div>
    </UserProvider>
  );
}