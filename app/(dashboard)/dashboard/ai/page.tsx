"use client";

import { useState, useEffect, useMemo } from "react";
import GuideBanner from '@/components/GuideBanner'
import ProductDetailsModal from '@/components/ProductDetailsModal'
import {
  Sparkles, RefreshCw, CheckCircle2, Wand2, Tag, FileText, ArrowRight,
  Search, X, BarChart3, TrendingUp, Eye, ChevronDown, ChevronUp, Loader2,
  AlertTriangle, Zap, Target, Award,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import AIPreviewModal, { type AIPreviewItem } from "@/components/AIPreviewModal";
import QuotaGate from "@/components/QuotaGate";
import { createClient } from "@/lib/supabase/client";
import { PLAN_TASKS } from "@/lib/credits";

interface Product {
  id: string;
  title: string;
  body_html?: string;
  tags?: string;
  price: string;
  images?: unknown;
  variants?: { price: string }[];
}

interface GeneratedContent {
  title?: string;
  description?: string;
  keywords?: string;
  tags?: string;
  meta_description?: string;
}

function seoScore(p: Product): number {
  let s = 0;
  // Titre : 25 pts — 50-70 chars = optimal SEO
  if (p.title.length >= 50 && p.title.length <= 70) s += 25;
  else if (p.title.length >= 30 && p.title.length < 80) s += 15;
  else if (p.title.length >= 10) s += 5;
  // Description : 40 pts — richesse = 1er critère SEO
  const wordCount = (p.body_html || "").replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
  if (wordCount >= 200) s += 40;
  else if (wordCount >= 100) s += 25;
  else if (wordCount >= 30) s += 12;
  else if (wordCount >= 5) s += 4;
  // Tags : 20 pts — 8+ = excellent pour le SEO
  const tagCount = (p.tags || "").split(",").filter(Boolean).length;
  if (tagCount >= 8) s += 20;
  else if (tagCount >= 5) s += 14;
  else if (tagCount >= 3) s += 8;
  else if (tagCount >= 1) s += 3;
  // Images : 15 pts
  const imgCount = asImageUrls(p.images).length;
  if (imgCount >= 3) s += 15;
  else if (imgCount >= 1) s += 10;
  return s;
}

function asImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((img) => {
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && 'src' in img) {
        const src = (img as { src?: unknown }).src;
        return typeof src === 'string' ? src : '';
      }
      return '';
    }).filter(Boolean);
  }
  if (typeof value === 'string') {
    try { return asImageUrls(JSON.parse(value)); } catch { return []; }
  }
  return [];
}

function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  const bg = score >= 70 ? "bg-emerald-50" : score >= 40 ? "bg-amber-50" : "bg-red-50";
  const label = score >= 70 ? "Excellent" : score >= 40 ? "Moyen" : "Faible";
  const cls = size === "lg" ? "text-sm font-bold px-3 py-1.5" : "text-[11px] font-semibold px-2 py-1";
  return <span className={`${cls} rounded-full ${bg}`} style={{ color }}>{label} {score}%</span>;
}

function plainTextToHtml(text: string): string {
  return text
    .split('\n\n')
    .filter(Boolean)
    .map(p => `<p>${p.trim()}</p>`)
    .join('')
}

export default function AIPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [guideVisible, setGuideVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, GeneratedContent>>({});
  const [plan, setPlan] = useState("free");
  const [tasksUsed, setTasksUsed] = useState(0);
  const [massMode, setMassMode] = useState(false);
  const [massProgress, setMassProgress] = useState({ current: 0, total: 0 });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState({ current: 0, total: 0 });
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItems, setPreviewItems] = useState<AIPreviewItem[]>([]);
  const [applyingPreview, setApplyingPreview] = useState(false);

  useEffect(() => { document.title = "Optimisation IA | EcomPilot"; }, []);

  useEffect(() => {
    fetch("/api/shopify/products").then((r) => r.json()).then((d) => {
      setProducts((d.products || []).map((p: Product) => ({ ...p, price: p.variants?.[0]?.price || p.price || "0" })));
      setLoading(false);
    }).catch(() => setLoading(false));

    // Fetch user plan + actions_used for QuotaGate
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from("users").select("plan, actions_used").eq("id", user.id).single();
        if (data) { setPlan(data.plan || "free"); setTasksUsed(data.actions_used || 0); }
      } catch { /* silent */ }
    };
    fetchProfile();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const score = seoScore(p);
      const matchScore = scoreFilter === "all"
        || (scoreFilter === "low" && score < 40)
        || (scoreFilter === "medium" && score >= 40 && score < 70)
        || (scoreFilter === "high" && score >= 70);
      return matchSearch && matchScore;
    });
  }, [products, searchQuery, scoreFilter]);

  const stats = useMemo(() => {
    const scores = products.map(seoScore);
    const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const low = scores.filter((s) => s < 40).length;
    const medium = scores.filter((s) => s >= 40 && s < 70).length;
    const high = scores.filter((s) => s >= 70).length;
    return { avg, low, medium, high, total: scores.length };
  }, [products]);

  const generateForProduct = async (product: Product, mode: "full" | "title" | "tags" = "full") => {
    setGuideVisible(false)
    setGenerating(product.id);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { title: product.title, description: product.body_html }, mode }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setGeneratedContent((prev) => ({ ...prev, [product.id]: { ...prev[product.id], ...data } }));
      setExpandedId(product.id); // auto-expand pour accès immédiat
      addToast(" Contenu IA prêt — cliquez \"Tout appliquer\" ci-dessous", "success");
    } catch { addToast("Erreur IA — vérifiez votre clé OpenAI", "error"); }
    setGenerating(null);
  };

  const generateAndApply = async (product: Product) => {
    setGuideVisible(false)
    if (!confirm(`Générer et appliquer directement le contenu IA pour « ${product.title} » ?\nCette action modifie immédiatement votre fiche Shopify.`)) return;
    setGenerating(product.id);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { title: product.title, description: product.body_html }, mode: "full" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      await Promise.all(
        ([
          data.title && fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [product.id], field: "title", value: data.title }) }),
          data.description && fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [product.id], field: "body_html", value: plainTextToHtml(data.description) }) }),
          (data.keywords || data.tags) && fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [product.id], field: "tags", value: data.keywords || data.tags }) }),
        ] as Promise<Response>[])
      );
      // Mise à jour locale du produit pour recalculer le score SEO immédiatement
      setProducts((prev) => prev.map((p) => {
        if (p.id !== product.id) return p;
        return {
          ...p,
          ...(data.title ? { title: data.title } : {}),
          ...(data.description ? { body_html: data.description } : {}),
          ...((data.keywords || data.tags) ? { tags: data.keywords || data.tags } : {}),
        };
      }));
      addToast(" Appliqué ! Score SEO mis à jour.", "success");
      // Écriture historique (fire-and-forget)
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          void supabase.from("action_history").insert({
            user_id: user.id,
            action_type: "ai",
            description: `Optimisation IA — ${data.title || product.title}`,
            products_count: 1,
            credits_used: 1,
            details: { product_title: data.title || product.title, fields: ["title", "description", "tags"] },
          });
        }
      } catch { /* ignore history errors */ }
    } catch { addToast("Erreur lors de l'application IA directe", "error"); }
    setGenerating(null);
  };

  const applyGenerated = async (productId: string, fields?: string[]) => {
    setGuideVisible(false)
    const content = generatedContent[productId];
    if (!content) return;
    setGenerating(productId);
    try {
      const toApply = fields || ["title", "description", "tags"];
      await Promise.all(toApply.map(async (field) => {
        const value = field === "title" ? content.title : field === "description" ? (content.description ? plainTextToHtml(content.description) : undefined) : (content.keywords || content.tags);
        if (!value) return;
        const apiField = field === "description" ? "body_html" : field === "tags" ? "tags" : field;
        await fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [productId], field: apiField, value }) });
      }));
      // Mise à jour locale pour recalculer le score SEO immédiatement
      setProducts((prev) => prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          ...(toApply.includes("title") && content.title ? { title: content.title } : {}),
          ...(toApply.includes("description") && content.description ? { body_html: content.description } : {}),
          ...((toApply.includes("tags") && (content.keywords || content.tags)) ? { tags: content.keywords || content.tags } : {}),
        };
      }));
      addToast(" Appliqué ! Score SEO mis à jour.", "success");
      // Écriture historique (fire-and-forget)
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const prod = products.find((p) => p.id === productId);
          void supabase.from("action_history").insert({
            user_id: user.id,
            action_type: "ai",
            description: `Optimisation IA — ${content.title || prod?.title || productId}`,
            products_count: 1,
            credits_used: 1,
            details: { product_title: content.title || prod?.title || productId, fields: toApply },
          });
        }
      } catch { /* ignore history errors */ }
      setGeneratedContent((prev) => { const n = { ...prev }; delete n[productId]; return n; });
    } catch { addToast("Erreur lors de l'application", "error"); }
    setGenerating(null);
  };

  const handleMassGenerate = async () => {
    setGuideVisible(false)
    if (selected.length === 0) return;
    setMassMode(true);
    setMassProgress({ current: 0, total: selected.length });
    let completed = 0;
    // Process in batches of 3 to avoid rate limiting and reduce costs
    const BATCH_SIZE = 3;
    for (let i = 0; i < selected.length; i += BATCH_SIZE) {
      const batchIds = selected.slice(i, i + BATCH_SIZE);
      await Promise.all(batchIds.map(async (selId) => {
        const product = products.find((p) => p.id === selId);
        if (!product) { completed++; setMassProgress({ current: completed, total: selected.length }); return; }
        try {
          const res = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ product: { title: product.title, description: product.body_html }, mode: "full" }) });
          if (!res.ok) { completed++; setMassProgress({ current: completed, total: selected.length }); return; }
          const data = await res.json();
          setGeneratedContent((prev) => ({ ...prev, [product.id]: data }));
        } catch { /* continue */ }
        completed++;
        setMassProgress({ current: completed, total: selected.length });
      }));
    }
    addToast(`${selected.length} produit${selected.length > 1 ? "s" : ""} analysé${selected.length > 1 ? "s" : ""} par l'IA`, "success");
    setMassMode(false);
  };

  const handleMassApply = async () => {
    setGuideVisible(false)
    // Build preview items for human-in-the-loop
    const ids = Object.keys(generatedContent);
    const items: AIPreviewItem[] = ids.map((id) => {
      const product = products.find((p) => p.id === id);
      const content = generatedContent[id];
      return {
        id: Number(id) || parseInt(id),
        productTitle: product?.title || "Produit",
        productImage: asImageUrls(product?.images)[0],
        original: {
          title: product?.title,
          description: product?.body_html,
          tags: product?.tags,
          meta_description: undefined,
        },
        suggested: {
          title: content?.title,
          description: content?.description,
          tags: content?.keywords || content?.tags,
          meta_description: content?.meta_description,
        },
        accepted: true,
      };
    });
    setPreviewItems(items);
    setShowPreviewModal(true);
  };

  const handlePreviewApply = async (acceptedItems: AIPreviewItem[]) => {
    setIsPublishing(true);
    setPublishProgress({ current: 0, total: acceptedItems.length });
    let successCount = 0;
    for (let i = 0; i < acceptedItems.length; i++) {
      const item = acceptedItems[i];
      setPublishProgress({ current: i + 1, total: acceptedItems.length });
      const id = String(item.id);
      const updates: string[] = [];
      if (item.suggested.title) updates.push("title");
      if (item.suggested.description) updates.push("description");
      if (item.suggested.tags) updates.push("tags");
      if (item.suggested.meta_description) updates.push("meta_description");
      setGeneratedContent((prev) => ({
        ...prev,
        [id]: {
          title: item.suggested.title,
          description: item.suggested.description,
          keywords: item.suggested.tags,
          meta_description: item.suggested.meta_description,
        },
      }));
      try {
        await applyGenerated(id, updates);
        successCount++;
      } catch { /* continue */ }
    }
    setIsPublishing(false);
    setPublishProgress({ current: 0, total: 0 });
    addToast(`${successCount}/${acceptedItems.length} produit${acceptedItems.length > 1 ? "s" : ""} optimisé${acceptedItems.length > 1 ? "s" : ""}`, "success");
    setShowPreviewModal(false);
    setApplyingPreview(false);
    setSelected([]);
  };

  const previewProduct = previewId ? products.find((p) => p.id === previewId) : null;
  const previewContent = previewId ? generatedContent[previewId] : null;

  return (
    <QuotaGate plan={plan} tasksUsed={tasksUsed}>
    <div className="max-w-6xl mx-auto">
      {/* Before/After Modal */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Comparaison Avant / Après</h3>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>{previewProduct.title}</p>
              </div>
              <button onClick={() => setPreviewId(null)}><X className="w-5 h-5" style={{ color: "var(--text-tertiary)" }} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Before */}
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#dc2626" }}>Avant</p>
                <div className="space-y-3">
                  <div><p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Titre</p><p className="text-sm" style={{ color: "var(--text-primary)" }}>{previewProduct.title}</p></div>
                  <div><p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Description</p>
                    {previewProduct.body_html ? <div className="text-sm prose prose-sm max-w-none" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: previewProduct.body_html }} />
                      : <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>Aucune description</p>}
                  </div>
                  <div><p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Tags</p><p className="text-xs" style={{ color: "var(--text-secondary)" }}>{previewProduct.tags || "Aucun"}</p></div>
                  <div><p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Meta Description</p><p className="text-xs italic" style={{ color: "var(--text-tertiary)" }}>Non définie</p></div>
                  <ScoreBadge score={seoScore(previewProduct)} size="lg" />
                </div>
              </div>
              {/* After */}
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#059669" }}>Après (IA)</p>
                {previewContent ? (
                  <div className="space-y-3">
                    <div><p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Titre</p><p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{previewContent.title || previewProduct.title}</p></div>
                    <div><p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Description</p>
                      {previewContent.description ? <div className="text-sm prose prose-sm max-w-none" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: previewContent.description }} />
                        : <p className="text-sm italic" style={{ color: "var(--text-tertiary)" }}>Non générée</p>}
                    </div>
                    <div><p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Mots-clés</p><p className="text-xs" style={{ color: "var(--text-secondary)" }}>{previewContent.keywords || "—"}</p></div>
                    <div><p className="text-[11px] font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Meta Description</p>
                      {previewContent.meta_description ? (
                        <div>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{previewContent.meta_description}</p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{previewContent.meta_description.length}/160 caractères</p>
                        </div>
                      ) : <p className="text-xs italic" style={{ color: "var(--text-tertiary)" }}>Non générée</p>}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Sparkles className="w-8 h-8 mb-2" style={{ color: "#d1d5db" }} />
                    <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Générez le contenu IA d&apos;abord</p>
                  </div>
                )}
              </div>
            </div>
            {previewContent && (
              <div className="mt-4 flex justify-end gap-3">
                <button onClick={() => { setPreviewId(null); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Fermer</button>
                <button onClick={() => { applyGenerated(previewProduct.id); setPreviewId(null); }} disabled={generating === previewProduct.id}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                  <ArrowRight className="w-4 h-4" style={{ color: "#fff" }} /><span style={{ color: "#fff" }}>Appliquer sur Shopify</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Optimisation IA</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>Analysez et optimisez le SEO de votre catalogue avec l&apos;intelligence artificielle</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.keys(generatedContent).length > 0 && (
            <button onClick={handleMassApply} disabled={massMode}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-sm font-medium">
              {massMode ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <CheckCircle2 className="w-4 h-4" style={{ color: "#fff" }} />}
              <span style={{ color: "#fff" }}>Appliquer tout ({Object.keys(generatedContent).length})</span>
            </button>
          )}
          {selected.length > 0 && (
            <button onClick={handleMassGenerate} disabled={massMode}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium">
              {massMode ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Sparkles className="w-4 h-4" style={{ color: "#fff" }} />}
              <span style={{ color: "#fff" }}>{massMode ? `${massProgress.current}/${massProgress.total}...` : `Optimiser ${selected.length} produit${selected.length > 1 ? "s" : ""}`}</span>
            </button>
          )}
          {selected.length > 0 && (
            <button onClick={async () => {
              setMassMode(true);
              try {
                const prods = selected.map((id) => products.find((p) => p.id === id)).filter(Boolean)
                  .map((p) => ({ id: p!.id, title: p!.title, description: p!.body_html }));
                const res = await fetch("/api/ai/generate-meta-titles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: prods }) });
                if (!res.ok) throw new Error();
                const data = await res.json();
                addToast(data.demo ? `[DEMO] ${(data.metaTitles||[]).length} meta titres simulés` : `${(data.metaTitles||[]).length} meta titres générés`, "success");
              } catch { addToast("Erreur meta titres", "error"); }
              finally { setMassMode(false); }
            }} disabled={massMode}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 rounded-lg text-sm font-medium">
              <Target className="w-4 h-4" style={{ color: "#8b5cf6" }} />
              <span style={{ color: "#6d28d9" }}>Meta Titres IA</span>
            </button>
          )}
          {selected.length > 0 && (
            <button onClick={async () => {
              setMassMode(true);
              try {
                const prods = selected.map((id) => products.find((p) => p.id === id)).filter(Boolean)
                  .map((p) => ({ id: p!.id, title: p!.title, description: p!.body_html }));
                const res = await fetch("/api/ai/generate-meta-descriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: prods }) });
                if (!res.ok) throw new Error();
                const data = await res.json();
                addToast(data.demo ? `[DEMO] ${(data.metaDescriptions||[]).length} meta descriptions simulées` : `${(data.metaDescriptions||[]).length} meta descriptions générées`, "success");
              } catch { addToast("Erreur meta descriptions", "error"); }
              finally { setMassMode(false); }
            }} disabled={massMode}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 rounded-lg text-sm font-medium">
              <Award className="w-4 h-4" style={{ color: "#8b5cf6" }} />
              <span style={{ color: "#6d28d9" }}>Meta Desc IA</span>
            </button>
          )}
        </div>
      </div>

      <GuideBanner
        visible={guideVisible}
        icon="i"
        title="Optimisation IA"
        text={'Sélectionnez des produits puis cliquez sur "Générer avec l\'IA". L\'IA réécrira automatiquement les titres, descriptions et tags en français optimisé pour le SEO. Vous pourrez vérifier et modifier chaque résultat avant de publier.'}
        onClose={() => setGuideVisible(false)}
      />

      {/* Upsell notice when below 80% tasks remaining */}
      {(() => {
        const total = PLAN_TASKS[plan] || 100;
        const remaining = Math.max(0, total - tasksUsed);
        if (remaining >= total * 0.8) return null;
        return (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 mb-4" style={{ backgroundColor: "#fffbeb" }}>
            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "#d97706" }} />
            <p className="text-sm flex-1" style={{ color: "#92400e" }}>
              <strong>{remaining}</strong> action{remaining !== 1 ? "s" : ""} restante{remaining !== 1 ? "s" : ""} sur {total} ce mois.{" "}
              {(plan === "free" || plan === "starter") && (
                <a href="/dashboard/billing" className="underline font-medium">Passez au plan Pro pour 20 000 actions →</a>
              )}
            </p>
          </div>
        );
      })()}

      {/* Publish progress bar */}
      {isPublishing && publishProgress.total > 0 && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium" style={{ color: '#065f46' }}>Publication en cours...</span>
            <span className="text-sm font-bold" style={{ color: '#059669' }}>{publishProgress.current}/{publishProgress.total}</span>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-2.5">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${publishProgress.total > 0 ? (publishProgress.current / publishProgress.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Score moyen", value: `${stats.avg}%`, icon: BarChart3, color: "#2563eb", bg: "#eff6ff" },
          { label: "SEO Faible", value: stats.low.toString(), icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2" },
          { label: "SEO Moyen", value: stats.medium.toString(), icon: Target, color: "#d97706", bg: "#fffbeb" },
          { label: "SEO Excellent", value: stats.high.toString(), icon: Award, color: "#059669", bg: "#ecfdf5" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: stat.bg }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{stat.value}</p>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20" style={{ color: "var(--text-primary)", paddingLeft: '40px' }} />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {[{ key: "all", label: "Tous" }, { key: "low", label: "Faible" }, { key: "medium", label: "Moyen" }, { key: "high", label: "Excellent" }].map((f) => (
            <button key={f.key} onClick={() => setScoreFilter(f.key as typeof scoreFilter)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${scoreFilter === f.key ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
              style={{ color: scoreFilter === f.key ? "#0f172a" : "#64748b" }}>{f.label}</button>
          ))}
        </div>
        <button onClick={() => setSelected(selected.length === filteredProducts.length ? [] : filteredProducts.map((p) => p.id))}
          className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50" style={{ color: "var(--text-secondary)" }}>
          {selected.length === filteredProducts.length && filteredProducts.length > 0 ? "Désélectionner tout" : "Tout sélectionner"}
        </button>
      </div>

      {/* Products list */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin mb-3" style={{ color: "#8b5cf6" }} />
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Chargement des produits...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4" style={{ color: "#cbd5e1" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Aucun produit</h3>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Connectez votre boutique et importez des produits</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const gen = generatedContent[product.id];
            const isGenerating = generating === product.id;
            const isSelected = selected.includes(product.id);
            const score = seoScore(product);
            const isExpanded = expandedId === product.id;

            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl border ${isSelected ? "border-violet-300 ring-2 ring-violet-100" : "border-gray-200"} overflow-hidden transition-all`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return
                  setGuideVisible(false)
                  setDetailProduct(product)
                }}
                style={{ cursor: 'pointer' }}>
                <div className="flex items-center gap-4 p-4">
                  <button onClick={() => {
                    setGuideVisible(false)
                    setSelected((p) => p.includes(product.id) ? p.filter((i) => i !== product.id) : [...p, product.id])
                  }}
                    className={`w-5 h-5 rounded border-2 flex-shrink-0 ${isSelected ? "bg-violet-600 border-violet-600" : "border-gray-300"} flex items-center justify-center`}>
                    {isSelected && <CheckCircle2 className="w-3 h-3" style={{ color: "#fff" }} />}
                  </button>
                  <div className="rounded-lg bg-gray-100 overflow-hidden flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                    {asImageUrls(product.images)[0] ? <img src={asImageUrls(product.images)[0]} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{product.title.length > 40 ? product.title.slice(0, 40) + '…' : product.title}</p>
                    <p className="text-xs mt-0.5">
                      <span style={{ color: '#16a34a', fontWeight: 600 }}>{parseFloat(product.price).toFixed(2)} €</span>
                      <span style={{ color: 'var(--text-tertiary)' }}> · {product.tags?.split(",").length || 0} tags · {product.body_html ? `${product.body_html.length} car.` : "Pas de description"}</span>
                    </p>
                  </div>
                  <ScoreBadge score={score} />
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <button onClick={() => generateForProduct(product, "tags")} disabled={!!generating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 rounded-lg text-xs font-medium disabled:opacity-50">
                      <Tag className="w-3.5 h-3.5" style={{ color: "#d97706" }} /><span className="hidden sm:inline" style={{ color: "#92400e" }}>Tags</span>
                    </button>
                    <button onClick={() => generateForProduct(product)} disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 rounded-lg text-xs font-medium disabled:opacity-50">
                      {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#8b5cf6" }} /> : <Wand2 className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />}
                      <span className="hidden sm:inline" style={{ color: "#6d28d9" }}>Prévisualiser</span>
                    </button>
                    <button onClick={() => generateAndApply(product)} disabled={!!generating}
                      title="Génère et applique directement sans prévisualisation"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 rounded-lg text-xs font-semibold disabled:opacity-50">
                      {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#059669" }} /> : <Zap className="w-3.5 h-3.5" style={{ color: "#059669" }} />}
                      <span className="hidden sm:inline" style={{ color: "#065f46" }}>Appliquer direct</span>
                    </button>
                    {gen && (
                      <button onClick={() => applyGenerated(product.id)} disabled={generating === product.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#fff" }} /><span className="hidden sm:inline" style={{ color: "#fff" }}>Appliquer</span>
                      </button>
                    )}
                    {gen && (
                      <button onClick={() => setPreviewId(product.id)} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-medium">
                        <Eye className="w-3.5 h-3.5" style={{ color: "#2563eb" }} /><span style={{ color: "#1d4ed8" }}>Avant/Après</span>
                      </button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : product.id)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />}
                    </button>
                  </div>
                </div>

                {/* Expanded: generated content */}
                {isExpanded && gen && (
                  <div className="px-4 pb-4">
                    <div className="p-4 bg-violet-50/50 rounded-xl border border-violet-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gen.title && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>Titre SEO</p>
                              <button onClick={() => applyGenerated(product.id, ["title"])} className="text-[10px] px-2 py-0.5 bg-violet-600 rounded font-medium" style={{ color: "#fff" }}>Appliquer</button>
                            </div>
                            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{gen.title}</p>
                          </div>
                        )}
                        {(gen.keywords || gen.tags) && (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>Mots-clés / Tags</p>
                              <button onClick={() => applyGenerated(product.id, ["tags"])} className="text-[10px] px-2 py-0.5 bg-violet-600 rounded font-medium" style={{ color: "#fff" }}>Appliquer</button>
                            </div>
                            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{gen.keywords || gen.tags}</p>
                          </div>
                        )}
                        {gen.description && (
                          <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>Description complète</p>
                              <button onClick={() => applyGenerated(product.id, ["description"])} className="text-[10px] px-2 py-0.5 bg-violet-600 rounded font-medium" style={{ color: "#fff" }}>Appliquer</button>
                            </div>
                            <div className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }} dangerouslySetInnerHTML={{ __html: gen.description }} />
                          </div>
                        )}
                        {gen.meta_description && (
                          <div className="md:col-span-2">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8b5cf6" }}>Meta Description</p>
                              <button onClick={() => applyGenerated(product.id, ["meta_description"])} className="text-[10px] px-2 py-0.5 bg-violet-600 rounded font-medium" style={{ color: "#fff" }}>Appliquer</button>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{gen.meta_description}</p>
                            <p className="text-[10px] mt-1" style={{ color: "var(--text-tertiary)" }}>{gen.meta_description.length}/160 caractères</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button onClick={() => applyGenerated(product.id)} disabled={generating === product.id}
                          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                          {generating === product.id ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <ArrowRight className="w-4 h-4" style={{ color: "#fff" }} />}
                          <span style={{ color: "#fff" }}>Tout appliquer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Human-in-the-loop Preview Modal */}
      {showPreviewModal && previewItems.length > 0 && (
        <AIPreviewModal
          items={previewItems}
          onApply={handlePreviewApply}
          onClose={() => setShowPreviewModal(false)}
          loading={applyingPreview}
        />
      )}

      <ProductDetailsModal
        open={!!detailProduct}
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
      />
    </div>
    </QuotaGate>
  );
}
