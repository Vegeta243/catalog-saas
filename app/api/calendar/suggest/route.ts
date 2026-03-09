import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { logAction } from "@/lib/log-action";

export async function POST() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  // Check quota (2 tasks per suggestion call)
  const { data: userData } = await supabase
    .from("users")
    .select("plan, actions_used, actions_limit")
    .eq("id", user.id)
    .single();

  if (userData && userData.actions_used + 2 > (userData.actions_limit || 50)) {
    return NextResponse.json({ error: "Quota insuffisant. Passez à un plan supérieur." }, { status: 403 });
  }

  // Get user's products summary
  const { data: shops } = await supabase
    .from("shops")
    .select("id, name, shopify_domain")
    .eq("user_id", user.id);

  // Get recent action history for context
  const { data: recentActions } = await supabase
    .from("action_history")
    .select("action_type, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const catalogSummary = {
    shops: shops?.length || 0,
    shopNames: shops?.map(s => s.name) || [],
    recentActions: recentActions?.map(a => ({ type: a.action_type, desc: a.description, date: a.created_at })) || [],
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Tu es un expert e-commerce. Suggère 5 actions calendrier optimales pour les 30 prochains jours. Retourne strictement un JSON array. Chaque élément: {title: string, event_type: 'price_change'|'restock'|'promotion'|'ai_optimization'|'import'|'custom', scheduled_at: ISO date string, reasoning: string en français, products_affected: string description}. Ne retourne rien d'autre que le JSON array.",
        },
        {
          role: "user",
          content: `Mon catalogue e-commerce: ${JSON.stringify(catalogSummary)}. Date actuelle: ${new Date().toISOString()}. Suggère 5 actions calendrier optimales.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content || "[]";
    let suggestions;
    try {
      // Extract JSON from potential markdown code fences
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      suggestions = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      suggestions = [];
    }

    // Consume 2 tasks
    await supabase.rpc("increment_actions", { p_user_id: user.id, p_count: 2 });

    await logAction(supabase, {
      userId: user.id,
      actionType: "calendar.suggest",
      description: `${suggestions.length} suggestions IA générées`,
      creditsUsed: 2,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
