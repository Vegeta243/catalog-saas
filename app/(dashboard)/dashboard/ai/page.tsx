"use client";

import { useState, useEffect } from "react";
import { Sparkles, RefreshCw, CheckCircle2, Wand2, Tag, FileText, ArrowRight } from "lucide-react";
import { useToast } from "@/lib/toast";

interface Product { id: string; title: string; body_html?: string; tags?: string; price: string; images?: { src: string }[]; variants?: { price: string }[] }

export default function AIPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, { title?: string; description?: string; keywords?: string }>>({});
  const [massMode, setMassMode] = useState(false);
  const [massProgress, setMassProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetch("/api/shopify/products").then((r) => r.json()).then((d) => {
      setProducts((d.products || []).map((p: Product) => ({ ...p, price: p.variants?.[0]?.price || p.price || "0" })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const generateForProduct = async (product: Product) => {
    setGenerating(product.id);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { title: product.title, description: product.body_html }, mode: "full" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGeneratedContent((prev) => ({ ...prev, [product.id]: data }));
      addToast("Contenu IA généré avec succès", "success");
    } catch {
      addToast("Erreur IA — vérifiez votre clé OpenAI", "error");
    }
    setGenerating(null);
  };

  const applyGenerated = async (productId: string) => {
    const content = generatedContent[productId];
    if (!content) return;
    setGenerating(productId);
    try {
      if (content.title) {
        await fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [productId], field: "title", value: content.title }) });
      }
      if (content.description) {
        await fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [productId], field: "body_html", value: content.description }) });
      }
      if (content.keywords) {
        await fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [productId], field: "tags", value: content.keywords }) });
      }
      addToast("Contenu appliqué sur Shopify", "success");
    } catch {
      addToast("Erreur lors de l'application", "error");
    }
    setGenerating(null);
  };

  const generateTags = async (product: Product) => {
    setGenerating(`tags-${product.id}`);
    try {
      const res = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { title: product.title, description: product.body_html }, mode: "tags" }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.tags) {
        await fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [product.id], field: "tags", value: data.tags }) });
        addToast("Tags IA appliqués", "success");
      }
    } catch { addToast("Erreur IA", "error"); }
    setGenerating(null);
  };

  const handleMassGenerate = async () => {
    if (selected.length === 0) return;
    setMassMode(true);
    setMassProgress({ current: 0, total: selected.length });

    for (let i = 0; i < selected.length; i++) {
      setMassProgress({ current: i + 1, total: selected.length });
      const product = products.find((p) => p.id === selected[i]);
      if (!product) continue;
      try {
        const res = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: { title: product.title, description: product.body_html }, mode: "full" }) });
        if (!res.ok) continue;
        const data = await res.json();
        if (data.description) {
          await fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [product.id], field: "body_html", value: data.description }) });
        }
      } catch { /* continue */ }
    }

    addToast(`${selected.length} produit${selected.length > 1 ? "s" : ""} optimisé${selected.length > 1 ? "s" : ""} par l'IA`, "success");
    setMassMode(false);
    setSelected([]);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Optimisation IA</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Générez des titres SEO, descriptions et tags avec l'intelligence artificielle</p>
        </div>
        {selected.length > 0 && (
          <button onClick={handleMassGenerate} disabled={massMode}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium">
            {massMode ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Sparkles className="w-4 h-4" style={{ color: "#fff" }} />}
            <span style={{ color: "#fff" }}>{massMode ? `${massProgress.current}/${massProgress.total}...` : `Optimiser ${selected.length} produit${selected.length > 1 ? "s" : ""}`}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin mb-3" style={{ color: "#8b5cf6" }} />
          <p className="text-sm" style={{ color: "#64748b" }}>Chargement des produits...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#0f172a" }}>Aucun produit</h3>
          <p className="text-sm" style={{ color: "#64748b" }}>Connectez votre boutique et importez des produits d'abord</p>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const gen = generatedContent[product.id];
            const isGenerating = generating === product.id;
            const isSelected = selected.includes(product.id);

            return (
              <div key={product.id} className={`bg-white rounded-xl border ${isSelected ? "border-violet-300 ring-2 ring-violet-100" : "border-gray-200"} p-5`}>
                <div className="flex items-start gap-4">
                  <button onClick={() => setSelected((p) => p.includes(product.id) ? p.filter((i) => i !== product.id) : [...p, product.id])}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-1 ${isSelected ? "bg-violet-600 border-violet-600" : "border-gray-300"} flex items-center justify-center`}>
                    {isSelected && <CheckCircle2 className="w-3 h-3" style={{ color: "#fff" }} />}
                  </button>
                  <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {product.images?.[0]?.src ? <img src={product.images[0].src} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{product.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{parseFloat(product.price).toFixed(2)} € · {product.tags || "Aucun tag"}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => generateTags(product)} disabled={generating === `tags-${product.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-medium" title="Générer des tags IA">
                      {generating === `tags-${product.id}` ? <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: "#d97706" }} /> : <Tag className="w-3.5 h-3.5" style={{ color: "#d97706" }} />}
                      <span style={{ color: "#92400e" }}>Tags IA</span>
                    </button>
                    <button onClick={() => generateForProduct(product)} disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 rounded-lg text-xs font-medium" title="Générer titre + description + mots-clés">
                      {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: "#8b5cf6" }} /> : <Wand2 className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />}
                      <span style={{ color: "#6d28d9" }}>Optimiser</span>
                    </button>
                  </div>
                </div>

                {/* Generated content preview */}
                {gen && (
                  <div className="mt-4 p-4 bg-violet-50/50 rounded-lg border border-violet-100">
                    {gen.title && (
                      <div className="mb-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8b5cf6" }}>Titre SEO</p>
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{gen.title}</p>
                      </div>
                    )}
                    {gen.description && (
                      <div className="mb-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8b5cf6" }}>Description</p>
                        <div className="text-sm prose prose-sm max-w-none" style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: gen.description }} />
                      </div>
                    )}
                    {gen.keywords && (
                      <div className="mb-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#8b5cf6" }}>Mots-clés</p>
                        <p className="text-xs" style={{ color: "#64748b" }}>{gen.keywords}</p>
                      </div>
                    )}
                    <button onClick={() => applyGenerated(product.id)} disabled={generating === product.id}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium mt-2">
                      {generating === product.id ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <ArrowRight className="w-4 h-4" style={{ color: "#fff" }} />}
                      <span style={{ color: "#fff" }}>Appliquer sur Shopify</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
