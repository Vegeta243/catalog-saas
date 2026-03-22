import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { key } = await params;
  const body = await req.json();

  const allowed = ["enabled", "name", "description", "badge", "visible_plans", "admin_preview"];
  const update: Record<string, unknown> = {};
  for (const field of allowed) {
    if (field in body) update[field] = body[field];
  }
  update.updated_at = new Date().toISOString();

  const { error } = await admin.from("feature_flags").update(update).eq("key", key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try { await admin.from("admin_audit_log").insert({ action: "feature_flag_update", target: key, details: update }); } catch {}

  return NextResponse.json({ success: true });
}
