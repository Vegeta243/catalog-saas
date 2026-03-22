import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { data, error } = await admin.from("chatbot_intents").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { name, keywords, response, enabled } = await req.json();
  if (!name || !response) return NextResponse.json({ error: "name and response required" }, { status: 400 });

  const { data, error } = await admin.from("chatbot_intents").insert({ name, keywords: keywords ?? [], response, enabled: enabled ?? true }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
