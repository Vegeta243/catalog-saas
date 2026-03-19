import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  LayoutDashboard, Users, CreditCard, BarChart3,
  Shield, Zap, Settings, DollarSign, FileSearch, ScrollText, Scale, LifeBuoy,
  ToggleLeft, Lock, Bot, SlidersHorizontal, Mail, LineChart, Eye,
  Search, Download, Wand2,
} from "lucide-react";
import { verifyAdminSession } from "@/lib/admin-security";

const adminNav = [
  { href: "/admin",                  label: "📊 Vue d'ensemble",    icon: LayoutDashboard },
  { href: "/admin/users",            label: "👥 Utilisateurs",      icon: Users },
  { href: "/admin/subscriptions",    label: "💳 Abonnements",       icon: CreditCard },
  { href: "/admin/revenue",          label: "💰 Revenus",           icon: DollarSign },
  { href: "/admin/analytics",        label: "📈 Analytics",         icon: LineChart },
  { href: "/admin/features",         label: "🚩 Feature Flags",     icon: ToggleLeft },
  { href: "/admin/security",         label: "🔒 Sécurité",          icon: Lock },
  { href: "/admin/chatbot",          label: "🤖 Chatbot",           icon: Bot },
  { href: "/admin/config",           label: "⚙️ Configuration",     icon: SlidersHorizontal },
  { href: "/admin/emails",           label: "✉️ Emails",            icon: Mail },
  { href: "/admin/preview",          label: "👁️ Preview Mode",      icon: Eye },
  { href: "/admin/content-monitoring", label: "🔍 Contenu IA",      icon: FileSearch },
  { href: "/admin/audit",            label: "📋 Journal d'audit",   icon: ScrollText },
  { href: "/admin/support",          label: "🎫 Support tickets",   icon: LifeBuoy },
  { href: "/admin/legal",            label: "⚖️ Conformité légale", icon: Scale },
  { href: "/admin/system",           label: "🛠️ Système",           icon: Settings },
];

const ADMIN_FEATURE_LINKS = [
  { href: "/dashboard/recherche-ia",      label: "Recherche produits IA",   icon: Search },
  { href: "/dashboard/import",            label: "Import produits",          icon: Download },
  { href: "/dashboard/creation-boutique", label: "Créer boutique IA",        icon: Wand2 },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");

  if (!adminSession?.value) {
    redirect("/admin/login");
  }

  const session = verifyAdminSession(adminSession.value);
  if (!session.valid) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8fafc" }}>
      <aside className="w-64 flex flex-col flex-shrink-0" style={{ backgroundColor: "#1c1917" }}>
        <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: "rgba(127,29,29,0.3)" }}>
          <img src="/logo-icon.svg" alt="EcomPilot Elite" className="w-8 h-8" style={{ filter: 'brightness(0) invert(1)' }} />
          <span className="text-lg font-bold tracking-tight" style={{ color: "#fff" }}>Admin</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
                style={{ color: "#d6d3d1" }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#a8a29e" }} />
                {item.label}
              </Link>
            );
          })}

          {/* 🧪 Fonctionnalités avancées — admin only */}
          <div className="pt-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-3" style={{ color: "#7f1d1d" }}>
              🧪 Fonctionnalités avancées
            </p>
          </div>
          {ADMIN_FEATURE_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-red-950/40 transition-colors border border-transparent hover:border-red-900/40"
                style={{ color: "#fca5a5" }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: "#f87171" }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: "rgba(127,29,29,0.3)" }}>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
            style={{ color: "#93c5fd" }}
          >
            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "#60a5fa" }} />
            ← Dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
