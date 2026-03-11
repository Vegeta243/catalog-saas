"use client";

import { useState, useEffect } from "react";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { MessageSquare, RefreshCw, User, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface Reply {
  id: string;
  author_role: "user" | "admin";
  message: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: string;
  created_at: string;
  user_id: string;
  support_ticket_replies: Reply[];
  user_email?: string;
}

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [replyStatus, setReplyStatus] = useState<string>("in_progress");
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<string>("open");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/support/list");
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  const handleReply = async () => {
    if (!selected || !replyMsg.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selected.id, message: replyMsg, status: replyStatus }),
      });
      if (!res.ok) throw new Error("Erreur lors de l'envoi");
      setReplyMsg("");
      await loadTickets();
      setSelected(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎫 Support — Tickets</h1>
          <p className="text-sm text-gray-500 mt-1">{tickets.length} ticket(s) total</p>
        </div>
        <button onClick={loadTickets} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[["all", "Tous"], ["open", "Ouverts"], ["in_progress", "En cours"], ["resolved", "Résolus"], ["closed", "Fermés"]].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === val ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket list */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Aucun ticket</div>
          ) : (
            filtered.map(ticket => (
              <button key={ticket.id} onClick={() => { setSelected(ticket); setReplyStatus(ticket.status); }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${selected?.id === ticket.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 line-clamp-1">{ticket.subject}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[ticket.status]}`}>
                    {STATUS_LABELS[ticket.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{ticket.user_email || ticket.user_id.slice(0, 8)}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(ticket.created_at).toLocaleDateString("fr-FR")}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{ticket.support_ticket_replies?.length || 0}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Reply panel */}
        {selected ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">{selected.subject}</h3>
            <div className="flex gap-2 mb-4 text-xs text-gray-400">
              <span>#{selected.id.slice(0, 8)}</span>
              <span>·</span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
              <span>·</span>
              <span>{selected.category}</span>
            </div>

            {/* Conversation */}
            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                <span className="font-medium text-xs text-gray-400 block mb-1">Utilisateur · message initial</span>
                {selected.message}
              </div>
              {selected.support_ticket_replies?.map(reply => (
                <div key={reply.id}
                  className={`rounded-lg p-3 text-sm ${reply.author_role === "admin" ? "bg-blue-50 text-blue-900" : "bg-gray-50 text-gray-700"}`}>
                  <span className="font-medium text-xs block mb-1"
                    style={{ color: reply.author_role === "admin" ? "#1d4ed8" : "#6b7280" }}>
                    {reply.author_role === "admin" ? "Support EcomPilot" : "Utilisateur"} · {new Date(reply.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  {reply.message}
                </div>
              ))}
            </div>

            {/* Reply form */}
            <textarea
              value={replyMsg}
              onChange={e => setReplyMsg(e.target.value)}
              rows={4}
              placeholder="Répondre au ticket…"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:border-blue-400 outline-none mb-3"
            />
            <div className="flex items-center gap-3">
              <select value={replyStatus} onChange={e => setReplyStatus(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-blue-400 outline-none">
                <option value="in_progress">Marquer : En cours</option>
                <option value="resolved">Marquer : Résolu</option>
                <option value="closed">Marquer : Fermé</option>
                <option value="open">Marquer : Ouvert</option>
              </select>
              <button onClick={handleReply} disabled={sending || !replyMsg.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors">
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Envoyer
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm p-12">
            Sélectionnez un ticket pour répondre
          </div>
        )}
      </div>
    </div>
  );
}
