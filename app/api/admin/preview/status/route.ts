import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

export async function GET() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !verifyAdminSession(s.value).valid) {
    return NextResponse.json({ plan: null });
  }
  const preview = cookieStore.get("admin_preview_plan");
  return NextResponse.json({ plan: preview?.value || null });
}
