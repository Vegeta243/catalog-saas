import { createClient as createServiceClient } from "@supabase/supabase-js";
import { verifyAdminSession } from "@/lib/admin-security";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChatbotClient from "./client";

export const dynamic = "force-dynamic";

async function getData() {
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const [logsRes, intentsRes] = await Promise.all([
    admin.from("chatbot_logs").select("*").order("created_at", { ascending: false }).limit(50),
    admin.from("chatbot_intents").select("*").order("name"),
  ]);
  return {
    logs: logsRes.data || [],
    intents: intentsRes.data || [],
  };
}

export default async function ChatbotPage() {
  const cookieStore = await cookies();
  const s = cookieStore.get("admin_session");
  if (!s?.value || !(await verifyAdminSession(s.value)).valid) redirect("/admin/login");
  const data = await getData();
  return <ChatbotClient {...data} />;
}
