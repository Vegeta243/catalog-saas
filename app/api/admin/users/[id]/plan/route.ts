import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { PLAN_TASKS } from "@/lib/credits";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const s = cookieStore.get("admin_session");
    if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const { plan } = await request.json();
    const validPlans = ["free", "starter", "pro", "scale"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await admin.from("users").update({
      plan,
      actions_limit: PLAN_TASKS[plan] || 50,
    }).eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST — form-based plan change + recover soft-deleted account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const formData = await request.formData();
  const action = formData.get("_action") as string;
  const plan = formData.get("plan") as string;

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (action === "recover") {
    await admin.from("users").update({ deleted_at: null, deletion_scheduled_at: null }).eq("id", id);
  } else if (plan) {
    const validPlans = ["free", "starter", "pro", "scale"];
    if (validPlans.includes(plan)) {
      await admin.from("users").update({ plan, actions_limit: PLAN_TASKS[plan] || 50 }).eq("id", id);
    }
  }

  redirect("/admin/users");
}
