"use client";

import { useState } from "react";
import { Send, Mail, RefreshCw, Users } from "lucide-react";
import { useToast } from "@/lib/toast";

const PLAN_OPTIONS = [
  { value: "all", label: "Tous les utilisateurs" },
  { value: "free", label: "Plan Free uniquement" },
  { value: "starter", label: "Plan Starter uniquement" },
  { value: "pro", label: "Plan Pro uniquement" },
  { value: "agency", label: "Plan Agency uniquement" },
  { value: "paid", label: "Tous les payants (starter+pro+agency)" },
];

const TEMPLATES = [
  {
    id: "new_feature",
    label: "Nouvelle fonctionnalité",
    subject: "🚀 Nouvelle fonctionnalité CatalogSaaS",
    body: "Bonjour,\n\nNous avons le plaisir de vous annoncer une nouvelle fonctionnalité : [FEATURE_NAME].\n\n[DESCRIPTION]\n\nDécouvrez-la maintenant dans votre tableau de bord.\n\nCordialement,\nL'équipe CatalogSaaS",
  },
  {
    id: "maintenance",
    label: "Maintenance planifiée",
    subject: "⚠️ Maintenance planifiée CatalogSaaS",
    body: "Bonjour,\n\nNous vous informons d'une maintenance planifiée le [DATE] entre [HEURE_DEBUT] et [HEURE_FIN].\n\nPendant cette période, le service sera temporairement indisponible.\n\nMerci de votre compréhension,\nL'équipe CatalogSaaS",
  },
  {
    id: "promo",
    label: "Offre promotionnelle",
    subject: "🎁 Offre exclusive pour vous",
    body: "Bonjour,\n\nNous avons une offre exclusive pour vous : [OFFRE].\n\nUtilisez le code promo [CODE] pour en profiter jusqu'au [DATE].\n\nCordialement,\nL'équipe CatalogSaaS",
  },
];

export default function EmailsPage() {
  const { addToast } = useToast();
  const [segment, setSegment] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(false);

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setSubject(tpl.subject);
    setBody(tpl.body);
  };

  const send = async () => {
    if (!subject.trim() || !body.trim()) {
      addToast("Sujet et corps requis", "error");
      return;
    }
    if (!confirm(`Envoyer cet email à : "${PLAN_OPTIONS.find(p => p.value === segment)?.label}" ?`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/emails/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, subject, body }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast(`Email envoyé à ${data.count || 0} destinataires`, "success");
        setSubject("");
        setBody("");
      } else {
        addToast(data.error || "Erreur lors de l'envoi", "error");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>✉️ Emails broadcast</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>Envoyez des emails à un segment de vos utilisateurs</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-4">
          {/* Segment */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#0f172a" }}>
              <Users className="w-4 h-4 text-blue-600" /> Segment destinataires
            </h2>
            <div className="flex flex-wrap gap-2">
              {PLAN_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setSegment(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    segment === opt.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Compose */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#0f172a" }}>
              <Mail className="w-4 h-4 text-blue-600" /> Composer l&apos;email
            </h2>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Sujet</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Sujet de l'email..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: "#374151" }}>Corps de l&apos;email</label>
                <button onClick={() => setPreview(p => !p)}
                  className="text-xs text-blue-600 hover:underline">{preview ? "Éditer" : "Aperçu"}</button>
              </div>
              {preview ? (
                <div className="w-full min-h-32 px-3 py-2 border border-gray-200 rounded-lg text-sm whitespace-pre-wrap" style={{ color: "#374151", backgroundColor: "#f8fafc" }}>
                  {body || <span className="text-gray-400">Rien à afficher</span>}
                </div>
              ) : (
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  placeholder="Texte de votre email..."
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" style={{ color: "#0f172a" }} />
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button onClick={send} disabled={sending || !subject || !body}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-sm font-semibold text-white">
                {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Envoi en cours…" : "Envoyer"}
              </button>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Templates</h2>
            <div className="space-y-2">
              {TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                  className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{tpl.label}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "#94a3b8" }}>{tpl.subject}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <p className="text-xs font-medium text-blue-800 mb-1">⚠️ Important</p>
            <p className="text-xs text-blue-700 leading-relaxed">
              L&apos;envoi d&apos;emails en masse nécessite une configuration SMTP ou Resend/Sendgrid dans les variables d&apos;environnement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
