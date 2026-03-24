import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: targetId } = await params;

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Get user from public.users first for email
  const { data: publicUser } = await supabaseAdmin
    .from("users")
    .select("id, email, plan")
    .eq("id", targetId)
    .single();

  const email = publicUser?.email;
  if (!email) {
    // Fallback to auth.users
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(targetId);
    if (!authUser?.email) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
  }

  // Generate a one-time magic link via Supabase Admin API
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: email || "",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.ecompilotelite.com"}/dashboard` },
  });

  if (error || !data?.properties?.action_link) {
    console.error("[impersonate] generateLink error:", error);
    return NextResponse.json({ error: error?.message || "Impossible de générer le lien" }, { status: 500 });
  }

  try {
    await supabaseAdmin.from("admin_audit_log").insert({
      action: "impersonate_user",
      target: targetId,
      details: { email, plan: publicUser?.plan },
    });
  } catch { /* audit non-blocking */ }

  return NextResponse.json({
    url: data.properties.action_link,
    email,
  });
}
