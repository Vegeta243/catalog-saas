import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/admin-security";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ConfigClient from "./client";

export const dynamic = "force-dynamic";

async function getData() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await admin.from("system_config").select("*").order("key");
  return data || [];
}

export default async function ConfigPage() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) redirect("/admin/login");
  const configs = await getData();
  return <ConfigClient initialConfigs={configs} />;
}
