import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function AdminContentMonitoringPage() {
  const supabase = getAdminClient();

  const [{ data: aiActions }, { data: stats }] = await Promise.all([
    supabase
      .from("action_history")
      .select("id, action_type, description, created_at, user_id, details")
      .like("action_type", "ai.%")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("action_history")
      .select("action_type")
      .like("action_type", "ai.%"),
  ]);

  const titleCount = (stats || []).filter(s => s.action_type === "ai.generate.title").length;
  const descCount = (stats || []).filter(s => s.action_type === "ai.generate.description").length;
  const totalAi = (stats || []).length;

  const typeLabel: Record<string, { label: string; color: string; emoji: string }> = {
    "ai.generate.title": { label: "Titre", color: "#3b82f6", emoji: "✨" },
    "ai.generate.description": { label: "Description", color: "#8b5cf6", emoji: "📝" },
    "ai.suggestion": { label: "Suggestion", color: "#10b981", emoji: "💡" },
    "ai.calendar.suggest": { label: "Calendrier IA", color: "#f59e0b", emoji: "📅" },
    "ai.competitor.analyze": { label: "Analyse concurrence", color: "#ef4444", emoji: "🔍" },
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#0f172a" }}>Contenu IA</h1>
      <p className="text-sm mb-6" style={{ color: "#64748b" }}>Surveillez le contenu généré par l&apos;IA à travers la plateforme</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium" style={{ color: "#94a3b8" }}>Total actions IA</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#0f172a" }}>{totalAi}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium" style={{ color: "#94a3b8" }}>Titres générés</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#3b82f6" }}>{titleCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium" style={{ color: "#94a3b8" }}>Descriptions générées</p>
          <p className="text-2xl font-bold mt-1" style={{ color: "#8b5cf6" }}>{descCount}</p>
        </div>
      </div>

      {/* Recent AI actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>
          Dernières actions IA ({(aiActions || []).length})
        </h2>
        {(aiActions || []).length > 0 ? (
          <div className="space-y-3">
            {(aiActions || []).map((a) => {
              const info = typeLabel[a.action_type] || { label: a.action_type, color: "#64748b", emoji: "🤖" };
              return (
                <div key={a.id} className="flex items-start gap-3 py-3 border-b border-gray-50">
                  <span className="text-lg flex-shrink-0">{info.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${info.color}15`, color: info.color }}>
                        {info.label}
                      </span>
                      <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>
                        {a.user_id?.slice(0, 8)}...
                      </span>
                    </div>
                    <p className="text-sm truncate" style={{ color: "#374151" }}>{a.description}</p>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: "#94a3b8" }}>
                    {new Date(a.created_at).toLocaleString("fr-FR")}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-center py-8" style={{ color: "#94a3b8" }}>Aucune action IA enregistrée</p>
        )}
      </div>
    </div>
  );
}
