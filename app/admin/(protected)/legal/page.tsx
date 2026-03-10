"use client";

import { useState } from "react";
import { Scale, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

interface Requirement {
  id: string;
  label: string;
  description: string;
  status: "ok" | "partial" | "missing";
  notes?: string;
}

const RGPD_REQUIREMENTS: { section: string; items: Requirement[] }[] = [
  {
    section: "Légitimité du traitement (Art. 6)",
    items: [
      { id: "consent", label: "Consentement explicite", description: "Les utilisateurs acceptent explicitement les CGU et la politique de confidentialité à l'inscription.", status: "ok" },
      { id: "purpose", label: "Finalité documentée", description: "Les données collectées servent uniquement à fournir le service EcomPilot (optimisation catalogue Shopify).", status: "ok" },
      { id: "minimization", label: "Minimisation des données", description: "Seuls email, boutique Shopify, et données d'usage sont collectés — pas de données sensibles.", status: "ok" },
    ],
  },
  {
    section: "Droits des personnes (Art. 15-22)",
    items: [
      { id: "access", label: "Droit d'accès", description: "Les utilisateurs peuvent exporter leurs données depuis Paramètres > Compte.", status: "partial", notes: "Export JSON disponible — améliorer la lisibilité pour les non-techniciens" },
      { id: "erasure", label: "Droit à l'effacement", description: "Suppression de compte disponible avec purge complète Supabase.", status: "ok" },
      { id: "portability", label: "Portabilité des données", description: "Export CSV/JSON des données de catalogue disponible.", status: "ok" },
      { id: "rectification", label: "Droit de rectification", description: "L'utilisateur peut modifier email et paramètres de compte.", status: "ok" },
      { id: "objection", label: "Droit d'opposition", description: "Opt-out emails marketing via lien de désinscription.", status: "partial", notes: "Lien de désinscription à ajouter dans les emails Resend" },
    ],
  },
  {
    section: "Sécurité des données (Art. 25 & 32)",
    items: [
      { id: "encryption_transit", label: "Chiffrement en transit", description: "HTTPS/TLS sur toute la plateforme via Vercel.", status: "ok" },
      { id: "encryption_rest", label: "Chiffrement au repos", description: "Supabase chiffre les données au repos (AES-256).", status: "ok" },
      { id: "access_control", label: "Contrôle d'accès RLS", description: "Row Level Security activé sur toutes les tables Supabase.", status: "ok" },
      { id: "admin_auth", label: "Authentification admin sécurisée", description: "Session HMAC-SHA256 signée, rate limiting 5 tentatives/15 min, audit log.", status: "ok" },
      { id: "api_keys", label: "Clés API et secrets", description: "Clés Shopify/Stripe stockées dans les variables d'environnement chiffrées Vercel.", status: "ok" },
    ],
  },
  {
    section: "Sous-traitants (Art. 28)",
    items: [
      { id: "supabase", label: "Supabase (BDD)", description: "DPA disponible — données hébergées EU (Frankfurt).", status: "ok" },
      { id: "vercel", label: "Vercel (hébergement)", description: "DPA disponible — conforme RGPD.", status: "ok" },
      { id: "stripe", label: "Stripe (paiements)", description: "PCI DSS Level 1 + DPA RGPD disponible.", status: "ok" },
      { id: "openai", label: "OpenAI (IA)", description: "Données de catalogue envoyées pour traitement IA — pas de données personnelles.", status: "partial", notes: "Mention explicite dans la politique de confidentialité recommandée" },
    ],
  },
  {
    section: "Documentation & gouvernance (Art. 30)",
    items: [
      { id: "privacy_policy", label: "Politique de confidentialité", description: "Politique de confidentialité publiée et accessible.", status: "partial", notes: "À vérifier : URL /privacy accessible publiquement" },
      { id: "tos", label: "Conditions Générales d'Utilisation", description: "CGU publiées et acceptées à l'inscription.", status: "partial", notes: "À vérifier : URL /terms accessible publiquement" },
      { id: "dpa_record", label: "Registre des traitements", description: "Documentation interne des activités de traitement.", status: "missing", notes: "À créer : document DOCX ou notion listant tous les traitements" },
      { id: "dpo", label: "DPO ou point de contact", description: "Contact RGPD identifiable (support@ecompilotelite.com).", status: "ok" },
    ],
  },
  {
    section: "Cookies & traceurs (Directive ePrivacy)",
    items: [
      { id: "cookie_banner", label: "Bandeau de consentement cookies", description: "Les cookies nécessaires uniquement sont utilisés (session auth).", status: "partial", notes: "Si analytics tiers ajoutés, un bandeau de consentement sera requis" },
      { id: "analytics", label: "Analytics conformes", description: "Pas d'analytics tiers actuellement.", status: "ok" },
    ],
  },
];

const statusIcon = (s: Requirement["status"]) => {
  if (s === "ok") return <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "#16a34a" }} />;
  if (s === "partial") return <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#d97706" }} />;
  return <XCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#dc2626" }} />;
};

const statusBadge = (s: Requirement["status"]) => {
  const map = { ok: ["#dcfce7", "#16a34a", "Conforme"], partial: ["#fef9c3", "#a16207", "Partiel"], missing: ["#fee2e2", "#dc2626", "Manquant"] } as const;
  const [bg, color, label] = map[s];
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: bg, color }}>{label}</span>;
};

export default function LegalPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const allItems = RGPD_REQUIREMENTS.flatMap((s) => s.items);
  const okCount = allItems.filter((i) => i.status === "ok").length;
  const partialCount = allItems.filter((i) => i.status === "partial").length;
  const missingCount = allItems.filter((i) => i.status === "missing").length;
  const score = Math.round((okCount / allItems.length) * 100);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#0f172a" }}>
            <Scale className="w-6 h-6" style={{ color: "#8b5cf6" }} />
            Conformité RGPD
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Tableau de bord de conformité légale — Règlement Général sur la Protection des Données (UE 2016/679)
          </p>
        </div>
        <a
          href="https://gdpr.eu/checklist/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium text-white"
        >
          <ExternalLink className="w-4 h-4" />
          GDPR Checklist
        </a>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Score global", value: `${score}%`, color: score >= 80 ? "#16a34a" : "#d97706", bg: "#f0fdf4" },
          { label: "Conformes", value: okCount, color: "#16a34a", bg: "#dcfce7" },
          { label: "Partiels", value: partialCount, color: "#d97706", bg: "#fef9c3" },
          { label: "Manquants", value: missingCount, color: "#dc2626", bg: "#fee2e2" },
        ].map((card) => (
          <div key={card.label} className="rounded-xl p-4 border" style={{ backgroundColor: card.bg, borderColor: card.color + "33" }}>
            <p className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</p>
            <p className="text-sm mt-0.5" style={{ color: card.color + "cc" }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-8 p-4 bg-white border border-gray-200 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "#0f172a" }}>Progression conformité</span>
          <span className="text-sm font-bold" style={{ color: score >= 80 ? "#16a34a" : "#d97706" }}>{score}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${score}%`, backgroundColor: score >= 80 ? "#16a34a" : "#d97706" }}
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {RGPD_REQUIREMENTS.map((section) => {
          const sOk = section.items.filter((i) => i.status === "ok").length;
          const isOpen = expanded[section.section] !== false; // default open
          return (
            <div key={section.section} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggle(section.section)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4" style={{ color: "#94a3b8" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                  <span className="font-semibold text-sm" style={{ color: "#0f172a" }}>{section.section}</span>
                </div>
                <span className="text-xs" style={{ color: "#64748b" }}>{sOk}/{section.items.length} conformes</span>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {section.items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-start gap-3">
                      {statusIcon(item.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "#0f172a" }}>{item.label}</span>
                          {statusBadge(item.status)}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{item.description}</p>
                        {item.notes && (
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#a16207" }}>
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-center" style={{ color: "#94a3b8" }}>
        Ce tableau de bord est informatif. Pour une conformité complète, consultez un juriste spécialisé en protection des données.
      </p>
    </div>
  );
}
