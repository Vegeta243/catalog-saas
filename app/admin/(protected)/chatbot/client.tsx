"use client";

import { useState } from "react";
import { MessageSquare, Zap, AlertCircle, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/lib/toast";

interface ChatbotLog {
  id: number;
  user_id: string;
  session_id: string;
  messages: Array<{ role: string; content: string; ts?: string }>;
  unanswered_question?: string;
  resolved: boolean;
  created_at: string;
}

interface Intent {
  id: number;
  name: string;
  keywords: string[];
  response: string;
  enabled: boolean;
}

const TABS = [
  { id: "logs", label: "Conversations", icon: MessageSquare },
  { id: "unanswered", label: "Sans réponse", icon: AlertCircle },
  { id: "intents", label: "Intents", icon: Zap },
];

export default function ChatbotClient({ logs, intents: initialIntents }: { logs: ChatbotLog[]; intents: Intent[] }) {
  const { addToast } = useToast();
  const [tab, setTab] = useState("logs");
  const [intents, setIntents] = useState<Intent[]>(initialIntents);
  const [selectedLog, setSelectedLog] = useState<ChatbotLog | null>(null);
  const [editingIntent, setEditingIntent] = useState<Intent | null>(null);
  const [saving, setSaving] = useState(false);

  const unanswered = logs.filter(l => l.unanswered_question);

  const saveIntent = async (intent: Intent) => {
    setSaving(true);
    try {
      const method = intent.id ? "PATCH" : "POST";
      const url = intent.id ? `/api/admin/chatbot/intents/${intent.id}` : "/api/admin/chatbot/intents";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(intent),
      });
      if (res.ok) {
        const updated = await res.json();
        setIntents(is => intent.id
          ? is.map(i => i.id === intent.id ? updated : i)
          : [...is, updated]
        );
        setEditingIntent(null);
        addToast("Intent sauvegardé", "success");
      } else {
        addToast("Erreur", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>🤖 Chatbot IA</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>Logs des conversations, questions sans réponse, gestion des intents</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Conversations", value: logs.length, color: "#3b82f6" },
          { label: "Sans réponse", value: unanswered.length, color: "#f59e0b" },
          { label: "Intents actifs", value: intents.filter(i => i.enabled).length, color: "#10b981" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-800"
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
            {t.id === "unanswered" && unanswered.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">{unanswered.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Conversations */}
      {tab === "logs" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Dernières conversations</h2>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {logs.length === 0 && <p className="p-6 text-center text-xs text-gray-400">Aucune conversation</p>}
              {logs.map(log => (
                <button key={log.id} onClick={() => setSelectedLog(log)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedLog?.id === log.id ? "bg-blue-50" : ""}`}>
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>
                    {String(log.user_id).substring(0, 8)}… — {(Array.isArray(log.messages) ? log.messages : []).length} msg
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>
                    {new Date(log.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                {selectedLog ? `Conversation #${selectedLog.id}` : "Sélectionnez une conversation"}
              </h2>
            </div>
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {!selectedLog && <p className="text-xs text-gray-400 text-center py-8">Cliquez sur une conversation</p>}
              {selectedLog && (Array.isArray(selectedLog.messages) ? selectedLog.messages : []).map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
                    msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-800"
                  }`}>
                    {String(msg.content || "")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unanswered */}
      {tab === "unanswered" && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Questions sans réponse satisfaisante</h2>
          </div>
          {unanswered.length === 0 ? (
            <p className="p-8 text-center text-xs text-gray-400">Aucune question sans réponse 🎉</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {unanswered.map(log => (
                <div key={log.id} className="px-4 py-3">
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>🤔 {log.unanswered_question}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "#94a3b8" }}>
                    {new Date(log.created_at).toLocaleString("fr-FR")} — user {String(log.user_id).substring(0, 8)}…
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Intents */}
      {tab === "intents" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setEditingIntent({ id: 0, name: "", keywords: [], response: "", enabled: true })}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium text-white">
              <Plus className="w-4 h-4" /> Nouvel intent
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Nom", "Mots-clés", "Réponse", "Actif", ""].map(h => (
                    <th key={h} className="text-left text-xs font-semibold px-4 py-3" style={{ color: "#64748b" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {intents.map(intent => (
                  <tr key={intent.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#0f172a" }}>{intent.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(intent.keywords || []).map(k => (
                          <span key={k} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded">{k}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate" style={{ color: "#64748b" }}>{intent.response}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold ${intent.enabled ? "text-emerald-600" : "text-gray-400"}`}>
                        {intent.enabled ? "✓ Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setEditingIntent({ ...intent })} className="text-xs text-blue-600 hover:underline">Modifier</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit intent modal */}
      {editingIntent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold" style={{ color: "#0f172a" }}>
              {editingIntent.id ? `Modifier intent: ${editingIntent.name}` : "Nouvel intent"}
            </h3>
            <div>
              <label className="text-xs font-medium text-gray-600">Nom</label>
              <input value={editingIntent.name}
                onChange={e => setEditingIntent(i => i ? { ...i, name: e.target.value } : null)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Mots-clés (séparés par des virgules)</label>
              <input
                value={(editingIntent.keywords || []).join(", ")}
                onChange={e => setEditingIntent(i => i ? { ...i, keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) } : null)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Réponse</label>
              <textarea value={editingIntent.response}
                onChange={e => setEditingIntent(i => i ? { ...i, response: e.target.value } : null)}
                rows={3}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" style={{ color: "#0f172a" }} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="intent_enabled" checked={editingIntent.enabled}
                onChange={e => setEditingIntent(i => i ? { ...i, enabled: e.target.checked } : null)} className="rounded" />
              <label htmlFor="intent_enabled" className="text-xs text-gray-600">Intent actif</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingIntent(null)} className="px-4 py-2 text-sm text-gray-600">Annuler</button>
              <button onClick={() => saveIntent(editingIntent)} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-sm font-medium text-white">
                <Save className="w-3.5 h-3.5" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
