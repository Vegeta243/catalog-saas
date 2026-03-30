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
  MessageSquare,
  BookOpen,
  Smartphone,
} from 'lucide-react';
import { getTasksColor, PLAN_TASKS } from '@/lib/credits';
import AIChatWidget from '@/components/ai-chat-widget';
import { PreviewBanner } from '@/components/preview-banner';
import { UserProvider } from '@/lib/contexts/UserContext';
import { OnboardingTour, TourLauncher } from '@/components/onboarding-tour';
import { OnboardingModal } from '@/components/onboarding-modal';
import { ActionsCounter } from '@/components/actions-counter';
import { ActionsLimitModal } from '@/components/actions-limit-modal';

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
  {
    label: "ASSISTANCE",
    items: [
      { href: '/dashboard/help', label: "Centre d'aide", icon: HelpCircle },
      { href: '/dashboard/faq', label: 'FAQ', icon: BookOpen },
      { href: '/dashboard/contact', label: 'Nous contacter', icon: MessageSquare },
    ],
  },
];

const BOTTOM_ITEMS = [
  { href: '/dashboard/parrainage', label: 'Parrainer → -20% par mois', icon: Gift },
  { href: '/download', label: 'Télécharger l\'app', icon: Smartphone },
  { href: '/dashboard/account', label: 'Mon compte', icon: User },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

const styles = {
  sidebar: {
    width: '280px',
    background: 'var(--surface-primary)',
    borderRight: '1px solid var(--apple-gray-200)',
    height: '100vh',
    position: 'sticky' as const,
    top: 0,
    overflowY: 'auto' as const,
    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    zIndex: 100,
  },
  sidebarCollapsed: {
    width: '80px',
  },
  sidebarHeader: {
    padding: '24px 20px',
    borderBottom: '1px solid var(--apple-gray-200)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: '20px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, var(--apple-blue) 0%, var(--apple-blue-light) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textDecoration: 'none',
  },
  navSection: {
    padding: '20px 12px',
  },
  navLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '12px',
    paddingLeft: '12px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    marginBottom: '4px',
    cursor: 'pointer',
  },
  navItemActive: {
    background: 'var(--apple-gray-50)',
    color: 'var(--apple-blue)',
  },
  navItemHover: {
    background: 'var(--apple-gray-50)',
  },
  bottomSection: {
    padding: '20px 12px',
    borderTop: '1px solid var(--apple-gray-200)',
    marginTop: 'auto',
  },
  main: {
    flex: 1,
    background: 'var(--surface-primary)',
    minHeight: '100vh',
    overflowX: 'hidden' as const,
  },
  topbar: {
    height: '64px',
    background: 'var(--surface-primary)',
    borderBottom: '1px solid var(--apple-gray-200)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 clamp(12px, 4vw, 32px)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 99,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  progressBar: {
    height: '4px',
    background: 'var(--apple-gray-100)',
    borderRadius: '9999px',
    overflow: 'hidden',
    marginTop: '12px',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--apple-blue) 0%, var(--apple-blue-light) 100%)',
    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [plan, setPlan] = useState("free");
  const [tasksUsed, setTasksUsed] = useState(0);
  const [tasksTotalOverride, setTasksTotalOverride] = useState<number | null>(null);
  const [userName, setUserName] = useState("Mon compte");
  const [userEmail, setUserEmail] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);

  const tasksTotal = tasksTotalOverride ?? (PLAN_TASKS[plan] || PLAN_TASKS.free || 100);
  const tasksRemaining = Math.max(0, tasksTotal - tasksUsed);
  const tasksColor = getTasksColor(tasksRemaining);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserEmail(user.email || "");
        const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || "Mon compte";
        setUserName(firstName);

        const { data: profile } = await supabase
          .from('users')
          .select('plan, actions_used, actions_limit')
          .eq('id', user.id)
          .single();

        if (profile) {
          setPlan(profile.plan || 'free');
          setTasksUsed(profile.actions_used || 0);
          if (profile.actions_limit) setTasksTotalOverride(profile.actions_limit);
          // Show quota modal if free plan and quota exceeded
          if ((profile.plan === 'free' || !profile.plan) && profile.actions_used >= (profile.actions_limit || 100)) {
            setShowLimitModal(true);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    if (showNotifPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifPanel]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const LOCKED_WITH_PLAN: Record<string, string> = {
    '/dashboard/calendrier': 'Starter+',
    '/dashboard/automation': 'Starter+',
    '/dashboard/concurrence': 'Pro+',
  };

  return (
    <UserProvider>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--surface-primary)' }}>
        {/* Sidebar */}
        <aside style={{ ...styles.sidebar, ...(sidebarCollapsed ? styles.sidebarCollapsed : {}) }} className="hidden lg:block">
          <div style={styles.sidebarHeader}>
            <Link href="/dashboard" style={styles.logo}>
              EcomPilot
            </Link>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav>
            {NAV_SECTIONS.map((section, sectionIndex) => (
              <div key={sectionIndex} style={styles.navSection}>
                {!sidebarCollapsed && <div style={styles.navLabel}>{section.label}</div>}
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const requiredPlan = plan === 'free' ? LOCKED_WITH_PLAN[item.href] : undefined;
                  if (requiredPlan) {
                    const badgeColor = requiredPlan === 'Pro+' ? { bg: '#7c3aed', text: '#fff' } : { bg: '#0ea5e9', text: '#fff' };
                    return (
                      <div key={item.href}
                        title={`Disponible à partir du plan ${requiredPlan}`}
                        style={{ ...styles.navItem, opacity: 0.6, cursor: 'not-allowed', userSelect: 'none' as const }}>
                        <Icon className="w-5 h-5" style={{ flexShrink: 0 }} />
                        {!sidebarCollapsed && <span style={{ fontSize: '14px', fontWeight: '500', flex: 1 }}>{item.label}</span>}
                        {!sidebarCollapsed && (
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '9999px', background: badgeColor.bg, color: badgeColor.text, lineHeight: '16px' }}>
                            {requiredPlan}
                          </span>
                        )}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        ...styles.navItem,
                        ...(isActive ? styles.navItemActive : {}),
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--apple-gray-50)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ flexShrink: 0 }} />
                      {!sidebarCollapsed && <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom Section */}
          <div style={styles.bottomSection}>
            {BOTTOM_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    ...styles.navItem,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '12px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    marginBottom: '4px',
                  }}
                >
                  <Icon className="w-5 h-5" style={{ flexShrink: 0 }} />
                  {!sidebarCollapsed && <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.label}</span>}
                </Link>
              );
            })}
            
            <button
              onClick={() => setShowLogoutConfirm(true)}
              style={{
                ...styles.navItem,
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <LogOut className="w-5 h-5" style={{ flexShrink: 0 }} />
              {!sidebarCollapsed && <span style={{ fontSize: '14px', fontWeight: '500' }}>Déconnexion</span>}
            </button>

            {!sidebarCollapsed && (
              <div style={{ marginTop: '8px' }}>
                <TourLauncher />
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div style={styles.main}>
          {/* Topbar */}
          <header style={styles.topbar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  padding: '8px',
                  borderRadius: '8px',
                }}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: '600' }}>
                  {NAV_SECTIONS.flatMap(s => s.items).find(i => i.href === pathname)?.label || 'Dashboard'}
                </h1>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Actions Counter */}
              <div className="hidden sm:block">
                <ActionsCounter />
              </div>

              {/* Tasks Progress */}
              <div className="hidden md:block" style={{ minWidth: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Actions</span>
                  <span style={{ fontWeight: '600', color: tasksColor }}>{tasksRemaining}/{tasksTotal}</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${(tasksRemaining / tasksTotal) * 100}%` }} />
                </div>
              </div>

              {/* Notifications */}
              <div style={{ position: 'relative' }} ref={notifRef}>
                <button
                  onClick={() => setShowNotifPanel(!showNotifPanel)}
                  style={{
                    position: 'relative',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    padding: '8px',
                    borderRadius: '8px',
                  }}
                >
                  <Bell className="w-5 h-5" />
                  {notifications > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '8px',
                      height: '8px',
                      background: '#ef4444',
                      borderRadius: '50%',
                    }} />
                  )}
                </button>
              </div>

              {/* User Menu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="hidden sm:block" style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{userName}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</p>
                </div>
                <Link href="/dashboard/account" style={{ textDecoration: 'none' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--apple-blue) 0%, var(--apple-blue-light) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}>
                  {userName.charAt(0).toUpperCase()}
                </div>
                </Link>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
            {children}
          </main>

          {/* Legal Footer */}
          <footer style={{
            padding: '14px clamp(16px, 4vw, 32px)',
            borderTop: '1px solid var(--apple-gray-200)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
              © {new Date().getFullYear()} EcomPilot Elite
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {[
                { label: 'Mentions légales', href: '/mentions-legales' },
                { label: 'CGV', href: '/cgv' },
                { label: 'Confidentialité', href: '/politique-confidentialite' },
                { label: 'FAQ', href: '/dashboard/faq' },
                { label: 'Contact', href: '/dashboard/contact' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ color: 'var(--text-tertiary)', fontSize: '12px', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </footer>

          {/* AI Chat Widget */}
          <AIChatWidget />
          {/* Onboarding Modal (first login only) */}
          <OnboardingModal />
          {/* Interactive product tour */}
          <OnboardingTour />
          {/* Actions limit modal */}
          <ActionsLimitModal
            show={showLimitModal}
            onClose={() => setShowLimitModal(false)}
            used={tasksUsed}
            limit={tasksTotalOverride ?? (PLAN_TASKS[plan] || 100)}
          />

          {/* Logout Confirmation Modal */}
          {showLogoutConfirm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <div style={{ background: '#ffffff', borderRadius: '14px', padding: '28px', maxWidth: '360px', width: '100%', boxShadow: '0 20px 48px rgba(0,0,0,0.15)', boxSizing: 'border-box' }}>
                <p style={{ color: '#0f172a', fontSize: '16px', fontWeight: 700, margin: '0 0 8px' }}>Vous êtes sur le point de vous déconnecter</p>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px', lineHeight: '1.6' }}>Votre session sera fermée. Vous pourrez vous reconnecter à tout moment.</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowLogoutConfirm(false)}
                    style={{ padding: '9px 18px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                    Annuler
                  </button>
                  <button onClick={handleLogout}
                    style={{ padding: '9px 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Se déconnecter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden" style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
          }} onClick={() => setMobileMenuOpen(false)}>
            <div style={{
              width: '280px',
              background: 'var(--surface-primary)',
              height: '100%',
              padding: '20px',
              overflowY: 'auto',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <Link href="/dashboard" style={styles.logo}>EcomPilot</Link>
                <button onClick={() => setMobileMenuOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              {NAV_SECTIONS.map((section) => (
                <div key={section.label} style={{ marginBottom: '24px' }}>
                  <div style={styles.navLabel}>{section.label}</div>
                  {section.items.map((item) => {
                    const mobileRequiredPlan = plan === 'free' ? LOCKED_WITH_PLAN[item.href] : undefined;
                    if (mobileRequiredPlan) {
                      const badgeColor = mobileRequiredPlan === 'Pro+' ? { bg: '#7c3aed', text: '#fff' } : { bg: '#0ea5e9', text: '#fff' };
                      return (
                        <div key={item.href}
                          title={`Disponible à partir du plan ${mobileRequiredPlan}`}
                          style={{ ...styles.navItem, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', opacity: 0.6, cursor: 'not-allowed', userSelect: 'none' as const, borderRadius: '12px', marginBottom: '4px' }}>
                          <item.icon className="w-5 h-5" />
                          <span style={{ fontSize: '14px', fontWeight: '500', flex: 1 }}>{item.label}</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '9999px', background: badgeColor.bg, color: badgeColor.text, lineHeight: '16px' }}>
                            {mobileRequiredPlan}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        style={{
                          ...styles.navItem,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          color: pathname === item.href ? 'var(--apple-blue)' : 'var(--text-secondary)',
                          background: pathname === item.href ? 'var(--apple-gray-50)' : 'transparent',
                          borderRadius: '12px',
                          marginBottom: '4px',
                        }}
                      >
                        <item.icon className="w-5 h-5" />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </UserProvider>
  );
}
