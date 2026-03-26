import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_PRICE: Record<string, number> = { starter: 19, pro: 49, agency: 149, scale: 149 };
const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export async function GET() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Plan distribution
  const { data: allUsers } = await admin
    .from("users")
    .select("plan, subscription_status, created_at")
    .is("deleted_at" as never, null)
    .eq("is_test_account" as never, false);

  const users = allUsers ?? [];

  const planCounts: Record<string, number> = { free: 0, starter: 0, pro: 0, agency: 0, scale: 0 };
  for (const u of users) planCounts[u.plan] = (planCounts[u.plan] ?? 0) + 1;

  const totalUsers = users.length;
  const paidUsers = (planCounts.starter ?? 0) + (planCounts.pro ?? 0) + (planCounts.agency ?? 0) + (planCounts.scale ?? 0);
  const mrr =
    (planCounts.starter ?? 0) * PLAN_PRICE.starter +
    (planCounts.pro ?? 0) * PLAN_PRICE.pro +
    (planCounts.agency ?? 0) * PLAN_PRICE.agency +
    (planCounts.scale ?? 0) * PLAN_PRICE.scale;

  // Monthly signups — last 7 months
  const now = new Date();
  const months: { month: string; users: number; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d.toISOString();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
    const monthUsers = users.filter(u => u.created_at >= start && u.created_at < end);
    const count = monthUsers.length;
    // Approximate MRR for that month based on paid users created up to that point
    const paid = monthUsers.filter(u => u.plan !== "free");
    const rev = paid.reduce((sum, u) => sum + (PLAN_PRICE[u.plan] ?? 0), 0);
    months.push({ month: MONTHS_FR[d.getMonth()], users: count, revenue: rev });
  }

  // Shops count
  const { count: shopsCount } = await admin.from("shops").select("*", { count: "exact", head: true });

  // Active subscriptions
  const activeCount = users.filter(u => u.subscription_status === "active" || u.subscription_status === "trialing").length;

  return NextResponse.json({
    totalUsers,
    paidUsers,
    activeCount,
    mrr,
    shopsCount: shopsCount ?? 0,
    planCounts,
    monthlyData: months,
  });
}
