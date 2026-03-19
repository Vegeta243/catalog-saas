import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/admin-security";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AnalyticsClient from "./client";

export const dynamic = "force-dynamic";

async function getData() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString();

  const [usersRes, tasksRes, shopsRes, referralsRes] = await Promise.all([
    admin.from("users").select("id, plan, created_at, subscription_status").order("created_at"),
    admin.from("task_usage").select("user_id, task_type, created_at").gte("created_at", thirtyDaysAgo).order("created_at"),
    admin.from("shops").select("user_id, created_at").order("created_at"),
    admin.from("referrals").select("referrer_id, status, created_at").gte("created_at", ninetyDaysAgo).order("created_at"),
  ]);

  return {
    users: usersRes.data || [],
    tasks: tasksRes.data || [],
    shops: shopsRes.data || [],
    referrals: referralsRes.data || [],
  };
}

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !verifyAdminSession(s.value).valid) redirect("/admin/login");
  const data = await getData();
  return <AnalyticsClient {...data} />;
}
