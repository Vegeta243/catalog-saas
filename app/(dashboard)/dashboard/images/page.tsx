"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Upload, Download, Loader2, X, CheckCircle2, Plus, Package,
  Sparkles, SunMedium, Contrast, Palette, RotateCcw, RefreshCw,
  ImageIcon, ArrowUpDown, ChevronDown, ChevronRight, LayoutGrid,
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

const COLS = 3;      // grid columns in the virtual image gallery
const ITEM_H = 160; // row height in pixels (image card + label)
const BATCH_SIZE = 10; // parallel batch size for processing

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ImagesPage() {
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const lastClickedRef = useRef<number | null>(null);

  // Shopify browser (collapsible panel)
  const [showShopifyPanel, setShowShopifyPanel] = useState(false);
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
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchErrors, setBatchErrors] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

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
    if (showShopifyPanel) loadShopifyProducts();
  }, [showShopifyPanel, loadShopifyProducts]);

  // ── Ctrl+A / Cmd+A — select all ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelectedIndices(new Set(loadedImages.map((i) => i.idx)));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [loadedImages]);

  // ── Shift+click range select ─────────────────────────────────────────────
  const handleImageCardClick = useCallback(
    (idx: number, e: React.MouseEvent) => {
      if (e.shiftKey && lastClickedRef.current !== null) {
        const from = Math.min(lastClickedRef.current, idx);
        const to = Math.max(lastClickedRef.current, idx);
        const inRange = loadedImages
          .filter((i) => i.idx >= from && i.idx <= to)
          .map((i) => i.idx);
        setSelectedIndices((prev) => new Set([...prev, ...inRange]));
      } else {
        setActiveIndex(idx);
        setShowOriginal(false);
        setPendingPreview(null);
        lastClickedRef.current = idx;
      }
    },
    [loadedImages]
  );

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
    if (!src) throw new Error("No image source");
    if (src.startsWith("data:")) return src;
    if (src.startsWith("blob:")) {
      const res = await fetch(src);
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    // Proxy through server to avoid CORS issues with Shopify CDN URLs
    const res = await fetch("/api/images/fetch-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: src }),
    });
    if (!res.ok) throw new Error("Failed to fetch image from CDN");
    const { base64 } = await res.json();
    return base64;
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

  const previewFilter = async (operation: string, extraParams: Record<string, unknown> = {}) => {
    if (loadedImages.length === 0) { addToast("Chargez d'abord des images", "error"); return; }
    setIsProcessing(true);
    try {
      const currentSrc = processedImages[activeIndex] || loadedImages.find((i) => i.idx === activeIndex)?.src || "";
      const b64 = await fetchAsBase64(currentSrc);
      const result = await callProcess(b64, operation, extraParams);
      setPendingPreview(result);
    } catch (err) {
      addToast(`Echec: ${(err as Error).message}`, "error");
    }
    setIsProcessing(false);
  };

  const applyFilter = async (filterId: string) => {
    setActiveFilter(filterId);
    if (filterId === "original") {
      setProcessedImages((prev) => { const next = { ...prev }; delete next[activeIndex]; return next; });
      setPendingPreview(null);
      return;
    }
    await previewFilter("filter", { filter: filterId });
  };

  const sliderDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSliderChange = (type: "brightness" | "contrast" | "saturation" | "sharpness", value: number) => {
    if (type === "brightness") setBrightness(value);
    if (type === "contrast") setContrast(value);
    if (type === "saturation") setSaturation(value);
    if (type === "sharpness") setSharpness(value);

    clearTimeout(sliderDebounceRef.current);
    sliderDebounceRef.current = setTimeout(async () => {
      if (loadedImages.length === 0) return;
      const newVals = {
        brightness: type === "brightness" ? value : brightness,
        contrast: type === "contrast" ? value : contrast,
        saturation: type === "saturation" ? value : saturation,
        sharpness: type === "sharpness" ? value : sharpness,
      };
      try {
        const currentSrc = processedImages[activeIndex] || loadedImages.find((i) => i.idx === activeIndex)?.src || "";
        const b64 = await fetchAsBase64(currentSrc);
        const result = await callProcess(b64, "adjustments", newVals);
        setPendingPreview(result);
      } catch {
        // silent fail — user can still click Appliquer manually
      }
    }, 400);
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

    setBatchProcessing(true);
    setBatchDone(0);
    setBatchErrors(0);
    setBatchTotal(targets.length);
    setProgress(0);

    let done = 0;
    let errors = 0;

    // Process in parallel batches of BATCH_SIZE
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = targets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (img) => {
          const currentSrc = processedImages[img.idx] || img.src;
          const b64 = currentSrc.startsWith("data:") ? currentSrc : await fetchAsBase64(currentSrc);
          const result = await callProcess(b64, operation, extraParams);
          return { idx: img.idx, result };
        })
      );
      const updates: Record<number, string> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          updates[r.value.idx] = r.value.result;
          done++;
        } else {
          errors++;
        }
      });
      if (Object.keys(updates).length > 0) {
        setProcessedImages((prev) => ({ ...prev, ...updates }));
      }
      setBatchDone(done);
      setBatchErrors(errors);
      setProgress(Math.round(((done + errors) / targets.length) * 100));
    }

    const msg = `${done} image${done !== 1 ? "s" : ""} traitee${done !== 1 ? "s" : ""}${errors > 0 ? ` · ${errors} erreur${errors !== 1 ? "s" : ""}` : ""}`;
    addToast(msg, errors > 0 ? "error" : "success");
    setBatchProcessing(false);
    setProgress(0);
    setBatchDone(0);
    setBatchTotal(0);
    setBatchErrors(0);
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

  // Virtual grid: each row holds COLS images
  const rowCount = Math.ceil(loadedImages.length / COLS);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => gridRef.current,
    estimateSize: () => ITEM_H + 8,
    overscan: 4,
  });

  return (
    <div className="flex flex-col gap-0" style={{ height: "calc(100vh - 120px)", minHeight: "600px" }}>
      <input type="file" ref={fileInputRef} multiple accept="image/*" className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)} />

      {/* ── TOP TOOLBAR ────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: "#0f172a" }}>Éditeur d&apos;images</h1>
          </div>

          {/* Stats */}
          {loadedImages.length > 0 && (
            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full ml-1" style={{ color: "#64748b" }}>
              <LayoutGrid className="w-3 h-3 inline mr-1" />{loadedImages.length} image{loadedImages.length !== 1 ? "s" : ""} &middot; <span style={{ color: "#2563eb" }}>{selectedIndices.size} sélectionnée{selectedIndices.size !== 1 ? "s" : ""}</span>
            </span>
          )}

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Select All — also activated by Ctrl+A */}
            <button
              onClick={() => setSelectedIndices(new Set(loadedImages.map((i) => i.idx)))}
              disabled={loadedImages.length === 0}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg"
              style={{ color: "#fff" }}
              title="Tout sélectionner (Ctrl+A)"
            >
              Tout (Ctrl+A)
            </button>

            {/* Deselect All */}
            <button
              onClick={() => setSelectedIndices(new Set())}
              disabled={selectedIndices.size === 0}
              className="px-3 py-1.5 text-xs font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-lg"
              style={{ color: "#64748b" }}
            >
              Désélectionner
            </button>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {/* Upload local */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 hover:bg-gray-50 rounded-lg"
              style={{ color: "#374151" }}
            >
              <Upload className="w-3.5 h-3.5" /> Importer
            </button>

            {/* Shopify browser toggle */}
            <button
              onClick={() => setShowShopifyPanel((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${showShopifyPanel ? "bg-blue-50 border-blue-300" : "border-gray-200 hover:bg-gray-50"}`}
              style={{ color: showShopifyPanel ? "#2563eb" : "#374151" }}
            >
              <Package className="w-3.5 h-3.5" /> Shopify
            </button>
          </div>
        </div>

        {/* ── Shopify collapsible browser ─────────────────────────────── */}
        {showShopifyPanel && (
          <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
              <span className="text-xs font-medium" style={{ color: "#64748b" }}>
                {shopifyLoaded ? `${shopifyProducts.length} produit${shopifyProducts.length !== 1 ? "s" : ""}` : "Chargement..."}
              </span>
              <button onClick={() => { setShopifyLoaded(false); setShopifyProducts([]); }}
                className="p-1 rounded hover:bg-gray-100" title="Actualiser">
                <RefreshCw className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "280px" }}>
              {loadingShopify ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" style={{ color: "#3b82f6" }} />
                  <p className="text-xs" style={{ color: "#64748b" }}>Chargement...</p>
                </div>
              ) : shopifyProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Package className="w-8 h-8 mb-2" style={{ color: "#cbd5e1" }} />
                  <p className="text-sm font-medium" style={{ color: "#64748b" }}>Aucune boutique connectée</p>
                  <a href="/dashboard/shops" className="text-blue-600 text-xs underline mt-1 hover:text-blue-800">Connecter une boutique →</a>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {shopifyProducts.map((product) => (
                    <div key={product.productId}>
                      <button
                        onClick={() => setExpandedProduct(expandedProduct === product.productId ? null : product.productId)}
                        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 text-left transition-colors">
                        {product.images[0] && (
                          <img src={product.images[0].src} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0 border border-gray-200" />
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
                          <div className="grid grid-cols-5 gap-1.5">
                            {product.images.map((img) => {
                              const key = `${product.productId}/${img.id}`;
                              const checked = pendingImages.has(key);
                              return (
                                <button key={img.id} onClick={() => togglePending(product.productId, img.id)}
                                  className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${checked ? "border-blue-500" : "border-gray-200 hover:border-blue-300"}`}>
                                  <img src={img.src} alt={img.alt} className="w-full h-full object-cover" />
                                  {checked && (
                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                      <CheckCircle2 className="w-4 h-4" style={{ color: "#2563eb" }} />
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
              <div className="p-2 border-t border-gray-200">
                <button onClick={loadSelectedIntoEditor}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" style={{ color: "#fff" }} />
                  <span style={{ color: "#fff" }}>Charger {pendingImages.size} image{pendingImages.size > 1 ? "s" : ""}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MAIN SPLIT AREA ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Virtual image grid ─────────────────────────────────── */}
        <div
          ref={gridRef}
          className="flex-1 overflow-auto bg-gray-50 p-3"
          style={{ minWidth: 0 }}
        >
          {loadedImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <ImageIcon className="w-16 h-16 mb-4" style={{ color: "#cbd5e1" }} />
              <p className="text-sm font-medium mb-1" style={{ color: "#64748b" }}>Aucune image chargée</p>
              <p className="text-xs mb-4" style={{ color: "#94a3b8" }}>Importez des fichiers ou chargez depuis Shopify</p>
              <div className="flex gap-2">
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium"
                  style={{ color: "#fff" }}>
                  <Upload className="w-4 h-4" /> Importer des fichiers
                </button>
                <button onClick={() => setShowShopifyPanel(true)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-white"
                  style={{ color: "#374151" }}>
                  <Package className="w-4 h-4" /> Depuis Shopify
                </button>
              </div>
            </div>
          ) : (
            /* Virtual rows */
            <div
              style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowImages = loadedImages.slice(virtualRow.index * COLS, (virtualRow.index + 1) * COLS);
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      display: "grid",
                      gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                      gap: "8px",
                      alignContent: "start",
                    }}
                  >
                    {rowImages.map((img) => {
                      const isActive = img.idx === activeIndex;
                      const isSelected = selectedIndices.has(img.idx);
                      const isProcessed = processedImages[img.idx] !== undefined;
                      return (
                        <div
                          key={img.idx}
                          className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all select-none ${
                            isActive
                              ? "border-blue-500 ring-2 ring-blue-200 shadow-md"
                              : isSelected
                              ? "border-blue-300"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          style={{ height: `${ITEM_H}px` }}
                          onClick={(e) => handleImageCardClick(img.idx, e)}
                        >
                          {/* Thumbnail */}
                          <img
                            src={processedImages[img.idx] || img.src}
                            alt={img.name}
                            className="w-full object-cover"
                            style={{ height: `${ITEM_H - 32}px` }}
                          />

                          {/* Processed badge */}
                          {isProcessed && (
                            <div className="absolute top-1.5 right-1.5">
                              <CheckCircle2 className="w-4 h-4 drop-shadow" style={{ color: "#059669" }} />
                            </div>
                          )}

                          {/* Remove button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeImage(img.idx); }}
                            className="absolute top-1 left-1 p-0.5 bg-black/50 rounded hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Supprimer"
                          >
                            <X className="w-3 h-3" style={{ color: "#fff" }} />
                          </button>

                          {/* Bottom bar: checkbox + label */}
                          <div
                            className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-1.5 py-1"
                            style={{ backgroundColor: "rgba(255,255,255,0.92)" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => setSelectedIndices((prev) => {
                                const n = new Set(prev);
                                if (n.has(img.idx)) n.delete(img.idx); else n.add(img.idx);
                                return n;
                              })}
                              className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                                isSelected ? "bg-blue-500 border-blue-500" : "bg-white border-gray-400 hover:border-blue-400"
                              }`}
                            >
                              {isSelected && <span className="text-white text-[8px] font-bold">✓</span>}
                            </button>
                            <span className="text-[10px] truncate font-medium" style={{ color: "#374151" }}>
                              {img.productTitle || img.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Editing panel ─────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">

          {/* Preview */}
          <div className="border-b border-gray-100">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-1.5 min-w-0">
                {activeItem && (
                  <>
                    <span className="text-xs font-medium truncate" style={{ color: "#374151" }}>
                      {activeItem.productTitle || activeItem.name}
                    </span>
                    {processedImages[activeItem.idx] !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 rounded font-medium flex-shrink-0" style={{ color: "#059669" }}>✏ éditée</span>
                    )}
                  </>
                )}
              </div>
              {activeItem && processedImages[activeItem.idx] !== undefined && (
                <button
                  onClick={() => setShowOriginal((v) => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border flex-shrink-0 ml-1 ${showOriginal ? "bg-blue-50 border-blue-200" : "border-gray-200 hover:bg-gray-50"}`}
                  style={{ color: showOriginal ? "#2563eb" : "#64748b" }}>
                  <ArrowUpDown className="w-3 h-3" /> {showOriginal ? "Orig." : "Modif."}
                </button>
              )}
            </div>

            <div className="relative bg-slate-100" style={{ minHeight: "200px" }}>
              {activeSrc ? (
                pendingPreview ? (
                  <div className="flex" style={{ minHeight: "200px" }}>
                    <div className="flex-1 relative flex items-center justify-center p-2">
                      <span className="absolute top-1 left-1 z-10 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Avant</span>
                      <img src={processedImages[activeIndex] ?? loadedImages.find((i) => i.idx === activeIndex)?.src ?? ""} alt="avant" className="max-w-full max-h-44 object-contain" />
                    </div>
                    <div className="w-px bg-gray-300 self-stretch" />
                    <div className="flex-1 relative flex items-center justify-center p-2">
                      <span className="absolute top-1 left-1 z-10 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">Après</span>
                      <img src={pendingPreview} alt="apres" className="max-w-full max-h-44 object-contain" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center" style={{ minHeight: "200px" }}>
                    <img src={activeSrc} alt={activeItem?.name} className="max-w-full max-h-48 object-contain select-none" />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#2563eb" }} />
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center py-10 text-center" style={{ minHeight: "200px" }}>
                  <ImageIcon className="w-10 h-10" style={{ color: "#e2e8f0" }} />
                </div>
              )}
            </div>

            {pendingPreview && (
              <div className="flex gap-1.5 px-3 py-2 border-t border-gray-100 bg-blue-50">
                <button
                  onClick={() => { setProcessedImages((prev) => ({ ...prev, [activeIndex]: pendingPreview })); setPendingPreview(null); addToast("Modification appliquée", "success"); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-medium">
                  ✅ Appliquer
                </button>
                <button onClick={() => setPendingPreview(null)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-white" style={{ color: "#374151" }}>
                  ✗
                </button>
              </div>
            )}

            {batchProcessing && (
              <div className="px-3 py-2 border-t border-gray-100 bg-blue-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium" style={{ color: "#1e40af" }}>
                    Lot : {batchDone}/{batchTotal}{batchErrors > 0 ? ` · ${batchErrors} err.` : ""}
                  </span>
                  <span className="text-[10px] font-bold" style={{ color: "#1e40af" }}>{progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#0f172a" }}>
              <Palette className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} /> Filtres
            </h3>
            <div className="grid grid-cols-4 gap-1">
              {FILTERS.map((f) => (
                <button key={f.id}
                  onClick={() => applyFilter(f.id)}
                  disabled={isProcessing || loadedImages.length === 0}
                  className={`flex flex-col items-center gap-0.5 p-1 rounded-lg border-2 transition-all disabled:opacity-40 ${activeFilter === f.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                  <div className="w-full aspect-square rounded overflow-hidden bg-gray-100" style={{ filter: f.css || undefined }}>
                    {activeItem?.src
                      ? <img src={activeItem.src} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />}
                  </div>
                  <span className="text-[9px] font-medium leading-tight text-center truncate w-full" style={{ color: activeFilter === f.id ? "#2563eb" : "#64748b" }}>
                    {f.name}
                  </span>
                </button>
              ))}
            </div>
            {/* Apply filter to all selected */}
            {activeFilter !== "original" && selectedIndices.size > 1 && (
              <button
                onClick={() => applyToAll("filter", { filter: activeFilter })}
                disabled={batchProcessing}
                className="w-full mt-1.5 py-1.5 text-[10px] font-medium bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg disabled:opacity-40"
                style={{ color: "#7c3aed" }}>
                Appliquer {activeFilter} aux {selectedIndices.size} sélectionnées
              </button>
            )}
          </div>

          {/* Adjustments */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#0f172a" }}>
              <SunMedium className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} /> Ajustements
            </h3>
            <div className="space-y-2.5">
              {([
                { label: "Luminosité", val: brightness, type: "brightness" as const, min: 50, max: 150 },
                { label: "Contraste",  val: contrast,   type: "contrast"   as const, min: 50, max: 150 },
                { label: "Saturation", val: saturation, type: "saturation" as const, min: 0,  max: 200 },
                { label: "Netteté",    val: sharpness,  type: "sharpness"  as const, min: 0,  max: 100 },
              ] as const).map((adj) => (
                <div key={adj.label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-medium" style={{ color: "#64748b" }}>{adj.label}</label>
                    <span className="text-[10px] font-mono" style={{ color: "#94a3b8" }}>{adj.val}</span>
                  </div>
                  <input type="range" min={adj.min} max={adj.max} value={adj.val}
                    onChange={(e) => handleSliderChange(adj.type, Number(e.target.value))}
                    className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <button onClick={applyAdjustments} disabled={isProcessing || loadedImages.length === 0}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1">
                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#fff" }} /> : <SunMedium className="w-3 h-3" style={{ color: "#fff" }} />}
                <span style={{ color: "#fff" }}>Appliquer à 1</span>
              </button>
              <button onClick={() => applyToAll("adjustments", { brightness, contrast, saturation, sharpness })}
                disabled={batchProcessing || loadedImages.length === 0}
                className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" style={{ color: "#fff" }} />
                <span style={{ color: "#fff" }}>
                  {batchProcessing ? `${progress}%` : `Lot (${selectedIndices.size})`}
                </span>
              </button>
              <button onClick={handleReset} disabled={isProcessing || batchProcessing}
                className="px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                <RotateCcw className="w-3 h-3" style={{ color: "#64748b" }} />
              </button>
            </div>
            <div className="flex flex-col gap-1 mt-1.5">
              <button onClick={() => applyToActive("improve")} disabled={isProcessing || loadedImages.length === 0}
                className="w-full py-1.5 border border-gray-200 rounded-lg text-[10px] font-medium hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-1"
                style={{ color: "#374151" }}>
                <Sparkles className="w-3 h-3" style={{ color: "#8b5cf6" }} /> Améliorer qualité (1 image)
              </button>
              <button onClick={() => applyToAll("improve")} disabled={batchProcessing || loadedImages.length === 0}
                className="w-full py-1.5 border border-purple-200 rounded-lg text-[10px] font-medium hover:bg-purple-50 disabled:opacity-40 flex items-center justify-center gap-1"
                style={{ color: "#7c3aed" }}>
                <Sparkles className="w-3 h-3" /> Améliorer toutes les sélectionnées ({selectedIndices.size})
              </button>
              <button onClick={() => applyToActive("grayscale")} disabled={isProcessing || loadedImages.length === 0}
                className="w-full py-1.5 border border-gray-200 rounded-lg text-[10px] font-medium hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-1"
                style={{ color: "#374151" }}>
                <Contrast className="w-3 h-3" /> N&B (1 image)
              </button>
              <button onClick={handleReset} disabled={isProcessing || loadedImages.length === 0}
                className="w-full py-1.5 border border-gray-200 rounded-lg text-[10px] font-medium hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center gap-1"
                style={{ color: "#64748b" }}>
                <RotateCcw className="w-3 h-3" /> Restaurer original
              </button>
            </div>
          </div>

          {/* Export */}
          <div className="p-3">
            <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#0f172a" }}>
              <Download className="w-3.5 h-3.5" style={{ color: "#2563eb" }} /> Export
            </h3>

            <p className="text-[10px] font-medium mb-1" style={{ color: "#64748b" }}>Format</p>
            <div className="flex gap-1 mb-2">
              {(["webp", "jpeg", "png"] as const).map((fmt) => (
                <button key={fmt} onClick={() => setSelectedFormat(fmt)}
                  className={`flex-1 py-1 rounded text-[10px] font-medium border ${selectedFormat === fmt ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  style={{ color: selectedFormat === fmt ? "#2563eb" : "#64748b" }}>{fmt.toUpperCase()}</button>
              ))}
            </div>

            <div className="mb-2">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-medium" style={{ color: "#64748b" }}>Qualité</label>
                <div className="flex gap-0.5">
                  {[60, 80, 100].map((q) => (
                    <button key={q} onClick={() => setQuality(q)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${quality === q ? "bg-blue-100" : "hover:bg-gray-100"}`}
                      style={{ color: quality === q ? "#2563eb" : "#94a3b8" }}>{q}%</button>
                  ))}
                </div>
              </div>
              <input type="range" min={10} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600" />
            </div>

            <p className="text-[10px] font-medium mb-1" style={{ color: "#64748b" }}>Redimensionner</p>
            <div className="grid grid-cols-2 gap-1 mb-1.5">
              {RESIZE_PRESETS.map((preset) => (
                <button key={preset.label}
                  onClick={() => { setSelectedPreset(selectedPreset === preset.label ? null : preset.label); applyResize(preset.width, preset.height); }}
                  disabled={isProcessing || loadedImages.length === 0}
                  className={`py-1.5 px-1 rounded border text-left disabled:opacity-40 transition-all ${selectedPreset === preset.label ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                  <p className="text-[10px] font-medium leading-tight" style={{ color: "#0f172a" }}>{preset.label}</p>
                  <p className="text-[9px]" style={{ color: "#94a3b8" }}>{preset.width}×{preset.height}</p>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 mb-3">
              <input type="number" placeholder="L" value={customW} onChange={(e) => setCustomW(e.target.value)}
                className="flex-1 px-1.5 py-1 border border-gray-200 rounded text-[10px] text-center outline-none focus:border-blue-400" style={{ color: "#0f172a" }} />
              <span className="text-[10px]" style={{ color: "#94a3b8" }}>×</span>
              <input type="number" placeholder="H" value={customH} onChange={(e) => setCustomH(e.target.value)}
                className="flex-1 px-1.5 py-1 border border-gray-200 rounded text-[10px] text-center outline-none focus:border-blue-400" style={{ color: "#0f172a" }} />
              <button
                onClick={() => { const w = parseInt(customW); const h = parseInt(customH); if (w > 0 && h > 0) applyResize(w, h); }}
                disabled={!customW || !customH || isProcessing}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-[10px] font-medium"
                style={{ color: "#fff" }}>OK</button>
            </div>

            <div className="flex flex-col gap-1.5">
              <button onClick={pushToShopify} disabled={batchProcessing || editedShopifyCount === 0}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                {batchProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#fff" }} /> : <Package className="w-3.5 h-3.5" style={{ color: "#fff" }} />}
                <span style={{ color: "#fff" }}>Appliquer Shopify{editedShopifyCount > 0 ? ` (${editedShopifyCount})` : ""}</span>
              </button>

              <button onClick={downloadImages} disabled={batchProcessing || loadedImages.length === 0}
                className="w-full py-2 bg-white border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50/30 disabled:opacity-40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                style={{ color: "#374151" }}>
                <Download className="w-3.5 h-3.5" /> Télécharger ZIP ({loadedImages.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
