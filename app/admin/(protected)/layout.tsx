import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  LayoutDashboard, Users, CreditCard, BarChart3,
  Shield, Zap, Settings, DollarSign, FileSearch, ScrollText, Scale
} from "lucide-react";
import { verifyAdminSession } from "@/lib/admin-security";

const adminNav = [
  { href: "/admin", label: "📊 Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/users", label: "👥 Utilisateurs", icon: Users },
  { href: "/admin/subscriptions", label: "💳 Abonnements", icon: CreditCard },
  { href: "/admin/revenue", label: "💰 Revenus", icon: DollarSign },
  { href: "/admin/stats", label: "📈 Analytics", icon: BarChart3 },
  { href: "/admin/content-monitoring", label: "🔍 Contenu IA", icon: FileSearch },
  { href: "/admin/audit", label: "📋 Journal d'audit", icon: ScrollText },
  { href: "/admin/legal", label: "⚖️ Conformité légale", icon: Scale },
  { href: "/admin/system", label: "⚙️ Système", icon: Settings },
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
