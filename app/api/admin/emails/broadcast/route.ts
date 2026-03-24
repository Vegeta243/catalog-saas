import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_ORDER = ["free", "starter", "pro", "scale"];

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { segment, subject, body } = await req.json();
  if (!subject || !body) return NextResponse.json({ error: "subject and body required" }, { status: 400 });

  // Fetch target users
  let query = admin.from("users").select("id, email, plan");
  if (segment && segment !== "all") {
    if (segment === "paid") {
      query = query.in("plan", ["starter", "pro", "scale"]);
    } else {
      query = query.eq("plan", segment);
    }
  }
  const { data: users, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = (users ?? []).map(u => u.email).filter(Boolean);

  if (!process.env.RESEND_API_KEY) {
    try { await admin.from("admin_audit_log").insert({ action: "email_broadcast", target: segment ?? "all", details: { subject, count: emails.length, note: "demo_mode" } }); } catch {}
    return NextResponse.json({ success: true, sent: 0, total: emails.length, note: "Configurez RESEND_API_KEY pour envoyer réellement" });
  }

  // Send via Resend
  let sent = 0;
  const BATCH = 50;
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(batch.map(to => ({
        from: "EcomPilot Elite <onboarding@resend.dev>",
        to,
        subject,
        html: body.replace(/\n/g, "<br>"),
      }))),
    });
    if (res.ok) sent += batch.length;
  }

  try { await admin.from("admin_audit_log").insert({ action: "email_broadcast", target: segment ?? "all", details: { subject, sent, total: emails.length } }); } catch {}

  return NextResponse.json({ success: true, sent, total: emails.length });
}
