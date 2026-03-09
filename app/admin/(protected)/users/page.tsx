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
  searchParams: Promise<{ plan?: string; q?: string }>;
}) {
  const { plan: planFilter, q: searchQuery } = await searchParams;
  const supabase = getAdminClient();

  let query = supabase
    .from("users")
    .select("id, email, plan, actions_used, actions_limit, subscription_status, created_at, deleted_at, deletion_scheduled_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (planFilter === "deleted") {
    query = query.not("deleted_at", "is", null);
  } else if (planFilter && planFilter !== "all") {
    query = query.eq("plan", planFilter).is("deleted_at", null);
  } else {
    query = query.is("deleted_at", null);
  }

  const { data: allUsers } = await query;

  // Client-side search filter
  const users = searchQuery
    ? (allUsers || []).filter(u => u.email?.toLowerCase().includes(searchQuery.toLowerCase()))
    : (allUsers || []);

  // Count shops per user
  const userIds = users.map(u => u.id);
  const { data: shops } = await supabase.from("shops").select("user_id").in("user_id", userIds.length > 0 ? userIds : ["none"]);
  const shopCountMap: Record<string, number> = {};
  (shops || []).forEach(s => { shopCountMap[s.user_id] = (shopCountMap[s.user_id] || 0) + 1; });

  const plans = ["all", "free", "starter", "pro", "scale", "deleted"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Utilisateurs</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: "#64748b" }}>{users.length} résultats</span>
          <a href="/api/admin/export-users"
            className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            style={{ color: "#64748b" }}>
            📥 Export CSV
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <form method="GET" className="flex gap-2">
          <input name="q" defaultValue={searchQuery || ""} placeholder="Rechercher par email..." 
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
          {planFilter && <input type="hidden" name="plan" value={planFilter} />}
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
            Rechercher
          </button>
        </form>
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
            style={(planFilter || "all") === p ? {} : { color: p === "deleted" ? "#dc2626" : "#64748b" }}
          >
            {p === "all" ? "Tous" : p === "deleted" ? "🗑️ Supprimés" : p.charAt(0).toUpperCase() + p.slice(1)}
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
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Boutiques</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Inscription</th>
              <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const planStyle = PLAN_COLORS[user.plan] || PLAN_COLORS.free;
              const usagePct = user.actions_limit > 0 ? (user.actions_used / user.actions_limit) * 100 : 0;
              const isDeleted = !!user.deleted_at;
              const daysUntilDeletion = user.deletion_scheduled_at
                ? Math.max(0, Math.ceil((new Date(user.deletion_scheduled_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                : null;

              return (
                <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isDeleted ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium" style={{ color: "#0f172a" }}>{user.email}</div>
                    {isDeleted && daysUntilDeletion !== null && (
                      <div className="text-[10px] text-red-500 mt-0.5">
                        Suppression dans {daysUntilDeletion}j
                      </div>
                    )}
                  </td>
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
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                    {shopCountMap[user.id] || 0}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium capitalize"
                      style={{
                        color: isDeleted ? "#dc2626"
                          : user.subscription_status === "active" ? "#059669"
                          : user.subscription_status === "past_due" ? "#dc2626"
                          : "#94a3b8",
                      }}
                    >
                      {isDeleted ? "supprimé" : user.subscription_status || "inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                    {new Date(user.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!isDeleted && (
                        <>
                          <form action={`/api/admin/users/${user.id}/reset-tasks`} method="POST" className="inline">
                            <button type="submit"
                              className="text-[10px] px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
                              style={{ color: "#64748b" }}>
                              Reset
                            </button>
                          </form>
                          <PlanDropdown userId={user.id} currentPlan={user.plan} />
                        </>
                      )}
                      {isDeleted && (
                        <form action={`/api/admin/users/${user.id}/plan`} method="POST" className="inline">
                          <input type="hidden" name="_action" value="recover" />
                          <button type="submit"
                            className="text-[10px] px-2 py-1 border border-green-200 text-green-600 rounded hover:bg-green-50">
                            Récupérer
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "#94a3b8" }}>
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

function PlanDropdown({ userId, currentPlan }: { userId: string; currentPlan: string }) {
  const plans = ["free", "starter", "pro", "scale"];
  return (
    <form action={`/api/admin/users/${userId}/plan`} method="POST" className="inline">
      <select name="plan" defaultValue={currentPlan}
        onChange={(e) => (e.target.closest("form") as HTMLFormElement)?.requestSubmit()}
        className="text-[10px] px-1 py-1 border border-gray-200 rounded bg-white cursor-pointer"
        style={{ color: "#64748b" }}>
        {plans.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </form>
  );
}

