import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  free: { bg: "#f1f5f9", text: "#64748b" },
  starter: { bg: "#eff6ff", text: "#2563eb" },
  pro: { bg: "#ecfdf5", text: "#059669" },
  scale: { bg: "#faf5ff", text: "#7c3aed" },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planFilter } = await searchParams;
  const supabase = getAdminClient();

  let query = supabase
    .from("users")
    .select("id, email, plan, actions_used, actions_limit, subscription_status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (planFilter && planFilter !== "all") {
    query = query.eq("plan", planFilter);
  }

  const { data: users } = await query;

  const plans = ["all", "free", "starter", "pro", "scale"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Utilisateurs</h1>
        <span className="text-sm" style={{ color: "#64748b" }}>{(users || []).length} résultats</span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {plans.map((p) => (
          <a
            key={p}
            href={p === "all" ? "/admin/users" : `/admin/users?plan=${p}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              (planFilter || "all") === p
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 hover:bg-gray-50"
            }`}
            style={(planFilter || "all") === p ? {} : { color: "#64748b" }}
          >
            {p === "all" ? "Tous" : p.charAt(0).toUpperCase() + p.slice(1)}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Plan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Tâches</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Inscription</th>
              <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(users || []).map((user) => {
              const planStyle = PLAN_COLORS[user.plan] || PLAN_COLORS.free;
              const usagePct = user.actions_limit > 0 ? (user.actions_used / user.actions_limit) * 100 : 0;
              return (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: "#0f172a" }}>{user.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ backgroundColor: planStyle.bg, color: planStyle.text }}
                    >
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(100, usagePct)}%`,
                            backgroundColor: usagePct >= 100 ? "#dc2626" : usagePct >= 80 ? "#f59e0b" : "#22c55e",
                          }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: "#64748b" }}>
                        {user.actions_used}/{user.actions_limit}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium capitalize"
                      style={{
                        color: user.subscription_status === "active" ? "#059669"
                          : user.subscription_status === "past_due" ? "#dc2626"
                          : "#94a3b8",
                      }}
                    >
                      {user.subscription_status || "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                    {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <form action={`/api/admin/users/${user.id}/reset-tasks`} method="POST">
                        <button
                          type="submit"
                          className="text-xs px-2 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ color: "#64748b" }}
                        >
                          Reset tâches
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "#94a3b8" }}>
                  Aucun utilisateur trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

