"use client";

import { useState } from "react";
import { FileText, Save, Eye, Globe, MessageSquare, CheckCircle } from "lucide-react";

const sections = [
  { id: "hero", label: "Section Héro", description: "Titre principal et sous-titre de la landing page" },
  { id: "features", label: "Fonctionnalités", description: "Liste des fonctionnalités mises en avant" },
  { id: "pricing", label: "Tarification", description: "Plans et prix affichés" },
  { id: "faq", label: "FAQ", description: "Questions fréquemment posées" },
  { id: "cta", label: "Call-to-Action", description: "Texte d'appel à l'action" },
];

export default function AdminContentPage() {
  const [activeSection, setActiveSection] = useState("hero");
  const [saved, setSaved] = useState(false);
  const [content, setContent] = useState({
    hero: {
      title: "Le copilote IA de votre catalogue Shopify",
      subtitle: "Optimisez, automatisez et développez votre e-commerce avec l'intelligence artificielle",
      cta: "Commencer gratuitement",
    },
    features: {
      title: "Tout ce dont vous avez besoin",
      subtitle: "Des outils puissants pour gérer votre catalogue",
    },
    pricing: {
      title: "Des tarifs simples et transparents",
      subtitle: "50 actions gratuites — aucune carte requise pour démarrer",
    },
    faq: {
      title: "Questions fréquentes",
      subtitle: "Tout ce que vous devez savoir sur EcomPilot",
    },
    cta: {
      title: "Prêt à booster votre catalogue ?",
      subtitle: "Démarrez votre optimisation Shopify dès aujourd'hui",
      button: "Commencer gratuitement",
    },
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const current = content[activeSection as keyof typeof content];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Gestion du contenu</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Modifiez le contenu affiché sur le site public</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50">
            <Eye className="w-4 h-4" style={{ color: "#64748b" }} />
            <span style={{ color: "#374151" }}>Prévisualiser</span>
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#dc2626", color: "#fff" }}>
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "Sauvegardé !" : "Sauvegarder"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#94a3b8" }}>Sections</p>
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === s.id ? "border" : "hover:bg-gray-50 border border-transparent"
              }`}
              style={activeSection === s.id ? { backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" } : { color: "#374151" }}>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: activeSection === s.id ? "#dc2626" : "#94a3b8" }} />
                {s.label}
              </div>
              <p className="text-xs mt-0.5 ml-6" style={{ color: "#94a3b8" }}>{s.description}</p>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-5 h-5" style={{ color: "#dc2626" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>
              {sections.find((s) => s.id === activeSection)?.label}
            </h2>
          </div>

          <div className="space-y-5">
            {Object.entries(current).map(([key, value]) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1.5 capitalize" style={{ color: "#374151" }}>
                  {key === "cta" ? "Bouton CTA" : key === "title" ? "Titre" : key === "subtitle" ? "Sous-titre" : key === "button" ? "Texte du bouton" : key}
                </label>
                {(value as string).length > 60 ? (
                  <textarea
                    value={value as string}
                    onChange={(e) => setContent({ ...content, [activeSection]: { ...current, [key]: e.target.value } })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 resize-none"
                    style={{ color: "#0f172a" }}
                  />
                ) : (
                  <input
                    type="text"
                    value={value as string}
                    onChange={(e) => setContent({ ...content, [activeSection]: { ...current, [key]: e.target.value } })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
                    style={{ color: "#0f172a" }}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 mt-0.5" style={{ color: "#d97706" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#92400e" }}>Note</p>
                <p className="text-xs mt-1" style={{ color: "#a16207" }}>
                  Les modifications seront visibles immédiatement sur le site après sauvegarde. 
                  Assurez-vous de vérifier la prévisualisation avant de publier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
