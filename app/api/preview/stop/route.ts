import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Public stop endpoint — no admin auth required.
 * Only clears admin_preview_plan if the cookie is present.
 * Anyone with the cookie can clear it (it's their own browser state).
 */
export async function POST() {
  const cookieStore = await cookies();
  const plan = cookieStore.get("ecompilot_preview")?.value
    ?? cookieStore.get("admin_preview_plan")?.value;

  if (!plan) {
    return NextResponse.json({ ok: true, message: "No active preview session." });
  }

  const response = NextResponse.json({ ok: true });
  // Clear both cookie names
  response.cookies.set("ecompilot_preview", "", { path: "/", maxAge: 0 });
  response.cookies.set("admin_preview_plan", "", { path: "/", maxAge: 0 });
  return response;
}
