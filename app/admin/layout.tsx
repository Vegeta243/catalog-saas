import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  LayoutDashboard, Users, CreditCard, BarChart3,
  Shield, Zap, Settings, DollarSign, FileSearch
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "📊 Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/users", label: "👥 Utilisateurs", icon: Users },
  { href: "/admin/subscriptions", label: "💳 Abonnements", icon: CreditCard },
  { href: "/admin/revenue", label: "💰 Revenus", icon: DollarSign },
  { href: "/admin/stats", label: "📈 Analytics", icon: BarChart3 },
  { href: "/admin/content-monitoring", label: "🔍 Contenu IA", icon: FileSearch },
  { href: "/admin/system", label: "⚙️ Système", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "elliottshilenge5@gmail.com")
    .split(",").map((e) => e.trim()).filter(Boolean);
  console.log("Admin check:", user?.email, "allowed:", ADMIN_EMAILS, "result:", ADMIN_EMAILS.includes(user?.email || ""));
  if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f8fafc" }}>
      <aside className="w-64 flex flex-col flex-shrink-0" style={{ backgroundColor: "#1c1917" }}>
        <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: "rgba(127,29,29,0.3)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
            <Shield className="w-4 h-4" style={{ color: "#fff" }} />
          </div>
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
