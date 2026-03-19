import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Public endpoint — no auth required.
 * Returns whether an admin preview session is active and which plan is being simulated.
 * The cookie is httpOnly so the client cannot read it directly.
 */
export async function GET() {
  const cookieStore = await cookies();
  const plan = cookieStore.get("admin_preview_plan")?.value ?? null;

  return NextResponse.json({
    active: plan !== null,
    plan,
  });
}
