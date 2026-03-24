import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

/**
 * Sanitize a CSV field to prevent CSV injection attacks.
 * Spreadsheet apps execute formulas when a cell starts with =, +, -, @, tab, carriage-return.
 * We prefix those with a literal apostrophe so they render as plain text.
 */
function csvSafe(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  // Escape injection trigger characters
  if (/^[=+\-@\t\r|%]/.test(str)) {
    return `'${str.replace(/'/g, "''")}`;
  }
  // Quote fields that contain commas, double-quotes or newlines
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: users } = await admin
    .from("users")
    .select("id, email, plan, actions_used, actions_limit, subscription_status, created_at, deleted_at")
    .order("created_at", { ascending: false });

  // Count shops per user
  const { data: shops } = await admin.from("shops").select("user_id");
  const shopCount: Record<string, number> = {};
  (shops || []).forEach(s => { shopCount[s.user_id] = (shopCount[s.user_id] || 0) + 1; });

  // Build CSV — all fields pass through csvSafe() to prevent formula injection
  const headerRow = ["id", "email", "plan", "actions_used", "actions_limit", "shops_count", "subscription_status", "created_at", "deleted_at"];
  const rows = (users || []).map(u =>
    [
      csvSafe(u.id),
      csvSafe(u.email),
      csvSafe(u.plan),
      csvSafe(u.actions_used),
      csvSafe(u.actions_limit),
      csvSafe(shopCount[u.id] || 0),
      csvSafe(u.subscription_status),
      csvSafe(u.created_at),
      csvSafe(u.deleted_at),
    ].join(",")
  );
  const csv = [headerRow.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
