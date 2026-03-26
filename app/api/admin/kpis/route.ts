import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_PRICE: Record<string, number> = { starter: 19, pro: 49, agency: 149, scale: 149 };

// Weekly objectives — adjust as you grow
const WEEKLY_OBJECTIVES = {
  signups: 20,
  shopConnections: 10,
  firstActions: 8,
  conversions: 2,
};

// RAG thresholds for funnel step rates (%)
function ragStatus(rate: number, thresholds: { green: number; amber: number }): "green" | "amber" | "red" {
  if (rate >= thresholds.green) return "green";
  if (rate >= thresholds.amber) return "amber";
  return "red";
}

export async function GET() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // All real (non-test, non-deleted) users
  const { data: allUsers } = await admin
    .from("users")
    .select("id, plan, subscription_status, actions_used, created_at")
    .is("deleted_at" as never, null)
    .eq("is_test_account" as never, false);

  const users = allUsers ?? [];
  const totalSignups = users.length;

  // Users with at least 1 connected shop
  const { data: shopRows } = await admin
    .from("shops")
    .select("user_id")
    .eq("is_active", true);

  const usersWithShop = new Set((shopRows ?? []).map((r: { user_id: string }) => r.user_id));
  const withShopCount = users.filter((u) => usersWithShop.has(u.id)).length;

  // Users who have used at least 1 action
  const withActionsCount = users.filter((u) => (u.actions_used ?? 0) > 0).length;

  // Paid users (active subscriptions only = real customers)
  const paidUsers = users.filter((u) => u.plan !== "free" && u.subscription_status === "active");
  const paidCount = paidUsers.length;

  // MRR (only active subscriptions)
  const mrr = paidUsers.reduce((sum, u) => sum + (PLAN_PRICE[u.plan] ?? 0), 0);

  // Churn: users who had a paid plan but are no longer active
  const churnedUsers = users.filter(
    (u) => u.plan !== "free" && u.subscription_status !== "active"
  );
  const churnCount = churnedUsers.length;
  const totalEverPaid = paidCount + churnCount;
  const churnRate = totalEverPaid > 0 ? parseFloat(((churnCount / totalEverPaid) * 100).toFixed(1)) : 0;

  // Conversion rates
  const rate = (num: number, den: number) =>
    den > 0 ? parseFloat(((num / den) * 100).toFixed(1)) : 0;

  const shopRate = rate(withShopCount, totalSignups);
  const actionsRate = rate(withActionsCount, totalSignups);
  const paidRate = rate(paidCount, totalSignups);

  const funnelSteps = [
    { label: "Inscrits", count: totalSignups, rate: 100, rag: "green" as const },
    { label: "Boutique connectée", count: withShopCount, rate: shopRate, rag: ragStatus(shopRate, { green: 50, amber: 30 }) },
    { label: "Au moins 1 action", count: withActionsCount, rate: actionsRate, rag: ragStatus(actionsRate, { green: 40, amber: 20 }) },
    { label: "Payants", count: paidCount, rate: paidRate, rag: ragStatus(paidRate, { green: 5, amber: 2 }) },
  ];

  // Plan breakdown
  const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, agency: 0, scale: 0 };
  for (const u of users) planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1;

  // New signups last 7 days vs previous 7 days
  const now = Date.now();
  const MS7 = 7 * 24 * 3600 * 1000;
  const last7 = users.filter((u) => now - new Date(u.created_at).getTime() < MS7).length;
  const prev7 = users.filter((u) => {
    const age = now - new Date(u.created_at).getTime();
    return age >= MS7 && age < 2 * MS7;
  }).length;

  // Weekly progress
  const last7ShopConnections = users.filter(
    (u) => now - new Date(u.created_at).getTime() < MS7 && usersWithShop.has(u.id)
  ).length;
  const last7Actions = users.filter(
    (u) => now - new Date(u.created_at).getTime() < MS7 && (u.actions_used ?? 0) > 0
  ).length;
  const last7Paid = users.filter(
    (u) => now - new Date(u.created_at).getTime() < MS7 && u.plan !== "free" && u.subscription_status === "active"
  ).length;

  const weeklyProgress = {
    signups: { current: last7, target: WEEKLY_OBJECTIVES.signups },
    shopConnections: { current: last7ShopConnections, target: WEEKLY_OBJECTIVES.shopConnections },
    firstActions: { current: last7Actions, target: WEEKLY_OBJECTIVES.firstActions },
    conversions: { current: last7Paid, target: WEEKLY_OBJECTIVES.conversions },
  };

  return NextResponse.json({
    totalSignups,
    withShopCount,
    withActionsCount,
    paidCount,
    mrr,
    funnelSteps,
    planCounts,
    last7Signups: last7,
    prev7Signups: prev7,
    signupTrend: rate(last7, Math.max(prev7, 1)) - 100,
    churnCount,
    churnRate,
    weeklyProgress,
  });
}
