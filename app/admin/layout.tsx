"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  LayoutDashboard, Users, CreditCard, FileText, BarChart3,
  LogOut, ChevronLeft, ChevronRight, Shield, Zap, Settings, Bell, User, Search
} from "lucide-react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

const adminNav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Utilisateurs", icon: Users },
  { href: "/admin/subscriptions", label: "Abonnements", icon: CreditCard },
  { href: "/admin/stats", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/content", label: "Contenu", icon: FileText },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.email !== ADMIN_EMAIL) {
          router.replace("/dashboard");
          return;
        }
        setAuthorized(true);
      } catch {
        router.replace("/dashboard");
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    router.push("/login");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#1c1917" }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-sm" style={{ color: "#78716c" }}>Vérification des droits...</p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#f8fafc" }}>
      {/* Admin Sidebar */}
      <aside className={`${collapsed ? "w-[68px]" : "w-[260px]"} flex flex-col justify-between transition-all duration-300 relative`} style={{ backgroundColor: "#1c1917" }}>
        <div>
          <div className={`flex items-center ${collapsed ? "justify-center px-2" : "px-5"} h-16 border-b`} style={{ borderColor: "rgba(127,29,29,0.3)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
                <Shield className="w-4 h-4" style={{ color: "#fff" }} />
              </div>
              {!collapsed && <span className="text-lg font-bold tracking-tight" style={{ color: "#fff" }}>Admin</span>}
            </div>
          </div>

          {!collapsed && (
            <div className="px-4 pt-5 pb-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#78716c" }}>Administration</p>
            </div>
          )}
          <nav className={`${collapsed ? "px-2 pt-4" : "px-3"} space-y-1`}>
            {adminNav.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-3"} py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "border" : "hover:bg-stone-800 border border-transparent"
                  }`}
                  style={isActive ? { backgroundColor: "rgba(220,38,38,0.15)", borderColor: "rgba(220,38,38,0.3)" } : {}}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" style={{ color: isActive ? "#f87171" : "#a8a29e" }} />
                  {!collapsed && <span style={{ color: isActive ? "#fef2f2" : "#d6d3d1" }}>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className={`${collapsed ? "px-2" : "px-3"} mt-6`}>
            <Link href="/dashboard"
              className={`flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-3"} py-2.5 rounded-lg text-sm font-medium hover:bg-stone-800 transition-all`}
              title={collapsed ? "Retour Dashboard" : undefined}
            >
              <Zap className="w-[18px] h-[18px] flex-shrink-0" style={{ color: "#60a5fa" }} />
              {!collapsed && <span style={{ color: "#93c5fd" }}>← Dashboard utilisateur</span>}
            </Link>
          </div>
        </div>

        <div className="border-t p-3" style={{ borderColor: "rgba(127,29,29,0.3)" }}>
          <button onClick={handleLogout}
            className={`flex items-center gap-3 ${collapsed ? "justify-center px-2" : "px-3"} py-2.5 rounded-lg text-sm font-medium hover:bg-red-900/30 transition-all w-full`}>
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" style={{ color: "#f87171" }} />
            {!collapsed && <span style={{ color: "#f87171" }}>Déconnexion</span>}
          </button>
        </div>

        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md">
          {collapsed ? <ChevronRight className="w-3 h-3" style={{ color: "#475569" }} /> : <ChevronLeft className="w-3 h-3" style={{ color: "#475569" }} />}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2 py-1 rounded-md" style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>ADMIN</span>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
              <input type="text" placeholder="Rechercher un utilisateur..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
                style={{ color: "#0f172a" }} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg"><Bell className="w-5 h-5" style={{ color: "#64748b" }} /></button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
              <User className="w-4 h-4" style={{ color: "#fff" }} />
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
        <footer className="border-t border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
          <p className="text-xs" style={{ color: "#94a3b8" }}>© 2026 EcomPilot Admin. Tous droits réservés.</p>
          <p className="text-xs" style={{ color: "#94a3b8" }}>v1.0.0</p>
        </footer>
      </div>
    </div>
  );
}
