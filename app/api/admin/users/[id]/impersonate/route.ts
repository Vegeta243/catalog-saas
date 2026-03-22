import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";
import { createHmac, randomBytes } from "crypto";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function signImpersonationToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const secret = process.env.ADMIN_SECRET ?? randomBytes(32).toString("hex");
  const sig = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id: targetId } = await params;
  const { data: user, error } = await admin.from("users").select("id, email, plan").eq("id", targetId).single();
  if (error || !user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const token = signImpersonationToken({ sub: user.id, email: user.email, plan: user.plan, impersonated: true });

  try { await admin.from("admin_audit_log").insert({ action: "impersonate_user", target: targetId, details: { email: user.email, plan: user.plan } }); } catch {}

  return NextResponse.json({ token, user });
}
