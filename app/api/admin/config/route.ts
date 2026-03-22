import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { data, error } = await admin.from("system_config").select("*").order("key");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const { error } = await admin.from("system_config")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try { await admin.from("admin_audit_log").insert({ action: "system_config_update", target: key, details: { value } }); } catch {}

  return NextResponse.json({ success: true });
}
