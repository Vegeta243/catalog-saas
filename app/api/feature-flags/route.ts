import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

const PLAN_ORDER = ["free", "starter", "pro", "agency"] as const;

// All flags are cached server-side per-request via Supabase.
// Client caches for 60s.
export const revalidate = 60;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ flags: {}, plan: "free" });
    }

    // Get user's plan
    const { data: userData } = await supabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    const plan: string = userData?.plan || "free";
    const userLevel = PLAN_ORDER.indexOf(plan as (typeof PLAN_ORDER)[number]);

    // Fetch all feature flags using admin client (bypasses RLS)
    const admin = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: flags } = await admin
      .from("feature_flags")
      .select("key, enabled, visible_plans");

    const result: Record<string, boolean> = {};
    for (const flag of flags || []) {
      const plans: string[] = flag.visible_plans || ["free", "starter", "pro", "agency"];
      const minPlan = plans.reduce((min: string, p: string) => {
        const idx = PLAN_ORDER.indexOf(p as (typeof PLAN_ORDER)[number]);
        const minIdx = PLAN_ORDER.indexOf(min as (typeof PLAN_ORDER)[number]);
        return idx < minIdx ? p : min;
      }, "agency");
      const reqLevel = PLAN_ORDER.indexOf(minPlan as (typeof PLAN_ORDER)[number]);
      result[flag.key] = flag.enabled === true && (plans.length === 0 || userLevel >= reqLevel);
    }

    return Response.json({ flags: result, plan });
  } catch {
    return Response.json({ flags: {}, plan: "free" });
  }
}
