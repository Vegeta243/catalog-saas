import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim()).filter(Boolean);
  if (!user || !adminEmails.includes(user.email || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Build CSV
  const headers = ["id", "email", "plan", "actions_used", "actions_limit", "shops_count", "subscription_status", "created_at", "deleted_at"];
  const rows = (users || []).map(u =>
    [u.id, u.email, u.plan, u.actions_used, u.actions_limit, shopCount[u.id] || 0, u.subscription_status || "", u.created_at, u.deleted_at || ""].join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-export-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
