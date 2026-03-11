"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, ChevronDown, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface Props {
  plan?: string;
  currentPage?: string;
}

const QUICK_SUGGESTIONS = [
  "Comment connecter Shopify ?",
  "Optimiser mes fiches produits",
  "Modifier les prix en masse",
];

function MsgContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const isBullet = line.trimStart().startsWith("•");
        const content = line.replace(/^[\s•]+/, "");
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
            : part
        );
        if (isBullet) {
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span>{parts}</span>
            </div>
          );
        }
        return <p key={i}>{parts}</p>;
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-blue-400 inline-block"
          style={{ animation: `chatBounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
    </div>
  );
}

export default function AIChatWidget({ plan, currentPage }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour 👋 Je suis l'assistant EcomPilot.\nComment puis-je vous aider aujourd'hui ?",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      inputRef.current?.focus();
      setUnread(false);
    }
  }, [messages, open]);

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          currentPage,
          plan,
        }),
      });
      const data = await res.json();
      const reply = data.message || data.error || "Une erreur est survenue.";
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: reply }]);
      if (!open) setUnread(true);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Erreur réseau. Réessayez." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes chatBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes chatSlideUp { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes chatPulseRing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.5);opacity:0} }
      `}</style>

      {/* FAB button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setUnread(false); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)" }}
          aria-label="Ouvrir l'assistant IA"
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)", animation: "chatPulseRing 2s ease-out infinite" }}
          />
          <Sparkles className="w-6 h-6 relative z-10" />
          {unread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white text-[9px] font-bold text-white flex items-center justify-center">!</span>
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl overflow-hidden w-[340px] sm:w-[380px]"
          style={{
            height: 520,
            boxShadow: "0 24px 60px rgba(0,0,0,0.18), 0 8px 20px rgba(37,99,235,0.15)",
            animation: "chatSlideUp .22s ease-out",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center ring-2 ring-white/30">
                <Sparkles className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">Assistant EcomPilot</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <p className="text-[11px] text-white/70">En ligne · IA active</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/25 transition-colors flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ background: "#f8fafc" }}>
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`flex gap-2 items-end ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5"
                    style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)" }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mb-0.5 bg-gray-200">
                    <User className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    msg.role === "user"
                      ? "text-white rounded-2xl rounded-br-md"
                      : "text-gray-800 rounded-2xl rounded-bl-md border border-white"
                  }`}
                  style={msg.role === "user"
                    ? { background: "linear-gradient(135deg,#2563eb,#4f46e5)" }
                    : { background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }
                  }
                >
                  {msg.role === "assistant" ? <MsgContent text={msg.content} /> : msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 items-end">
                <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)" }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-md border border-white"
                  style={{ background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.07)" }}>
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Quick suggestions — only before any user message */}
            {messages.length === 1 && !loading && (
              <div className="pt-1 space-y-1.5">
                <p className="text-[11px] text-gray-400 font-medium px-1">Suggestions rapides</p>
                {QUICK_SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="w-full text-left px-3 py-2 rounded-xl text-[12px] text-blue-700 font-medium border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    style={{ background: "#eff6ff" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 px-3 py-3 border-t border-gray-100" style={{ background: "#ffffff" }}>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez votre message…"
                maxLength={500}
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none py-1"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all flex-shrink-0 disabled:opacity-40 hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)" }}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-gray-300 text-center mt-1.5">Powered by EcomPilot AI</p>
          </div>
        </div>
      )}
    </>
  );
}
