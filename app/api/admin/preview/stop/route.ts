import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

export async function POST() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !verifyAdminSession(s.value).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("admin_preview_plan", "", { maxAge: 0, path: "/" });
  return res;
}
