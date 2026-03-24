import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_PRICE: Record<string, number> = { starter: 19, pro: 49, scale: 129 };

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

  // Users who have used at least 1 action (synced products + ran something)
  const withActionsCount = users.filter((u) => (u.actions_used ?? 0) > 0).length;

  // Paid users
  const paidUsers = users.filter((u) => u.plan !== "free");
  const paidCount = paidUsers.length;

  // MRR
  const mrr = paidUsers.reduce((sum, u) => sum + (PLAN_PRICE[u.plan] ?? 0), 0);

  // Conversion rates (avoid division by zero)
  const rate = (num: number, den: number) =>
    den > 0 ? parseFloat(((num / den) * 100).toFixed(1)) : 0;

  const funnelSteps = [
    { label: "Inscrits", count: totalSignups, rate: 100 },
    { label: "Boutique connectée", count: withShopCount, rate: rate(withShopCount, totalSignups) },
    { label: "Au moins 1 action", count: withActionsCount, rate: rate(withActionsCount, totalSignups) },
    { label: "Payants", count: paidCount, rate: rate(paidCount, totalSignups) },
  ];

  // Plan breakdown
  const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, scale: 0 };
  for (const u of users) planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1;

  // New signups last 7 days vs previous 7 days
  const now = Date.now();
  const MS7 = 7 * 24 * 3600 * 1000;
  const last7 = users.filter((u) => now - new Date(u.created_at).getTime() < MS7).length;
  const prev7 = users.filter((u) => {
    const age = now - new Date(u.created_at).getTime();
    return age >= MS7 && age < 2 * MS7;
  }).length;

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
  });
}
