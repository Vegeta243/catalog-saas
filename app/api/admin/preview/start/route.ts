import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

const VALID_PLANS = ["free", "starter", "pro", "scale"];

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { plan } = await req.json();
  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
  }

  const res = NextResponse.json({ success: true, plan });
  // httpOnly:false so the dashboard can read it client-side to override plan gating
  res.cookies.set("ecompilot_preview", plan, {
    httpOnly: false,
    secure: true,
    sameSite: "lax",
    maxAge: 3600,
    path: "/",
  });
  return res;
}
