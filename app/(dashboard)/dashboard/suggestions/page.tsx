"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Copy, CheckCircle, Wand2, Languages, MessageSquare } from "lucide-react";

const tones = [
  { id: "professional", label: "Professionnel", icon: "💼" },
  { id: "casual", label: "Décontracté", icon: "😎" },
  { id: "luxury", label: "Luxe", icon: "✨" },
  { id: "fun", label: "Fun", icon: "🎉" },
];

const languages = [
  { id: "fr", label: "Français" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "de", label: "Deutsch" },
  { id: "it", label: "Italiano" },
];

const suggestions = [
  {
    type: "title",
    original: "T-shirt homme blanc coton",
    suggestions: [
      "T-shirt Premium Homme Coton Bio — Confort & Style au Quotidien",
      "Tee-shirt Blanc Classique — 100% Coton Peigné Ultra-Doux",
      "T-shirt Essentiel Homme — Coupe Moderne en Coton Premium",
    ],
  },
  {
    type: "description",
    original: "T-shirt blanc pour homme en coton",
    suggestions: [
      "Découvrez notre t-shirt homme en coton premium. Sa coupe moderne et son tissu ultra-doux vous accompagnent au quotidien. Idéal pour un look casual ou sous une veste.",
    ],
  },
  {
    type: "tags",
    original: "tshirt, homme",
    suggestions: [
      "t-shirt homme, coton bio, mode masculine, basique, casual wear, prêt-à-porter, blanc, confort, lifestyle, essential",
    ],
  },
];

export default function AISuggestionsPage() {
  const [selectedTone, setSelectedTone] = useState("professional");
  const [selectedLang, setSelectedLang] = useState("fr");
  const [productTitle, setProductTitle] = useState("T-shirt homme blanc coton");
  const [productDesc, setProductDesc] = useState("T-shirt blanc pour homme en coton de qualité.");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 2000);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Suggestions IA</h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>Générez des titres, descriptions et tags optimisés avec l'IA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <Wand2 className="w-5 h-5" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold" style={{ color: "#0f172a" }}>Produit source</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Titre du produit</label>
              <input type="text" value={productTitle} onChange={(e) => setProductTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Description actuelle</label>
              <textarea value={productDesc} onChange={(e) => setProductDesc(e.target.value)} rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none" style={{ color: "#0f172a" }} />
            </div>

            {/* Tone */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: "#374151" }}>
                <MessageSquare className="w-4 h-4 inline mr-1" /> Ton
              </label>
              <div className="grid grid-cols-2 gap-2">
                {tones.map((t) => (
                  <button key={t.id} onClick={() => setSelectedTone(t.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      selectedTone === t.id ? "border-blue-300" : "border-gray-200 hover:bg-gray-50"
                    }`}
                    style={selectedTone === t.id ? { backgroundColor: "#eff6ff", color: "#2563eb" } : { color: "#64748b" }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-sm font-medium block mb-2" style={{ color: "#374151" }}>
                <Languages className="w-4 h-4 inline mr-1" /> Langue
              </label>
              <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm" style={{ color: "#0f172a" }}>
                {languages.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>

            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              style={{ backgroundColor: "#2563eb", color: "#fff" }}>
              {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Génération en cours…" : "Générer les suggestions"}
            </button>

            <p className="text-xs text-center" style={{ color: "#94a3b8" }}>Coût : 3 crédits par génération complète</p>
          </div>
        </div>

        {/* Suggestions Panel */}
        <div className="lg:col-span-2 space-y-4">
          {suggestions.map((group) => (
            <div key={group.type} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold capitalize" style={{ color: "#0f172a" }}>
                  {group.type === "title" ? "📝 Titres suggérés" : group.type === "description" ? "📄 Description suggérée" : "🏷️ Tags suggérés"}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f0fdf4", color: "#059669" }}>IA</span>
              </div>

              <div className="space-y-2">
                {group.suggestions.map((s, j) => (
                  <div key={j} className="flex items-start justify-between gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                    <p className="text-sm flex-1" style={{ color: "#374151" }}>{s}</p>
                    <button onClick={() => handleCopy(s, `${group.type}-${j}`)}
                      className="p-1.5 hover:bg-gray-200 rounded-lg flex-shrink-0" title="Copier">
                      {copied === `${group.type}-${j}` ? (
                        <CheckCircle className="w-4 h-4" style={{ color: "#059669" }} />
                      ) : (
                        <Copy className="w-4 h-4" style={{ color: "#94a3b8" }} />
                      )}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs" style={{ color: "#94a3b8" }}>
                  Original : <span className="italic">{group.original}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
