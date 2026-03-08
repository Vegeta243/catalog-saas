"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, Download, Loader2, X, CheckCircle2, Plus, Package,
  Sparkles, SunMedium, Contrast, Palette, RotateCcw, RefreshCw,
  ImageIcon, ArrowUpDown, ChevronDown, ChevronRight,
} from "lucide-react";
import { useToast } from "@/lib/toast";

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface ShopifyProduct {
  productId: string;
  productTitle: string;
  images: { id: string; src: string; alt: string }[];
}

interface ImageItem {
  idx: number;
  productId: string;
  productTitle: string;
  shopifyImageId: string;
  src: string;
  name: string;
}

/* ─── Filter definitions ──────────────────────────────────────────────────── */
const FILTERS = [
  { id: "original", name: "Original", css: "" },
  { id: "lumineux", name: "Lumineux", css: "brightness(1.2)" },
  { id: "contraste", name: "Contraste", css: "contrast(1.4) brightness(0.95)" },
  { id: "chaud", name: "Chaud", css: "sepia(0.3) saturate(1.2) brightness(1.05)" },
  { id: "froid", name: "Froid", css: "hue-rotate(20deg) saturate(0.9) brightness(1.05)" },
  { id: "nb", name: "N&B", css: "grayscale(1)" },
  { id: "vintage", name: "Vintage", css: "sepia(0.4) contrast(0.9) brightness(0.95)" },
  { id: "vif", name: "Vif", css: "saturate(1.5) contrast(1.1)" },
];

const RESIZE_PRESETS = [
  { label: "Shopify", width: 2048, height: 2048 },
  { label: "Instagram", width: 1080, height: 1080 },
  { label: "Facebook", width: 1200, height: 630 },
  { label: "Miniature", width: 400, height: 400 },
  { label: "Banner", width: 1920, height: 600 },
  { label: "Carre HD", width: 1500, height: 1500 },
];

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ImagesPage() {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<"shopify" | "local">("shopify");
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [loadingShopify, setLoadingShopify] = useState(false);
  const [shopifyLoaded, setShopifyLoaded] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<Set<string>>(new Set());

  const [loadedImages, setLoadedImages] = useState<ImageItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [processedImages, setProcessedImages] = useState<Record<number, string>>({});

  const [activeFilter, setActiveFilter] = useState("original");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [sharpness, setSharpness] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<"webp" | "jpeg" | "png">("webp");
  const [quality, setQuality] = useState(80);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);

  /* Load Shopify products */
  const loadShopifyProducts = useCallback(async () => {
    if (loadingShopify || shopifyLoaded) return;
    setLoadingShopify(true);
    try {
      const res = await fetch("/api/shopify/images");
      if (!res.ok) throw new Error("Erreur chargement");
      const data = await res.json();
      setShopifyProducts(data.products || []);
      setShopifyLoaded(true);
      if ((data.products || []).length === 0)
        addToast("Aucune image produit - connectez votre boutique Shopify", "error");
    } catch {
      addToast("Impossible de charger les images - boutique non connectee", "error");
      setShopifyLoaded(true);
    }
    setLoadingShopify(false);
  }, [loadingShopify, shopifyLoaded, addToast]);

  useEffect(() => {
    if (source === "shopify") loadShopifyProducts();
  }, [source, loadShopifyProducts]);

  const togglePending = (productId: string, imageId: string) => {
    const key = `${productId}/${imageId}`;
    setPendingImages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const loadSelectedIntoEditor = () => {
    const newItems: ImageItem[] = [];
    let startIdx = loadedImages.length;
    shopifyProducts.forEach((product) => {
      product.images.forEach((img) => {
        const key = `${product.productId}/${img.id}`;
        if (!pendingImages.has(key)) return;
        if (loadedImages.some((li) => li.shopifyImageId === img.id)) return;
        newItems.push({
          idx: startIdx++,
          productId: product.productId,
          productTitle: product.productTitle,
          shopifyImageId: img.id,
          src: img.src,
          name: `${product.productTitle}-${img.id}.jpg`,
        });
      });
    });
    if (newItems.length === 0) { addToast("Aucune image selectionnee", "error"); return; }
    setLoadedImages((prev) => [...prev, ...newItems]);
    setActiveIndex(newItems[0].idx);
    const sel = new Set(selectedIndices);
    newItems.forEach((i) => sel.add(i.idx));
    setSelectedIndices(sel);
    setPendingImages(new Set());
    addToast(`${newItems.length} image${newItems.length > 1 ? "s" : ""} chargee${newItems.length > 1 ? "s" : ""} dans l'editeur`, "success");
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const newItems: ImageItem[] = [];
    let startIdx = loadedImages.length;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size > 10 * 1024 * 1024) { addToast(`${file.name} trop volumineux (max 10 MB)`, "error"); return; }
      newItems.push({
        idx: startIdx++,
        productId: "",
        productTitle: file.name.replace(/\.[^.]+$/, ""),
        shopifyImageId: "",
        src: URL.createObjectURL(file),
        name: file.name,
      });
    });
    if (newItems.length === 0) return;
    setLoadedImages((prev) => [...prev, ...newItems]);
    setActiveIndex(newItems[0].idx);
    const sel = new Set(selectedIndices);
    newItems.forEach((i) => sel.add(i.idx));
    setSelectedIndices(sel);
    addToast(`${newItems.length} image${newItems.length > 1 ? "s" : ""} ajoutee${newItems.length > 1 ? "s" : ""}`, "success");
  }, [loadedImages.length, selectedIndices, addToast]);

  const getDisplaySrc = (idx: number): string => {
    const item = loadedImages[idx];
    if (!item) return "";
    return showOriginal ? item.src : (processedImages[idx] || item.src);
  };

  const fetchAsBase64 = async (src: string): Promise<string> => {
    const res = await fetch(src);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const callProcess = async (srcBase64: string, operation: string, extraParams: Record<string, unknown> = {}): Promise<string> => {
    const res = await fetch("/api/images/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: srcBase64,
        operation,
        params: { format: selectedFormat, quality, ...extraParams },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { details?: string; error?: string }).details || (err as { error?: string }).error || `Erreur serveur ${res.status}`);
    }
    const data = await res.json() as { result?: string };
    if (!data.result) throw new Error("Aucun resultat retourne");
    return data.result;
  };

  const applyToActive = async (operation: string, extraParams: Record<string, unknown> = {}) => {
    if (loadedImages.length === 0) { addToast("Chargez d'abord des images", "error"); return; }
    setIsProcessing(true);
    setShowOriginal(false);
    try {
      const currentSrc = processedImages[activeIndex] || loadedImages.find((i) => i.idx === activeIndex)?.src || "";
      const b64 = currentSrc.startsWith("data:") ? currentSrc : await fetchAsBase64(currentSrc);
      const result = await callProcess(b64, operation, extraParams);
      setProcessedImages((prev) => ({ ...prev, [activeIndex]: result }));
      addToast("Image traitee", "success");
    } catch (err) {
      addToast(`Echec : ${(err as Error).message}`, "error");
    }
    setIsProcessing(false);
  };

  const applyFilter = async (filterId: string) => {
    setActiveFilter(filterId);
    if (filterId === "original") {
      setProcessedImages((prev) => { const next = { ...prev }; delete next[activeIndex]; return next; });
      return;
    }
    await applyToActive("filter", { filter: filterId });
  };

  const handleReset = () => {
    setBrightness(100); setContrast(100); setSaturation(100); setSharpness(0);
    setActiveFilter("original");
    setProcessedImages((prev) => { const next = { ...prev }; delete next[activeIndex]; return next; });
  };

  const applyAdjustments = () => applyToActive("adjustments", { brightness, contrast, saturation, sharpness });

  const applyResize = (w: number, h: number) => applyToActive("resize", { width: w, height: h });

  const applyToAll = async (operation: string, extraParams: Record<string, unknown> = {}) => {
    const targets = loadedImages.filter((img) => selectedIndices.has(img.idx));
    if (targets.length === 0) { addToast("Aucune image selectionnee", "error"); return; }
    setBatchProcessing(true); setProgress(0);
    let done = 0;
    for (const img of targets) {
      try {
        const currentSrc = processedImages[img.idx] || img.src;
        const b64 = currentSrc.startsWith("data:") ? currentSrc : await fetchAsBase64(currentSrc);
        const result = await callProcess(b64, operation, extraParams);
        setProcessedImages((prev) => ({ ...prev, [img.idx]: result }));
      } catch { /* continue */ }
      done++;
      setProgress(Math.round((done / targets.length) * 100));
    }
    addToast(`${done} image${done > 1 ? "s" : ""} traitee${done > 1 ? "s" : ""}`, "success");
    setBatchProcessing(false); setProgress(0);
  };

  const downloadImages = async () => {
    const targets = loadedImages.map((img) => ({
      data: processedImages[img.idx] || img.src,
      name: `${img.productTitle || "image"}-${img.idx + 1}-edited.${selectedFormat}`,
    }));
    if (targets.length === 0) { addToast("Aucune image a telecharger", "error"); return; }
    if (targets.length === 1) {
      let dataUrl = targets[0].data;
      if (!dataUrl.startsWith("data:")) dataUrl = await fetchAsBase64(dataUrl);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = targets[0].name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      for (const f of targets) {
        let dataUrl = f.data;
        if (!dataUrl.startsWith("data:")) dataUrl = await fetchAsBase64(dataUrl);
        const b64 = dataUrl.split(",")[1];
        zip.file(f.name, b64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ecompilot-images-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast(`${targets.length} images telechargees en ZIP`, "success");
    }
  };

  const pushToShopify = async () => {
    const targets = loadedImages.filter(
      (img) => img.shopifyImageId && processedImages[img.idx] !== undefined && selectedIndices.has(img.idx)
    );
    if (targets.length === 0) {
      addToast("Aucune image editee avec un produit Shopify associe", "error");
      return;
    }
    setBatchProcessing(true); setProgress(0);
    let success = 0;
    for (let i = 0; i < targets.length; i++) {
      const img = targets[i];
      try {
        const res = await fetch("/api/shopify/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: img.productId,
            imageId: img.shopifyImageId,
            imageBase64: processedImages[img.idx],
            filename: `${img.productTitle}-edited.${selectedFormat}`,
          }),
        });
        if (res.ok) success++;
      } catch { /* continue */ }
      setProgress(Math.round(((i + 1) / targets.length) * 100));
    }
    addToast(`${success}/${targets.length} image${success > 1 ? "s" : ""} mise${success > 1 ? "s" : ""} a jour sur Shopify`, "success");
    setBatchProcessing(false); setProgress(0);
  };

  const removeImage = (idx: number) => {
    setLoadedImages((prev) => prev.filter((i) => i.idx !== idx));
    setSelectedIndices((prev) => { const n = new Set(prev); n.delete(idx); return n; });
    setProcessedImages((prev) => { const n = { ...prev }; delete n[idx]; return n; });
    const remaining = loadedImages.filter((i) => i.idx !== idx);
    if (activeIndex === idx) setActiveIndex(remaining[0]?.idx ?? 0);
  };

  const activeItem = loadedImages.find((i) => i.idx === activeIndex) || loadedImages[0] || null;
  const activeSrc = activeItem ? getDisplaySrc(activeItem.idx) : "";
  const editedShopifyCount = loadedImages.filter((img) => img.shopifyImageId && processedImages[img.idx] !== undefined && selectedIndices.has(img.idx)).length;

  return (
    <div className="space-y-4">
      <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)} />

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold" style={{ color: "#0f172a" }}>Editeur d&apos;images</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
          Retouchez vos images produits et appliquez-les directement sur Shopify
        </p>
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 items-start">

        {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex border-b border-gray-200">
            {(["shopify", "local"] as const).map((tab) => (
              <button key={tab} onClick={() => setSource(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${source === tab ? "bg-blue-50 border-b-2 border-blue-500" : "hover:bg-gray-50"}`}
                style={{ color: source === tab ? "#2563eb" : "#64748b" }}>
                {tab === "shopify" ? <Package className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {tab === "shopify" ? "Shopify" : "Mes fichiers"}
              </button>
            ))}
          </div>

          {source === "shopify" && (
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                <span className="text-xs font-medium" style={{ color: "#64748b" }}>
                  {shopifyLoaded ? `${shopifyProducts.length} produit${shopifyProducts.length !== 1 ? "s" : ""}` : "Chargement..."}
                </span>
                <button onClick={() => { setShopifyLoaded(false); setShopifyProducts([]); }}
                  className="p-1 rounded hover:bg-gray-100" title="Actualiser">
                  <RefreshCw className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                </button>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                {loadingShopify ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" style={{ color: "#3b82f6" }} />
                    <p className="text-xs" style={{ color: "#64748b" }}>Chargement...</p>
                  </div>
                ) : shopifyProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Package className="w-10 h-10 mb-3" style={{ color: "#cbd5e1" }} />
                    <p className="text-sm font-medium" style={{ color: "#64748b" }}>Aucun produit Shopify</p>
                    <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>Connectez votre boutique dans les parametres</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {shopifyProducts.map((product) => (
                      <div key={product.productId}>
                        <button
                          onClick={() => setExpandedProduct(expandedProduct === product.productId ? null : product.productId)}
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors">
                          {product.images[0] && (
                            <img src={product.images[0].src} alt=""
                              className="w-9 h-9 rounded object-cover flex-shrink-0 border border-gray-200" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "#0f172a" }}>{product.productTitle}</p>
                            <p className="text-[10px]" style={{ color: "#94a3b8" }}>{product.images.length} image{product.images.length > 1 ? "s" : ""}</p>
                          </div>
                          {expandedProduct === product.productId
                            ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#94a3b8" }} />
                            : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#94a3b8" }} />}
                        </button>
                        {expandedProduct === product.productId && (
                          <div className="px-3 pb-3 bg-gray-50/50">
                            <div className="grid grid-cols-3 gap-1.5">
                              {product.images.map((img) => {
                                const key = `${product.productId}/${img.id}`;
                                const checked = pendingImages.has(key);
                                return (
                                  <button key={img.id} onClick={() => togglePending(product.productId, img.id)}
                                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${checked ? "border-blue-500" : "border-gray-200 hover:border-blue-300"}`}>
                                    <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                                    {checked && (
                                      <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5" style={{ color: "#2563eb" }} />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pendingImages.size > 0 && (
                <div className="p-3 border-t border-gray-200">
                  <button onClick={loadSelectedIntoEditor}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" style={{ color: "#fff" }} />
                    <span style={{ color: "#fff" }}>Charger {pendingImages.size} image{pendingImages.size > 1 ? "s" : ""}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {source === "local" && (
            <div className="p-4">
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors border-gray-300 hover:border-blue-400 hover:bg-blue-50/30"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}>
                <Upload className="w-8 h-8 mb-3" style={{ color: "#94a3b8" }} />
                <p className="text-sm font-medium text-center" style={{ color: "#0f172a" }}>Glissez des images ici</p>
                <p className="text-xs text-center mt-1" style={{ color: "#94a3b8" }}>PNG, JPG, WEBP &middot; max 10 MB</p>
                <button className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium" style={{ color: "#fff" }}>
                  Choisir des fichiers
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER PANEL ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {/* Preview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                {activeItem && (
                  <>
                    <span className="text-xs font-medium truncate max-w-[200px]" style={{ color: "#374151" }}>
                      {activeItem.productTitle}
                    </span>
                    {processedImages[activeItem.idx] !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 rounded font-medium" style={{ color: "#059669" }}>
                        &#x270F; modifiee
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeItem && processedImages[activeItem.idx] !== undefined && (
                  <button onClick={() => setShowOriginal((v) => !v)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${showOriginal ? "bg-blue-50 border-blue-300" : "border-gray-200 hover:bg-gray-100"}`}
                    style={{ color: showOriginal ? "#2563eb" : "#64748b" }}>
                    <ArrowUpDown className="w-3 h-3" /> {showOriginal ? "Original" : "Modifiee"}
                  </button>
                )}
                {loadedImages.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#94a3b8" }}>
                    <span>{selectedIndices.size}/{loadedImages.length}</span>
                    <button onClick={() => setSelectedIndices(new Set(loadedImages.map((i) => i.idx)))}
                      className="underline" style={{ color: "#2563eb" }}>Tout</button>
                    <button onClick={() => setSelectedIndices(new Set())}
                      className="underline" style={{ color: "#64748b" }}>Aucun</button>
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex items-center justify-center bg-slate-100" style={{ minHeight: "380px" }}>
              {activeSrc ? (
                <>
                  <img src={activeSrc} alt={activeItem?.name}
                    className="max-w-full max-h-96 object-contain select-none" />
                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#2563eb" }} />
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Traitement...</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                  <ImageIcon className="w-16 h-16 mb-4" style={{ color: "#cbd5e1" }} />
                  <p className="text-sm font-medium" style={{ color: "#64748b" }}>Aucune image chargee</p>
                  <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
                    Selectionnez des images Shopify ou importez des fichiers locaux
                  </p>
                </div>
              )}
            </div>

            {batchProcessing && (
              <div className="px-4 py-3 border-t border-gray-100 bg-blue-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: "#1e40af" }}>Traitement en lot...</span>
                  <span className="text-xs font-bold" style={{ color: "#1e40af" }}>{progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {loadedImages.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {loadedImages.map((img) => {
                  const isActive = img.idx === activeIndex;
                  const isSelected = selectedIndices.has(img.idx);
                  return (
                    <div key={img.idx}
                      className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${isActive ? "border-blue-500 ring-2 ring-blue-200" : isSelected ? "border-blue-300" : "border-gray-200 hover:border-gray-300"}`}
                      onClick={() => { setActiveIndex(img.idx); setShowOriginal(false); }}>
                      <img src={processedImages[img.idx] || img.src} alt={img.name} className="w-full h-full object-cover" />
                      {processedImages[img.idx] !== undefined && (
                        <div className="absolute top-0.5 right-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 drop-shadow" style={{ color: "#059669" }} />
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedIndices((prev) => { const n = new Set(prev); if (n.has(img.idx)) n.delete(img.idx); else n.add(img.idx); return n; }); }}
                        className={`absolute bottom-0.5 left-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? "bg-blue-500 border-blue-500" : "bg-white/80 border-gray-400"}`}>
                        {isSelected && <span className="text-white text-[8px] font-bold">&#10003;</span>}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(img.idx); }}
                        className="absolute top-0.5 left-0.5 p-0.5 bg-black/50 rounded-sm hover:bg-black/70">
                        <X className="w-2.5 h-2.5" style={{ color: "#fff" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#0f172a" }}>
              <Palette className="w-4 h-4" style={{ color: "#8b5cf6" }} /> Filtres rapides
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => applyFilter(f.id)}
                  disabled={isProcessing || loadedImages.length === 0}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border-2 transition-all disabled:opacity-40 ${activeFilter === f.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="w-full aspect-square rounded overflow-hidden bg-gray-100" style={{ filter: f.css || undefined }}>
                    {activeItem?.src
                      ? <img src={activeItem.src} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />}
                  </div>
                  <span className="text-[9px] font-medium leading-tight text-center" style={{ color: activeFilter === f.id ? "#2563eb" : "#64748b" }}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Adjustments */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#0f172a" }}>
              <SunMedium className="w-4 h-4" style={{ color: "#f59e0b" }} /> Ajustements
            </h3>
            <div className="space-y-3">
              {([
                { label: "Luminosite", val: brightness, set: setBrightness, min: 50, max: 150 },
                { label: "Contraste", val: contrast, set: setContrast, min: 50, max: 150 },
                { label: "Saturation", val: saturation, set: setSaturation, min: 0, max: 200 },
                { label: "Nettete", val: sharpness, set: setSharpness, min: 0, max: 100 },
              ] as { label: string; val: number; set: (v: number) => void; min: number; max: number }[]).map((adj) => (
                <div key={adj.label}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium" style={{ color: "#64748b" }}>{adj.label}</label>
                    <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>{adj.val}%</span>
                  </div>
                  <input type="range" min={adj.min} max={adj.max} value={adj.val}
                    onChange={(e) => adj.set(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={applyAdjustments} disabled={isProcessing || loadedImages.length === 0}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                {isProcessing
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#fff" }} />
                  : <SunMedium className="w-3.5 h-3.5" style={{ color: "#fff" }} />}
                <span style={{ color: "#fff" }}>Appliquer</span>
              </button>
              <button onClick={handleReset} disabled={isProcessing}
                className="px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <RotateCcw className="w-3.5 h-3.5" style={{ color: "#64748b" }} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 mt-2">
              <button onClick={() => applyToActive("improve")} disabled={isProcessing || loadedImages.length === 0}
                className="w-full py-2 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ color: "#374151" }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} /> Ameliorer la qualite
              </button>
              <button onClick={() => applyToActive("grayscale")} disabled={isProcessing || loadedImages.length === 0}
                className="w-full py-2 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ color: "#374151" }}>
                <Contrast className="w-3.5 h-3.5" style={{ color: "#374151" }} /> Noir et blanc
              </button>
              <button onClick={handleReset} disabled={isProcessing || loadedImages.length === 0}
                className="w-full py-2 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ color: "#64748b" }}>
                <RotateCcw className="w-3.5 h-3.5" style={{ color: "#64748b" }} /> Restaurer original
              </button>
            </div>
          </div>

          {/* Export */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#0f172a" }}>
              <Download className="w-4 h-4" style={{ color: "#2563eb" }} /> Export &amp; Application
            </h3>

            <p className="text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Format</p>
            <div className="flex gap-1.5 mb-3">
              {(["webp", "jpeg", "png"] as const).map((fmt) => (
                <button key={fmt} onClick={() => setSelectedFormat(fmt)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${selectedFormat === fmt ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  style={{ color: selectedFormat === fmt ? "#2563eb" : "#64748b" }}>{fmt.toUpperCase()}</button>
              ))}
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: "#64748b" }}>Qualite</label>
                <div className="flex gap-1">
                  {[60, 80, 100].map((q) => (
                    <button key={q} onClick={() => setQuality(q)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${quality === q ? "bg-blue-100" : "hover:bg-gray-100"}`}
                      style={{ color: quality === q ? "#2563eb" : "#94a3b8" }}>{q}%</button>
                  ))}
                </div>
              </div>
              <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
            </div>

            <p className="text-xs font-medium mb-1.5" style={{ color: "#64748b" }}>Redimensionner</p>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {RESIZE_PRESETS.map((preset) => (
                <button key={preset.label}
                  onClick={() => { setSelectedPreset(selectedPreset === preset.label ? null : preset.label); applyResize(preset.width, preset.height); }}
                  disabled={isProcessing || loadedImages.length === 0}
                  className={`py-2 px-2 rounded-lg border text-left disabled:opacity-40 transition-all ${selectedPreset === preset.label ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                  <p className="text-[11px] font-medium" style={{ color: "#0f172a" }}>{preset.label}</p>
                  <p className="text-[10px]" style={{ color: "#94a3b8" }}>{preset.width}x{preset.height}</p>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mb-4">
              <input type="number" placeholder="L" value={customW} onChange={(e) => setCustomW(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center outline-none focus:border-blue-400"
                style={{ color: "#0f172a" }} />
              <span className="text-xs" style={{ color: "#94a3b8" }}>x</span>
              <input type="number" placeholder="H" value={customH} onChange={(e) => setCustomH(e.target.value)}
                className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs text-center outline-none focus:border-blue-400"
                style={{ color: "#0f172a" }} />
              <button
                onClick={() => { const w = parseInt(customW); const h = parseInt(customH); if (w > 0 && h > 0) applyResize(w, h); }}
                disabled={!customW || !customH || isProcessing}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-xs font-medium"
                style={{ color: "#fff" }}>OK</button>
            </div>

            <div className="flex flex-col gap-2">
              <button onClick={pushToShopify} disabled={batchProcessing || editedShopifyCount === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                {batchProcessing
                  ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} />
                  : <Package className="w-4 h-4" style={{ color: "#fff" }} />}
                <span style={{ color: "#fff" }}>
                  Appliquer sur Shopify{editedShopifyCount > 0 ? ` (${editedShopifyCount})` : ""}
                </span>
              </button>

              <button onClick={downloadImages} disabled={batchProcessing || loadedImages.length === 0}
                className="w-full py-2.5 bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 disabled:opacity-40 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ color: "#374151" }}>
                <Download className="w-4 h-4" />
                Telecharger ({loadedImages.length})
              </button>

              <button onClick={() => applyToAll("adjustments", { brightness, contrast, saturation, sharpness })}
                disabled={batchProcessing || loadedImages.length === 0}
                className="w-full py-2 border border-gray-200 rounded-xl text-xs font-medium hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-1.5"
                style={{ color: "#64748b" }}>
                {batchProcessing
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {progress}%</>
                  : <><Sparkles className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} /> Traiter tout en lot ({selectedIndices.size})</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}