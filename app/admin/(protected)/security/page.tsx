import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/admin-security";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SecurityClient from "./client";

export const dynamic = "force-dynamic";

async function getData() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const [auditRes, usersRes] = await Promise.all([
    admin.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("users").select("id, email, plan, created_at, subscription_status").order("created_at", { ascending: false }).limit(20),
  ]);
  return {
    auditLog: auditRes.data || [],
    recentUsers: usersRes.data || [],
  };
}

export default async function SecurityPage() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !verifyAdminSession(s.value).valid) redirect("/admin/login");

  const data = await getData();
  return <SecurityClient {...data} />;
}
