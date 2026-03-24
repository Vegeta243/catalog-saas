'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard, Users, CreditCard, BarChart3, Shield, Zap, Settings, DollarSign, FileSearch, ScrollText, Scale, LifeBuoy, ToggleLeft, Lock, Bot, SlidersHorizontal, Mail, LineChart, Eye, Search, Download, Wand2 } from 'lucide-react'

const adminNav = [
  { href: '/admin',                    label: "📊 Vue d'ensemble",    icon: LayoutDashboard },
  { href: '/admin/users',              label: '👥 Utilisateurs',      icon: Users },
  { href: '/admin/subscriptions',      label: '💳 Abonnements',       icon: CreditCard },
  { href: '/admin/revenue',            label: '💰 Revenus',           icon: DollarSign },
  { href: '/admin/analytics',          label: '📈 Analytics',         icon: LineChart },
  { href: '/admin/features',           label: '🚩 Feature Flags',     icon: ToggleLeft },
  { href: '/admin/security',           label: '🔒 Sécurité',          icon: Lock },
  { href: '/admin/chatbot',            label: '🤖 Chatbot',           icon: Bot },
  { href: '/admin/config',             label: '⚙️ Configuration',     icon: SlidersHorizontal },
  { href: '/admin/emails',             label: '✉️ Emails',            icon: Mail },
  { href: '/admin/preview',            label: '👁️ Preview Mode',      icon: Eye },
  { href: '/admin/content-monitoring', label: '🔍 Contenu IA',        icon: FileSearch },
  { href: '/admin/audit',              label: "📋 Journal d'audit",   icon: ScrollText },
  { href: '/admin/support',            label: '🎫 Support tickets',   icon: LifeBuoy },
  { href: '/admin/legal',              label: '⚖️ Conformité légale', icon: Scale },
  { href: '/admin/system',             label: '🛠️ Système',           icon: Settings },
]

const ADMIN_FEATURE_LINKS = [
  { href: '/dashboard/recherche-ia',      label: 'Recherche produits IA', icon: Search },
  { href: '/dashboard/import',            label: 'Import produits',        icon: Download },
  { href: '/dashboard/creation-boutique', label: 'Créer boutique IA',      icon: Wand2 },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#1c1917' }}>
      <div className="flex items-center gap-3 px-5 h-16 border-b flex-shrink-0" style={{ borderColor: 'rgba(127,29,29,0.3)' }}>
        <img src="/logo-icon.svg" alt="EcomPilot Elite" className="w-8 h-8" style={{ filter: 'brightness(0) invert(1)' }} />
        <span className="text-lg font-bold tracking-tight" style={{ color: '#fff' }}>Admin</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {adminNav.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
              style={{ color: '#d6d3d1' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#a8a29e' }} />
              {item.label}
            </Link>
          )
        })}

        <div className="pt-3 pb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-3" style={{ color: '#7f1d1d' }}>
            🧪 Fonctionnalités avancées
          </p>
        </div>
        {ADMIN_FEATURE_LINKS.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-red-950/40 transition-colors border border-transparent hover:border-red-900/40"
              style={{ color: '#fca5a5' }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: '#f87171' }} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4 border-t pt-4 flex-shrink-0" style={{ borderColor: 'rgba(127,29,29,0.3)' }}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
          style={{ color: '#93c5fd' }}
        >
          <Zap className="w-4 h-4 flex-shrink-0" style={{ color: '#60a5fa' }} />
          ← Dashboard
        </Link>
      </div>
    </div>
  )
}

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-50 md:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg text-stone-400 hover:text-white"
          aria-label="Fermer menu"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-stone-200 md:hidden bg-white">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Ouvrir menu"
          >
            <Menu className="w-5 h-5 text-stone-600" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-icon.svg" alt="EcomPilot Elite" className="w-6 h-6" />
            <span className="font-bold text-stone-800 text-sm">Admin</span>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
