"use client";

import { useState } from "react";
import {
  ImageIcon,
  Upload,
  Wand2,
  Download,
  RotateCcw,
  Crop,
  SunMedium,
  Contrast,
  Palette,
  Sparkles,
  Trash2,
  ZoomIn,
  Lock,
} from "lucide-react";

const filters = [
  { id: "none", label: "Original", css: "" },
  { id: "bright", label: "Lumineux", css: "brightness(1.2)" },
  { id: "contrast", label: "Contraste", css: "contrast(1.3)" },
  { id: "warm", label: "Chaud", css: "sepia(0.3) saturate(1.2)" },
  { id: "cool", label: "Froid", css: "hue-rotate(20deg) saturate(0.9)" },
  { id: "bw", label: "N&B", css: "grayscale(1)" },
  { id: "vintage", label: "Vintage", css: "sepia(0.5) contrast(0.9) brightness(1.05)" },
  { id: "vivid", label: "Vif", css: "saturate(1.5) contrast(1.1)" },
];

const aiActions = [
  { id: "remove-bg", label: "Supprimer l'arrière-plan", icon: Wand2, credits: 3, description: "Détourage automatique par IA" },
  { id: "enhance", label: "Améliorer la qualité", icon: Sparkles, credits: 2, description: "Upscale et amélioration IA" },
  { id: "recolor", label: "Recoloriser", icon: Palette, credits: 3, description: "Modifier les couleurs du produit" },
  { id: "resize", label: "Redimensionner", icon: Crop, credits: 1, description: "Adapter aux formats e-commerce" },
];

const presetSizes = [
  { label: "Shopify", width: 2048, height: 2048 },
  { label: "Instagram", width: 1080, height: 1080 },
  { label: "Facebook", width: 1200, height: 630 },
  { label: "Miniature", width: 400, height: 400 },
];

export default function ImagesPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = () => {
    // Simulated upload
    setSelectedImage("/placeholder-product.jpg");
  };

  const handleAIAction = (actionId: string) => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
    }, 2000);
    console.log("AI action:", actionId);
  };

  const handleReset = () => {
    setActiveFilter("none");
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const adjustmentStyle = {
    filter: `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100}) ${filters.find(f => f.id === activeFilter)?.css || ""}`.trim(),
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>
            Éditeur d&apos;images
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Retouchez et optimisez vos images produits avec l&apos;IA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: "#dbeafe", color: "#2563eb" }}>
            Plan Pro requis
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zone de travail */}
        <div className="lg:col-span-2 space-y-4">
          {/* Canvas */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {!selectedImage ? (
              <div
                className={`flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-xl m-4 transition-colors ${
                  dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(); }}
              >
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7" style={{ color: "#94a3b8" }} />
                </div>
                <p className="font-medium" style={{ color: "#0f172a" }}>
                  Glissez une image ici
                </p>
                <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
                  ou cliquez pour sélectionner (PNG, JPG, WebP — max 10 MB)
                </p>
                <button
                  onClick={handleUpload}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ backgroundColor: "#2563eb" }}
                >
                  Choisir un fichier
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100" style={{ backgroundColor: "#fafafa" }}>
                  <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-1.5 rounded hover:bg-gray-200 transition-colors" title="Réinitialiser">
                      <RotateCcw className="w-4 h-4" style={{ color: "#64748b" }} />
                    </button>
                    <button className="p-1.5 rounded hover:bg-gray-200 transition-colors" title="Zoom">
                      <ZoomIn className="w-4 h-4" style={{ color: "#64748b" }} />
                    </button>
                    <button className="p-1.5 rounded hover:bg-gray-200 transition-colors" title="Recadrer">
                      <Crop className="w-4 h-4" style={{ color: "#64748b" }} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors" style={{ color: "#64748b" }}>
                      <Download className="w-4 h-4" />
                      Exporter
                    </button>
                    <button
                      onClick={() => { setSelectedImage(null); handleReset(); }}
                      className="p-1.5 rounded hover:bg-red-100 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                    </button>
                  </div>
                </div>

                {/* Image preview area */}
                <div className="flex items-center justify-center p-8 min-h-[400px]" style={{ backgroundColor: "#f1f5f9" }}>
                  <div className="relative rounded-lg overflow-hidden shadow-lg" style={adjustmentStyle}>
                    <div className="w-80 h-80 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <ImageIcon className="w-16 h-16" style={{ color: "#94a3b8" }} />
                    </div>
                  </div>

                  {processing && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Traitement IA en cours...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filtres */}
          {selectedImage && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Filtres rapides</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
                      activeFilter === filter.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"
                      style={{ filter: filter.css || undefined }}
                    >
                      <ImageIcon className="w-5 h-5" style={{ color: "#94a3b8" }} />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: activeFilter === filter.id ? "#2563eb" : "#64748b" }}>
                      {filter.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panneau latéral */}
        <div className="space-y-4">
          {/* Actions IA */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4" style={{ color: "#2563eb" }} />
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Actions IA</h3>
            </div>
            <div className="space-y-2">
              {aiActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleAIAction(action.id)}
                    disabled={!selectedImage || processing}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#eff6ff" }}>
                      <Icon className="w-4 h-4" style={{ color: "#2563eb" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{action.label}</p>
                      <p className="text-[11px]" style={{ color: "#94a3b8" }}>{action.description}</p>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                      {action.credits} cr
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ajustements */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-4" style={{ color: "#0f172a" }}>Ajustements</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "#64748b" }}>
                    <SunMedium className="w-3.5 h-3.5" /> Luminosité
                  </label>
                  <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "#64748b" }}>
                    <Contrast className="w-3.5 h-3.5" /> Contraste
                  </label>
                  <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "#64748b" }}>
                    <Palette className="w-3.5 h-3.5" /> Saturation
                  </label>
                  <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>{saturation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturation}
                  onChange={(e) => setSaturation(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Formats prédéfinis */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Formats d&apos;export</h3>
            <div className="grid grid-cols-2 gap-2">
              {presetSizes.map((preset) => (
                <button
                  key={preset.label}
                  disabled={!selectedImage}
                  className="p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 transition-all text-left disabled:opacity-50"
                >
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{preset.label}</p>
                  <p className="text-[10px]" style={{ color: "#94a3b8" }}>{preset.width}×{preset.height}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Gating */}
          <div className="rounded-xl border border-amber-200 p-4" style={{ backgroundColor: "#fffbeb" }}>
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4" style={{ color: "#d97706" }} />
              <h3 className="text-sm font-semibold" style={{ color: "#92400e" }}>Fonctionnalité Pro</h3>
            </div>
            <p className="text-xs" style={{ color: "#a16207" }}>
              L&apos;édition d&apos;images IA est disponible à partir du plan Pro. Passez au niveau supérieur pour débloquer le détourage automatique, l&apos;amélioration et la recolorisation.
            </p>
            <a
              href="/dashboard/billing"
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: "#d97706" }}
            >
              Passer au Pro
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
