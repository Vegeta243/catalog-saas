import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/admin-security";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import FeaturesClient from "./client";

export const dynamic = "force-dynamic";

async function getFlags() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await admin.from("feature_flags").select("*").order("key");
  return data || [];
}

export default async function FeaturesPage() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !verifyAdminSession(s.value).valid) redirect("/admin/login");

  const flags = await getFlags();
  return <FeaturesClient initialFlags={flags} />;
}
