import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function checkApiHealth(name: string, testFn: () => Promise<boolean>): Promise<{ name: string; ok: boolean }> {
  try {
    const ok = await testFn();
    return { name, ok };
  } catch {
    return { name, ok: false };
  }
}

export default async function AdminSystemPage() {
  const supabase = getAdminClient();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: overQuota }, { data: staleShops }, { data: errorActions }, { data: softDeleted }] = await Promise.all([
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
    supabase
      .from("users")
      .select("email, deleted_at, deletion_scheduled_at")
      .not("deleted_at", "is", null)
      .order("deletion_scheduled_at", { ascending: true })
      .limit(20),
  ]);

  // API health checks
  const apiChecks = await Promise.all([
    checkApiHealth("Supabase", async () => {
      const { error } = await supabase.from("users").select("id").limit(1);
      return !error;
    }),
    checkApiHealth("OpenAI", async () => {
      return !!process.env.OPENAI_API_KEY;
    }),
    checkApiHealth("Stripe", async () => {
      return !!process.env.STRIPE_SECRET_KEY;
    }),
    checkApiHealth("Resend", async () => {
      return !!process.env.RESEND_API_KEY;
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "#0f172a" }}>Système</h1>

      <div className="space-y-6">
        {/* API Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Santé des APIs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {apiChecks.map(api => (
              <div key={api.name} className={`flex items-center gap-2 p-3 rounded-lg border ${api.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <span className="text-lg">{api.ok ? "✅" : "❌"}</span>
                <span className={`text-xs font-medium ${api.ok ? "text-green-700" : "text-red-700"}`}>{api.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Soft-deleted accounts pending */}
        {(softDeleted || []).length > 0 && (
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: "#c2410c" }}>
              🗑️ Comptes en attente de suppression ({(softDeleted || []).length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-orange-200">
                    <th className="text-left pb-2 font-medium" style={{ color: "#9a3412" }}>Email</th>
                    <th className="text-left pb-2 font-medium" style={{ color: "#9a3412" }}>Supprimé le</th>
                    <th className="text-right pb-2 font-medium" style={{ color: "#9a3412" }}>Suppression définitive</th>
                  </tr>
                </thead>
                <tbody>
                  {(softDeleted || []).map((u, i) => {
                    const daysLeft = u.deletion_scheduled_at
                      ? Math.max(0, Math.ceil((new Date(u.deletion_scheduled_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : 0;
                    return (
                      <tr key={i} className="border-b border-orange-100">
                        <td className="py-2" style={{ color: "#0f172a" }}>{u.email}</td>
                        <td className="py-2" style={{ color: "#64748b" }}>
                          {u.deleted_at ? new Date(u.deleted_at).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="py-2 text-right font-semibold" style={{ color: daysLeft <= 3 ? "#dc2626" : "#f59e0b" }}>
                          Dans {daysLeft} jour{daysLeft !== 1 ? "s" : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
