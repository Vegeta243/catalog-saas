import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/admin-security";

export async function GET() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");
  if (!adminSession?.value) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  const session = await verifyAdminSession(adminSession.value);
  if (!session.valid) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await admin
    .from("support_tickets")
    .select("*, support_ticket_replies(id, author_role, message, created_at), users(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ tickets: [], setup_required: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tickets = (data || []).map(t => ({
    ...t,
    user_email: (t.users as { email?: string } | null)?.email,
    users: undefined,
  }));

  return NextResponse.json({ tickets });
}
