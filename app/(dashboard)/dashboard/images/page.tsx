"use client";

import { useState, useRef, useCallback } from "react";
import {
  ImageIcon, Upload, Wand2, Download, RotateCcw, SunMedium,
  Contrast, Palette, Sparkles, Trash2, Loader2, X,
  CheckCircle2, ArrowRight, Plus,
} from "lucide-react";
import { useToast } from "@/lib/toast";

interface ImageFile {
  id: string;
  name: string;
  originalUrl: string;
  processedUrl?: string;
  size: number;
  processedSize?: number;
  compression?: number;
}

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

const presetSizes = [
  { label: "Shopify", width: 2048, height: 2048 },
  { label: "Instagram", width: 1080, height: 1080 },
  { label: "Facebook", width: 1200, height: 630 },
  { label: "Miniature", width: 400, height: 400 },
  { label: "Banner", width: 1920, height: 600 },
  { label: "Carré HD", width: 1500, height: 1500 },
];

export default function ImagesPage() {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [outputFormat, setOutputFormat] = useState("webp");
  const [quality, setQuality] = useState(80);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });

  const selectedImage = selectedIdx !== null ? images[selectedIdx] : null;

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newImages: ImageFile[] = [];
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      newImages.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        originalUrl: url,
        size: file.size,
      });
    });
    setImages((prev) => [...prev, ...newImages]);
    if (newImages.length > 0 && selectedIdx === null) setSelectedIdx(images.length);
    addToast(`${newImages.length} image${newImages.length > 1 ? "s" : ""} ajoutée${newImages.length > 1 ? "s" : ""}`, "success");
  }, [images.length, selectedIdx, addToast]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const processImage = async (imageFile: ImageFile, action: string, width = 0, height = 0) => {
    setProcessing(true);
    try {
      // Fetch the original file blob
      const blob = await fetch(imageFile.originalUrl).then((r) => r.blob());
      const formData = new FormData();
      formData.append("file", blob, imageFile.name);
      formData.append("action", action);
      formData.append("format", outputFormat);
      formData.append("quality", quality.toString());
      formData.append("brightness", (brightness / 100).toString());
      formData.append("contrast", (contrast / 100).toString());
      formData.append("saturation", (saturation / 100).toString());
      if (width) formData.append("width", width.toString());
      if (height) formData.append("height", height.toString());

      const res = await fetch("/api/images/process", { method: "POST", body: formData });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur (${res.status})`);
      }
      
      const data = await res.json();

      if (!data.image) {
        throw new Error("Aucune image retournée par le serveur");
      }

      setImages((prev) => prev.map((img) =>
        img.id === imageFile.id
          ? { ...img, processedUrl: data.image, processedSize: data.processedSize, compression: data.compression }
          : img
      ));
      addToast(`Image traitée — ${data.compression}% de compression`, "success");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur de traitement";
      addToast(`Échec : ${errorMsg}`, "error");
      console.error("Image processing error:", err);
    }
    setProcessing(false);
  };

  const handleBatchProcess = async (action: string, width = 0, height = 0) => {
    if (images.length === 0) {
      addToast("Aucune image à traiter — ajoutez des images d'abord", "error");
      return;
    }
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: images.length });
    let imgDone = 0;
    let errors = 0;
    for (const img of images) {
      try {
        await processImage(img, action, width, height);
      } catch {
        errors++;
      }
      imgDone++;
      setBatchProgress({ current: imgDone, total: images.length });
    }
    const successCount = imgDone - errors;
    addToast(`${successCount} image${successCount > 1 ? "s" : ""} traitée${successCount > 1 ? "s" : ""}${errors > 0 ? `, ${errors} erreur${errors > 1 ? "s" : ""}` : ""}`, errors > 0 ? "error" : "success");
    setBatchProcessing(false);
  };

  const handleReset = () => {
    setActiveFilter("none");
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const downloadImage = (img: ImageFile) => {
    const url = img.processedUrl || img.originalUrl;
    const a = document.createElement("a");
    a.href = url;
    a.download = img.name.replace(/\.[^.]+$/, `.${outputFormat}`);
    a.click();
  };

  const downloadAll = () => {
    images.forEach((img) => downloadImage(img));
    addToast(`${images.length} image${images.length > 1 ? "s" : ""} téléchargée${images.length > 1 ? "s" : ""}`, "success");
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx !== null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
  };

  const adjustmentStyle = {
    filter: `brightness(${brightness / 100}) contrast(${contrast / 100}) saturate(${saturation / 100}) ${filters.find((f) => f.id === activeFilter)?.css || ""}`.trim(),
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: "#0f172a" }}>Éditeur d&apos;images</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Importez, retouchez et exportez vos images
            {images.length > 0 && <span className="ml-1 font-medium">· {images.length} image{images.length > 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {images.length > 0 && (
            <>
              <button onClick={() => handleBatchProcess("adjust")} disabled={batchProcessing}
                className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                {batchProcessing ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Sparkles className="w-4 h-4" style={{ color: "#fff" }} />}
                <span style={{ color: "#fff" }}>{batchProcessing ? `${batchProgress.current}/${batchProgress.total}` : "Traiter tout"}</span>
              </button>
              <button onClick={downloadAll} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50" style={{ color: "#374151" }}>
                <Download className="w-4 h-4" /> Tout télécharger
              </button>
            </>
          )}
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" style={{ color: "#fff" }} /><span style={{ color: "#fff" }}>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Image thumbnails strip */}
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <div key={img.id} onClick={() => setSelectedIdx(idx)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${selectedIdx === idx ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300"}`}>
              <img src={img.processedUrl || img.originalUrl} alt={img.name} className="w-full h-full object-cover" />
              {img.processedUrl && (
                <div className="absolute top-0.5 right-0.5"><CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#059669" }} /></div>
              )}
              <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                className="absolute bottom-0.5 right-0.5 p-0.5 bg-black/50 rounded hover:bg-black/70">
                <X className="w-2.5 h-2.5" style={{ color: "#fff" }} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Canvas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {!selectedImage ? (
              <div className={`flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-xl m-4 transition-colors ${dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}>
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Upload className="w-7 h-7" style={{ color: "#94a3b8" }} />
                </div>
                <p className="font-medium" style={{ color: "#0f172a" }}>Glissez des images ici</p>
                <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>ou cliquez pour sélectionner (PNG, JPG, WebP — max 10 MB)</p>
                <button onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "#2563eb", color: "#fff" }}>
                  Choisir des fichiers
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100" style={{ backgroundColor: "#fafafa" }}>
                  <div className="flex items-center gap-2">
                    <button onClick={handleReset} className="p-1.5 rounded hover:bg-gray-200" title="Réinitialiser">
                      <RotateCcw className="w-4 h-4" style={{ color: "#64748b" }} />
                    </button>
                    <span className="text-xs truncate max-w-[200px]" style={{ color: "#64748b" }}>{selectedImage.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded" style={{ color: "#94a3b8" }}>{formatSize(selectedImage.size)}</span>
                    {selectedImage.compression !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 rounded font-medium" style={{ color: "#059669" }}>-{selectedImage.compression}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => downloadImage(selectedImage)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200" style={{ color: "#64748b" }}>
                      <Download className="w-4 h-4" /> Exporter
                    </button>
                    <button onClick={() => removeImage(selectedIdx!)} className="p-1.5 rounded hover:bg-red-100" title="Supprimer">
                      <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="flex items-center justify-center p-8 min-h-[400px]" style={{ backgroundColor: "#f1f5f9" }}>
                  <div className="relative rounded-lg overflow-hidden shadow-lg max-w-full max-h-[400px]" style={adjustmentStyle}>
                    <img src={selectedImage.processedUrl || selectedImage.originalUrl} alt={selectedImage.name}
                      className="max-w-full max-h-[400px] object-contain" />
                  </div>
                  {processing && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#2563eb" }} />
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Traitement en cours...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          {selectedImage && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>Filtres rapides</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <button key={filter.id} onClick={() => setActiveFilter(filter.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${activeFilter === filter.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <div className="w-14 h-14 rounded-lg overflow-hidden" style={{ filter: filter.css || undefined }}>
                      <img src={selectedImage.originalUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] font-medium" style={{ color: activeFilter === filter.id ? "#2563eb" : "#64748b" }}>{filter.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Step 1: Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold" style={{ color: "#fff" }}>1</span>
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Traitement</h3>
            </div>
            <p className="text-[11px] mb-3" style={{ color: "#94a3b8" }}>Sélectionnez une image puis cliquez sur une action</p>
            <div className="space-y-2">
              {[
                { id: "enhance", label: "Améliorer la qualité", icon: Sparkles, desc: "Netteté + couleurs optimisées" },
                { id: "adjust", label: "Appliquer ajustements", icon: SunMedium, desc: "Applique luminosité, contraste, saturation ci-dessous" },
                { id: "grayscale", label: "Noir et blanc", icon: Palette, desc: "Convertir en niveaux de gris" },
              ].map((action) => (
                <button key={action.id} onClick={() => selectedImage && processImage(selectedImage, action.id)}
                  disabled={!selectedImage || processing}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#eff6ff" }}>
                    <action.icon className="w-4 h-4" style={{ color: "#2563eb" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{action.label}</p>
                    <p className="text-[11px]" style={{ color: "#94a3b8" }}>{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Adjustments */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold" style={{ color: "#fff" }}>2</span>
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Ajustements</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "Luminosité", icon: SunMedium, value: brightness, set: setBrightness, min: 50, max: 150 },
                { label: "Contraste", icon: Contrast, value: contrast, set: setContrast, min: 50, max: 150 },
                { label: "Saturation", icon: Palette, value: saturation, set: setSaturation, min: 0, max: 200 },
              ].map((adj) => (
                <div key={adj.label}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "#64748b" }}>
                      <adj.icon className="w-3.5 h-3.5" /> {adj.label}
                    </label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => adj.set(Math.max(adj.min, adj.value - 10))} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-xs hover:bg-gray-100" style={{ color: "#64748b" }}>−</button>
                      <span className="text-xs font-mono w-10 text-center" style={{ color: "#94a3b8" }}>{adj.value}%</span>
                      <button onClick={() => adj.set(Math.min(adj.max, adj.value + 10))} className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-xs hover:bg-gray-100" style={{ color: "#64748b" }}>+</button>
                    </div>
                  </div>
                  <input type="range" min={adj.min} max={adj.max} value={adj.value}
                    onChange={(e) => adj.set(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
                </div>
              ))}
              <button onClick={handleReset} className="w-full py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 mt-1" style={{ color: "#64748b" }}>
                <RotateCcw className="w-3 h-3 inline mr-1" /> Réinitialiser les valeurs
              </button>
            </div>
          </div>

          {/* Step 3: Output format & Resize */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold" style={{ color: "#fff" }}>3</span>
              </div>
              <h3 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Export</h3>
            </div>

            {/* Format */}
            <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>Format de sortie</p>
            <div className="flex gap-2 mb-4">
              {["webp", "png", "jpeg"].map((fmt) => (
                <button key={fmt} onClick={() => setOutputFormat(fmt)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border text-center ${outputFormat === fmt ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  style={{ color: outputFormat === fmt ? "#2563eb" : "#64748b" }}>{fmt.toUpperCase()}</button>
              ))}
            </div>

            {/* Quality */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: "#64748b" }}>Qualité</label>
                <div className="flex items-center gap-1">
                  {[60, 80, 100].map((q) => (
                    <button key={q} onClick={() => setQuality(q)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${quality === q ? "bg-blue-100" : "hover:bg-gray-100"}`}
                      style={{ color: quality === q ? "#2563eb" : "#94a3b8" }}>{q}%</button>
                  ))}
                </div>
              </div>
              <input type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
            </div>

            {/* Resize presets */}
            <p className="text-xs font-medium mb-2" style={{ color: "#64748b" }}>Redimensionner</p>          {/* Preset sizes */}
          
            <div className="grid grid-cols-2 gap-2">
              {presetSizes.map((preset) => (
                <button key={preset.label}
                  onClick={() => selectedImage && processImage(selectedImage, "resize", preset.width, preset.height)}
                  disabled={!selectedImage || processing}
                  className="p-2.5 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left disabled:opacity-50">
                  <p className="text-xs font-medium" style={{ color: "#0f172a" }}>{preset.label}</p>
                  <p className="text-[10px]" style={{ color: "#94a3b8" }}>{preset.width}×{preset.height}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
