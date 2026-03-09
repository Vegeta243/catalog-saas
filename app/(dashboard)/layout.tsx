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
  Search,
  Zap,
  User,
  Download,
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
} from 'lucide-react';
import { getTasksColor, PLAN_TASKS } from '@/lib/credits';

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
      { href: '/dashboard/concurrence', label: 'Concurrence', icon: Eye },
    ],
  },
  {
    label: "IMPORT",
    items: [
      { href: '/dashboard/import', label: 'Import produits', icon: Download },
    ],
  },
];

const BOTTOM_ITEMS = [
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
          const p = data.plan || "free";
          setPlan(p);
          setTasksUsed(data.actions_used || 0);
          if (data.actions_limit) {
            setTasksTotalOverride(data.actions_limit);
          }
        }
      } catch { /* silent — Supabase may not be configured locally */ }
    };
    fetchUserProfile();
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
    <div className="flex min-h-screen bg-[#e8f0f8] dark:bg-[#060d1c] overflow-x-hidden">
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
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'} h-16 border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors flex-1`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-sm">E</span>
                </div>
                <div>
                  <span className="text-white font-bold text-base leading-none">EcomPilot</span>
                  <span className="block text-blue-400 text-xs font-semibold tracking-widest">ELITE</span>
                </div>
              </div>
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-3" style={{ color: '#475569' }}>
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
                            {item.href === '/dashboard/concurrence' && (
                              <span className="ml-auto text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-semibold">
                                Bientôt
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
              <p className="text-[10px] font-semibold uppercase tracking-widest px-3" style={{ color: '#475569' }}>COMPTE</p>
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

        {/* Tasks counter + plan */}
        {!sidebarCollapsed && (
          <>
          <div className="mx-3 mb-3 p-3 rounded-xl bg-gray-900 border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-300">Tâches ce mois</span>
              <span className={`text-xs font-bold ${
                tasksRemaining <= 5 ? 'text-red-400' :
                tasksRemaining <= 10 ? 'text-orange-400' : 'text-green-400'
              }`}>
                {tasksRemaining} / {tasksTotal}
              </span>
            </div>

            <div className="w-full bg-gray-800 rounded-full h-1.5 mb-2">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  tasksRemaining <= 5 ? 'bg-red-500' :
                  tasksRemaining <= 10 ? 'bg-orange-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.max(2, Math.min(100, (tasksUsed / Math.max(tasksTotal, 1)) * 100))}%` }}
              />
            </div>

            <p className="text-xs text-gray-600">
              {tasksUsed} utilisées · renouvellement le 1er
            </p>
          </div>

          {(plan === 'free' || plan === 'starter') && (
            <div className="mx-3 mb-3 p-3 rounded-lg border" style={{ backgroundColor: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.3)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: '#a5b4fc' }}>🚀 Passez au plan Pro</p>
              <p className="text-[10px] leading-relaxed mb-2" style={{ color: '#94a3b8' }}>
                Débloquez 20 000 actions IA, 3 boutiques et le support prioritaire.
              </p>
              <a href="/dashboard/billing"
                className="block w-full text-center py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: '#6366f1', color: '#fff' }}>
                Voir les offres →
              </a>
            </div>
          )}
          </>
        )}

        {/* Bottom user area */}
        <div className="border-t border-slate-700/50 p-3">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-2'} py-2`}>
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" style={{ color: '#ffffff' }} />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>{userName}</p>
                <p className="text-xs truncate" style={{ color: '#64748b' }}>{userEmail || "Chargement…"}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2.5 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-all w-full mt-1`}
            title={sidebarCollapsed ? 'Déconnexion' : undefined}
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" style={{ color: '#f87171' }} />
            {!sidebarCollapsed && <span style={{ color: '#f87171' }}>Déconnexion</span>}
          </button>
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
        <footer className="border-t border-gray-200 dark:border-[#18304a] bg-white dark:bg-[#0b1827] px-6 py-3 flex items-center justify-between">
          <p className="text-xs" style={{ color: '#94a3b8' }}>© 2026 EcomPilot. Tous droits réservés.</p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>v6.0.0</p>
        </footer>
      </div>
    </div>
  );
}