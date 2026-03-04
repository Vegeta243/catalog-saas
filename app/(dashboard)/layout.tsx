"use client";

import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
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
  const [notifications] = useState(3);

  // Tasks data (would come from context/API in production)
  const plan = "pro";
  const tasksUsed = 16;
  const tasksTotal = PLAN_TASKS[plan] || 300;
  const tasksRemaining = tasksTotal - tasksUsed;

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
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'} bg-[#0f172a] flex flex-col justify-between transition-all duration-300 relative`}>
        {/* Logo — links to landing page */}
        <div>
          <Link href="/" className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'px-5'} h-16 border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Zap className="w-4 h-4" style={{ color: '#ffffff' }} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-lg font-bold tracking-tight" style={{ color: '#ffffff' }}>EcomPilot</span>
              )}
            </div>
          </Link>

          {/* Navigation sections */}
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
                        className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center px-2' : 'px-3'} py-2 rounded-lg text-[13px] font-medium transition-all ${
                          active
                            ? 'bg-blue-600/20 border border-blue-500/30'
                            : 'hover:bg-slate-700/50 border border-transparent'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className="w-[17px] h-[17px] flex-shrink-0" style={{ color: active ? '#60a5fa' : '#94a3b8' }} />
                        {!sidebarCollapsed && (
                          <span style={{ color: active ? '#f1f5f9' : '#cbd5e1' }}>{item.label}</span>
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
          <div className="mx-3 mb-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(96,165,250,0.1)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Crown className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />
                <span className="text-xs font-semibold" style={{ color: '#f1f5f9' }}>Plan {plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
              </div>
              <span className="text-[10px] font-medium" style={{ color: getTasksColor(tasksRemaining) }}>
                {tasksRemaining} tâches
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full mt-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div className="h-1.5 rounded-full transition-all" style={{
                width: `${(tasksRemaining / tasksTotal) * 100}%`,
                backgroundColor: getTasksColor(tasksRemaining),
              }} />
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: '#64748b' }}>{tasksUsed} / {tasksTotal} tâches utilisées</p>
          </div>
        )}

        {/* Bottom user area */}
        <div className="border-t border-slate-700/50 p-3">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-2'} py-2`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" style={{ color: '#ffffff' }} />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#f1f5f9' }}>Utilisateur</p>
                <p className="text-xs truncate" style={{ color: '#64748b' }}>utilisateur@email.com</p>
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

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" style={{ color: '#475569' }} /> : <ChevronLeft className="w-3 h-3" style={{ color: '#475569' }} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
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
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-all">
              <Bell className="w-5 h-5" style={{ color: '#64748b' }} />
              {notifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ color: '#ffffff' }}>
                  {notifications}
                </span>
              )}
            </button>
            <Link href="/dashboard/account" className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center cursor-pointer">
              <User className="w-4 h-4" style={{ color: '#ffffff' }} />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
          <p className="text-xs" style={{ color: '#94a3b8' }}>© 2026 EcomPilot. Tous droits réservés.</p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>v6.0.0</p>
        </footer>
      </div>
    </div>
  );
}