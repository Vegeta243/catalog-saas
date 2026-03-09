import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function AdminSystemPage() {
  const supabase = getAdminClient();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: overQuota }, { data: staleShops }, { data: errorActions }] = await Promise.all([
    supabase
      .from("users")
      .select("email, plan, actions_used, actions_limit")
      .filter("actions_used", "gte", "actions_limit")
      .order("actions_used", { ascending: false })
      .limit(20),
    supabase
      .from("shops")
      .select("shop_domain, user_id, last_sync_at, is_active")
      .eq("is_active", true)
      .lt("last_sync_at", twentyFourHoursAgo)
      .limit(20),
    supabase
      .from("action_history")
      .select("action_type, description, created_at, user_id, details")
      .not("details->error", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "#0f172a" }}>Système</h1>

      <div className="space-y-6">
        {/* Users over quota */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>
            Utilisateurs au-dessus du quota ({(overQuota || []).length})
          </h2>
          {overQuota && overQuota.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 font-medium" style={{ color: "#64748b" }}>Email</th>
                    <th className="text-left pb-2 font-medium" style={{ color: "#64748b" }}>Plan</th>
                    <th className="text-right pb-2 font-medium" style={{ color: "#64748b" }}>Utilisé / Limite</th>
                  </tr>
                </thead>
                <tbody>
                  {overQuota.map((u, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2" style={{ color: "#0f172a" }}>{u.email}</td>
                      <td className="py-2 capitalize" style={{ color: "#64748b" }}>{u.plan}</td>
                      <td className="py-2 text-right font-semibold" style={{ color: "#dc2626" }}>
                        {u.actions_used}/{u.actions_limit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: "#94a3b8" }}>Aucun utilisateur hors quota ✓</p>
          )}
        </div>

        {/* Shops with stale sync */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>
            Boutiques sans synchronisation (24h) ({(staleShops || []).length})
          </h2>
          {staleShops && staleShops.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 font-medium" style={{ color: "#64748b" }}>Domaine</th>
                    <th className="text-right pb-2 font-medium" style={{ color: "#64748b" }}>Dernière sync</th>
                  </tr>
                </thead>
                <tbody>
                  {staleShops.map((s, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-mono" style={{ color: "#0f172a" }}>{s.shop_domain}</td>
                      <td className="py-2 text-right" style={{ color: "#f59e0b" }}>
                        {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString("fr-FR") : "Jamais"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: "#94a3b8" }}>Toutes les boutiques sont synchronisées ✓</p>
          )}
        </div>

        {/* Error actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>
            Actions avec erreurs ({(errorActions || []).length})
          </h2>
          {errorActions && errorActions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 font-medium" style={{ color: "#64748b" }}>Type</th>
                    <th className="text-left pb-2 font-medium" style={{ color: "#64748b" }}>Description</th>
                    <th className="text-right pb-2 font-medium" style={{ color: "#64748b" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {errorActions.map((a, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-mono" style={{ color: "#dc2626" }}>{a.action_type}</td>
                      <td className="py-2" style={{ color: "#374151" }}>{a.description}</td>
                      <td className="py-2 text-right" style={{ color: "#94a3b8" }}>
                        {new Date(a.created_at).toLocaleString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-center py-4" style={{ color: "#94a3b8" }}>Aucune erreur enregistrée ✓</p>
          )}
        </div>
      </div>
    </div>
  );
}
