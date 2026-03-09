import { SupabaseClient } from "@supabase/supabase-js";

export async function logAction(
  supabase: SupabaseClient,
  action: {
    userId: string;
    shopId?: string;
    actionType: string;
    description: string;
    productsCount?: number;
    creditsUsed?: number;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from("action_history").insert({
      user_id: action.userId,
      shop_id: action.shopId || null,
      action_type: action.actionType,
      description: action.description,
      products_count: action.productsCount || 1,
      credits_used: action.creditsUsed || 0,
      details: action.details || {},
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("logAction silent fail:", e);
  }
}
