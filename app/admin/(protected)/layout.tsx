import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/admin-security";
import AdminLayoutClient from "./layout-client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");

  if (!adminSession?.value) {
    redirect("/admin/login");
  }

  const session = await verifyAdminSession(adminSession.value);
  if (!session.valid) {
    redirect("/admin/login");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
