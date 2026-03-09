import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function AdminSubscriptionsPage() {
  const supabase = getAdminClient();

  const [{ data: active }, { data: pastDue }] = await Promise.all([
    supabase
      .from("users")
      .select("email, plan, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id")
      .eq("subscription_status", "active")
      .order("plan"),
    supabase
      .from("users")
      .select("email, plan, subscription_status, current_period_end, stripe_customer_id")
      .eq("subscription_status", "past_due"),
  ]);

  const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
    starter: { bg: "#eff6ff", text: "#2563eb" },
    pro: { bg: "#ecfdf5", text: "#059669" },
    scale: { bg: "#faf5ff", text: "#7c3aed" },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "#0f172a" }}>Abonnements</h1>

      {/* Past due alerts */}
      {pastDue && pastDue.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#dc2626" }}>
            ⚠️ {pastDue.length} paiement(s) en retard
          </p>
          {pastDue.map((u, i) => (
            <p key={i} className="text-xs" style={{ color: "#991b1b" }}>{u.email} — {u.plan}</p>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>
            Abonnements actifs ({(active || []).length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Plan</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Statut</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Renouvellement</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Stripe ID</th>
            </tr>
          </thead>
          <tbody>
            {(active || []).map((u, i) => {
              const planStyle = PLAN_COLORS[u.plan] || { bg: "#f1f5f9", text: "#64748b" };
              return (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: "#0f172a" }}>{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{ backgroundColor: planStyle.bg, color: planStyle.text }}>
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium" style={{ color: "#059669" }}>{u.subscription_status}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                    {u.current_period_end ? new Date(u.current_period_end).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono" style={{ color: "#94a3b8" }}>
                    {u.stripe_customer_id?.slice(0, 20) || "—"}
                  </td>
                </tr>
              );
            })}
            {(!active || active.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: "#94a3b8" }}>
                  Aucun abonnement actif
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

