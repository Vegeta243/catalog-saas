import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Users, CreditCard, DollarSign, Zap, UserPlus } from "lucide-react";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function AdminPage() {
  const supabase = getAdminClient();

  const [
    { count: totalUsers },
    { data: planCounts },
    { data: todayActions },
    { data: recentActions },
    { data: recentUsers },
    { count: newSignups },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("users").select("plan"),
    supabase
      .from("action_history")
      .select("credits_used")
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase
      .from("action_history")
      .select("action_type, description, credits_used, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("users")
      .select("email, plan, actions_used, actions_limit, subscription_status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const plans = planCounts || [];
  const starterCount = plans.filter((u) => u.plan === "starter").length;
  const proCount = plans.filter((u) => u.plan === "pro").length;
  const scaleCount = plans.filter((u) => u.plan === "scale").length;
  const freeCount = plans.filter((u) => u.plan === "free").length;
  const activeSubscriptions = starterCount + proCount + scaleCount;
  const mrr = starterCount * 39 + proCount * 89 + scaleCount * 179;
  const tasksToday = (todayActions || []).reduce((sum, r) => sum + (r.credits_used || 0), 0);

  const kpis = [
    { label: "Utilisateurs totaux", value: (totalUsers || 0).toLocaleString("fr-FR"), icon: Users, color: "#2563eb" },
    { label: "Abonnés actifs", value: activeSubscriptions.toLocaleString("fr-FR"), icon: CreditCard, color: "#059669" },
    { label: "MRR estimé", value: `${mrr.toLocaleString("fr-FR")} €`, icon: DollarSign, color: "#7c3aed" },
    { label: "Tâches IA aujourd'hui", value: tasksToday.toLocaleString("fr-FR"), icon: Zap, color: "#f59e0b" },
    { label: "Nouveaux (30j)", value: (newSignups || 0).toLocaleString("fr-FR"), icon: UserPlus, color: "#0891b2" },
  ];

  const planBreakdown = [
    { name: "Free", count: freeCount, color: "#94a3b8" },
    { name: "Starter", count: starterCount, color: "#2563eb" },
    { name: "Pro", count: proCount, color: "#059669" },
    { name: "Scale", count: scaleCount, color: "#7c3aed" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "#0f172a" }}>Vue d&apos;ensemble</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: "#64748b" }}>{kpi.label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{kpi.value}</p>
            </div>
          );
        })}
      </div>

      {/* Plan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Répartition par plan</h2>
          <div className="space-y-3">
            {planBreakdown.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xs font-medium w-16" style={{ color: "#64748b" }}>{p.name}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: totalUsers ? `${(p.count / (totalUsers || 1)) * 100}%` : "0%",
                      backgroundColor: p.color,
                    }}
                  />
                </div>
                <span className="text-xs font-bold w-8 text-right" style={{ color: "#0f172a" }}>{p.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Derniers inscrits</h2>
          <div className="space-y-2">
            {(recentUsers || []).map((u, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{u.email}</p>
                  <p className="text-[10px]" style={{ color: "#94a3b8" }}>
                    {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                  style={{
                    backgroundColor: u.plan === "free" ? "#f1f5f9" : u.plan === "pro" ? "#ecfdf5" : u.plan === "scale" ? "#faf5ff" : "#eff6ff",
                    color: u.plan === "free" ? "#64748b" : u.plan === "pro" ? "#059669" : u.plan === "scale" ? "#7c3aed" : "#2563eb",
                  }}
                >
                  {u.plan}
                </span>
              </div>
            ))}
            {(!recentUsers || recentUsers.length === 0) && (
              <p className="text-xs text-center py-4" style={{ color: "#94a3b8" }}>Aucun utilisateur</p>
            )}
          </div>
        </div>
      </div>

      {/* Last 10 actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Dernières actions (toutes boutiques)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 font-medium" style={{ color: "#64748b" }}>Type</th>
                <th className="text-left pb-2 font-medium" style={{ color: "#64748b" }}>Description</th>
                <th className="text-right pb-2 font-medium" style={{ color: "#64748b" }}>Crédits</th>
                <th className="text-right pb-2 font-medium" style={{ color: "#64748b" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(recentActions || []).map((a, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 font-mono" style={{ color: "#2563eb" }}>{a.action_type}</td>
                  <td className="py-2" style={{ color: "#374151" }}>{a.description}</td>
                  <td className="py-2 text-right font-semibold" style={{ color: "#0f172a" }}>{a.credits_used}</td>
                  <td className="py-2 text-right" style={{ color: "#94a3b8" }}>
                    {new Date(a.created_at).toLocaleString("fr-FR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
              {(!recentActions || recentActions.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-6 text-center" style={{ color: "#94a3b8" }}>Aucune action enregistrée</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

