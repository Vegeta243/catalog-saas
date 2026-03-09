import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 39,
  pro: 89,
  scale: 179,
};

export default async function AdminRevenuePage() {
  const supabase = getAdminClient();

  const [
    { data: activeUsers },
    { data: canceledThisMonth },
    { data: totalLastMonth },
    { data: pastDueUsers },
  ] = await Promise.all([
    supabase.from("users").select("plan, subscription_status").eq("subscription_status", "active"),
    supabase.from("users").select("id")
      .eq("subscription_status", "canceled")
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from("users").select("id").neq("plan", "free"),
    supabase.from("users").select("email, plan").eq("subscription_status", "past_due"),
  ]);

  // MRR calculation
  const planBreakdown: Record<string, number> = { free: 0, starter: 0, pro: 0, scale: 0 };
  (activeUsers || []).forEach(u => { planBreakdown[u.plan] = (planBreakdown[u.plan] || 0) + 1; });

  const mrr = Object.entries(planBreakdown).reduce((sum, [plan, count]) => sum + (PLAN_PRICES[plan] || 0) * count, 0);
  const arr = mrr * 12;
  const totalLast = (totalLastMonth || []).length || 1;
  const churnRate = ((canceledThisMonth || []).length / totalLast * 100).toFixed(1);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6" style={{ color: "#0f172a" }}>Revenus</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>MRR</p>
          <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{mrr.toLocaleString("fr-FR")}€</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>ARR</p>
          <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{arr.toLocaleString("fr-FR")}€</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>Taux de churn (mois)</p>
          <p className="text-2xl font-bold" style={{ color: parseFloat(churnRate) > 5 ? "#dc2626" : "#059669" }}>{churnRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium mb-1" style={{ color: "#64748b" }}>Abonnés actifs</p>
          <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{(activeUsers || []).length}</p>
        </div>
      </div>

      {/* Revenue by plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Répartition par plan</h2>
        <div className="space-y-3">
          {Object.entries(PLAN_PRICES).map(([plan, price]) => {
            const count = planBreakdown[plan] || 0;
            const revenue = count * price;
            const pct = mrr > 0 ? (revenue / mrr * 100) : 0;
            const colors: Record<string, string> = { free: "#94a3b8", starter: "#3b82f6", pro: "#10b981", scale: "#8b5cf6" };
            return (
              <div key={plan} className="flex items-center gap-3">
                <div className="w-20 text-xs font-medium capitalize" style={{ color: "#374151" }}>{plan}</div>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-4 rounded-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: colors[plan] }} />
                </div>
                <div className="w-20 text-right text-xs font-medium" style={{ color: "#374151" }}>{count} × {price}€</div>
                <div className="w-16 text-right text-xs font-bold" style={{ color: "#0f172a" }}>{revenue}€</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past due alert */}
      {(pastDueUsers || []).length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "#dc2626" }}>
            ⚠️ Paiements en échec ({(pastDueUsers || []).length})
          </h2>
          <div className="space-y-1">
            {(pastDueUsers || []).map((u, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span style={{ color: "#374151" }}>{u.email}</span>
                <span className="capitalize font-medium" style={{ color: "#dc2626" }}>{u.plan}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
