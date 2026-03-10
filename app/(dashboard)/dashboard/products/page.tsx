"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, RefreshCw, Download, Upload, ChevronLeft, ChevronRight, Package,
  CheckSquare, Square, ImageOff, ArrowUpDown, DollarSign,
  X, Copy, Archive, CheckCircle2, Tag, Type, FileText, Sparkles,
  AlertTriangle, Wand2, TrendingUp, Loader2, Eye, BarChart3, LayoutList, Save,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import Link from "next/link";
import { ConfirmModal } from "@/lib/confirm-modal";
import QuotaGate from "@/components/QuotaGate";
import AIPreviewModal, { type AIPreviewItem } from "@/components/AIPreviewModal";
import { createClient } from "@/lib/supabase/client";

interface ShopifyImage { src: string }
interface Product {
  id: string;
  title: string;
  price: string;
  status: string;
  images?: ShopifyImage[];
  variants?: { id: string; price: string; inventory_quantity?: number }[];
  product_type?: string;
  vendor?: string;
  tags?: string;
  body_html?: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface AISuggestion {
  productId: string;
  title?: string;
  description?: string;
  tags?: string;
  price?: string;
}

type SortKey = "title" | "price" | "status" | "seo";
type SortDir = "asc" | "desc";

/* ── SEO Scoring — score sur 100 ─────────────── */
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
  const imgCount = p.images?.length || 0;
  if (imgCount >= 3) s += 15;
  else if (imgCount >= 1) s += 10;
  return s;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "#059669" : score >= 40 ? "#d97706" : "#dc2626";
  const bg = score >= 70 ? "bg-emerald-50" : score >= 40 ? "bg-amber-50" : "bg-red-50";
  const label = score >= 70 ? "Excellent" : score >= 40 ? "Moyen" : "Faible";
  return (
    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${bg}`} style={{ color }}>
      {label} {score}%
    </span>
  );
}

export default function ProductsPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [bulkPrice, setBulkPrice] = useState("");
  /* ── Price tools bar ── */
  const [priceOp, setPriceOp] = useState<'increase' | 'decrease'>('increase');
  const [priceValue, setPriceValue] = useState<number>(0);
  const [priceUnit, setPriceUnit] = useState<'%' | '€'>('%');
  const [priceRounding, setPriceRounding] = useState<'none' | '99' | '95' | 'round'>('none');
  const [bulkPriceMode, setBulkPriceMode] = useState<"fixed" | "percent_up" | "percent_down" | "multiply">("fixed");
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkDescription, setBulkDescription] = useState("");
  const [bulkTags, setBulkTags] = useState("");
  const [bulkMetaTitle, setBulkMetaTitle] = useState("");
  const [bulkMetaDescription, setBulkMetaDescription] = useState("");
  const [recentlyUpdated, setRecentlyUpdated] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkDescMode, setBulkDescMode] = useState<"replace" | "append">("replace");
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; action: () => void }>({
    open: false, title: "", message: "", action: () => {}
  });
  /* ── AI state ── */
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISuggestion>>({});
  const [aiBatchLoading, setAiBatchLoading] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [plan, setPlan] = useState("free");
  const [tasksUsed, setTasksUsed] = useState(0);
  const [compactMode, setCompactMode] = useState(false);
  const [showAIPreviewModal, setShowAIPreviewModal] = useState(false);
  const [aiPreviewItems, setAiPreviewItems] = useState<AIPreviewItem[]>([]);
  const [titlePrefix, setTitlePrefix] = useState("");
  const [titleSuffix, setTitleSuffix] = useState("");
  const [descCommonText, setDescCommonText] = useState("");
  const [descCommonMode, setDescCommonMode] = useState<"prepend" | "append" | "remove">("append");
  const itemsPerPage = compactMode ? 50 : 25;

  /* ──────── Fetch ──────── */
  const fetchProducts = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/shopify/products");
      if (!response.ok) throw new Error("Impossible de récupérer les produits — vérifiez votre connexion Shopify.");
      const data = await response.json();
      const prods = (data.products || []).map((p: Product) => ({
        ...p,
        price: p.variants?.[0]?.price || p.price || "0.00",
      }));
      setProducts(prods);
      if (showRefresh) addToast(`${prods.length} produit${prods.length > 1 ? "s" : ""} synchronisé${prods.length > 1 ? "s" : ""}`, "success");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Load compact mode preference
  useEffect(() => {
    const saved = localStorage.getItem("catalog-compact") === "true";
    setCompactMode(saved);
  }, []);

  // Fetch user plan for QuotaGate
  useEffect(() => {
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

  /* ──────── Filter / Sort ──────── */
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const price = parseFloat(p.price);
      const matchPriceMin = !priceMin || price >= parseFloat(priceMin);
      const matchPriceMax = !priceMax || price <= parseFloat(priceMax);
      return matchSearch && matchStatus && matchPriceMin && matchPriceMax;
    });
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "price") cmp = parseFloat(a.price) - parseFloat(b.price);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "seo") cmp = seoScore(a) - seoScore(b);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [products, searchQuery, statusFilter, priceMin, priceMax, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  /* ──────── Shortcuts ──────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); selectAll(); }
      if (e.key === "Escape") { setSelectedProducts([]); setActiveAction(null); setPreviewProduct(null); }
      if (e.key === "ArrowLeft" && currentPage > 1) setCurrentPage((p) => p - 1);
      if (e.key === "ArrowRight" && currentPage < totalPages) setCurrentPage((p) => p + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, totalPages, filteredProducts]);

  /* ──────── Selection ──────── */
  const toggleSelectProduct = (id: string) => {
    setSelectedProducts((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    setSelectedProducts((prev) => prev.length === filteredProducts.length ? [] : filteredProducts.map((p) => p.id));
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const getStatusBadge = (status: string) => {
    const m: Record<string, { label: string; cls: string }> = {
      active: { label: "Actif", cls: "text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700" },
      archived: { label: "Archivé", cls: "text-[11px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600" },
      draft: { label: "Brouillon", cls: "text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700" },
    };
    const s = m[status] || { label: status, cls: "text-[11px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-600" };
    return <span className={s.cls}>{s.label}</span>;
  };

  /* ──────── AI batch generation ──────── */
  const aiBatchGenerate = async (mode: "title" | "tags" | "full" | "price") => {
    if (selectedProducts.length === 0) return;
    setAiBatchLoading(true);
    const results: Record<string, AISuggestion> = {};
    const batch = selectedProducts.map(async (id) => {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      try {
        const res = await fetch("/api/ai/generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product: { title: p.title, description: p.body_html, price: p.price }, mode }),
        });
        if (!res.ok) return;
        const data = await res.json();
        results[id] = { productId: id, ...data };
      } catch { /* continue */ }
    });
    await Promise.all(batch);
    setAiSuggestions((prev) => ({ ...prev, ...results }));
    // Build AIPreviewModal items for human-in-the-loop review
    const previewItems: AIPreviewItem[] = Object.entries(results).map(([id, sug]) => {
      const p = products.find((x) => x.id === id);
      return {
        id: Number(id) || 0,
        productTitle: p?.title || id,
        productImage: p?.images?.[0]?.src,
        original: { title: p?.title, description: p?.body_html, tags: p?.tags },
        suggested: {
          title: (sug as AISuggestion).title,
          description: (sug as AISuggestion).description,
          tags: (sug as AISuggestion).tags,
        },
        accepted: true,
      };
    });
    if (previewItems.length > 0) {
      setAiPreviewItems(previewItems);
      setShowAIPreviewModal(true);
    }
    const anyDemo = Object.values(results).some((r: unknown) => (r as Record<string, unknown>).demo === true);
    addToast(
      anyDemo
        ? `[DEMO] ${Object.keys(results).length} suggestion${Object.keys(results).length > 1 ? "s" : ""} simulée${Object.keys(results).length > 1 ? "s" : ""} — ajoutez OPENAI_API_KEY pour l'IA réelle`
        : `IA: ${Object.keys(results).length} suggestion${Object.keys(results).length > 1 ? "s" : ""} générée${Object.keys(results).length > 1 ? "s" : ""}`,
      "success"
    );
    setAiBatchLoading(false);
  };

  const handleAIPreviewApply = (acceptedItems: AIPreviewItem[]) => {
    const updated: Record<string, AISuggestion> = { ...aiSuggestions };
    acceptedItems.forEach((item) => {
      const id = String(item.id);
      updated[id] = {
        productId: id,
        title: item.suggested.title || aiSuggestions[id]?.title,
        description: item.suggested.description || aiSuggestions[id]?.description,
        tags: item.suggested.tags || aiSuggestions[id]?.tags,
      };
    });
    setAiSuggestions(updated);
    setShowAIPreviewModal(false);
    const n = acceptedItems.length;
    addToast(`${n} suggestion${n > 1 ? "s" : ""} IA prête${n > 1 ? "s" : ""} — appliquez depuis le tableau`, "success");
    const ids = acceptedItems.map((i) => String(i.id));
    setRecentlyUpdated(ids);
    setTimeout(() => setRecentlyUpdated([]), 2000);
  };

  const applyAISuggestion = async (productId: string, field: string) => {
    const sug = aiSuggestions[productId];
    if (!sug) return;
    const value = field === "title" ? sug.title : field === "tags" ? sug.tags : field === "body_html" ? sug.description : sug.price;
    if (!value) return;
    setActionLoading(`ai-apply-${productId}`);
    try {
      await fetch("/api/shopify/bulk-edit", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [productId], field, value }),
      });
      // Update local state immediately — no refetch needed
      setProducts((prev) => prev.map((p) => p.id === productId ? {
        ...p,
        ...(field === "title" ? { title: value } : {}),
        ...(field === "body_html" ? { body_html: value } : {}),
        ...(field === "tags" ? { tags: value } : {}),
      } : p));
      addToast("Suggestion IA appliquée", "success");
    } catch { addToast("Erreur — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const applyAllForProduct = async (productId: string) => {
    const sug = aiSuggestions[productId];
    if (!sug) return;
    setActionLoading(`ai-apply-all-${productId}`);
    try {
      const calls: Promise<Response>[] = [];
      if (sug.title) calls.push(fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: [productId], field: "title", value: sug.title }) }));
      if (sug.description) calls.push(fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: [productId], field: "body_html", value: sug.description }) }));
      if (sug.tags) calls.push(fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: [productId], field: "tags", value: sug.tags }) }));
      await Promise.all(calls);
      setProducts((prev) => prev.map((p) => p.id === productId ? {
        ...p,
        ...(sug.title ? { title: sug.title } : {}),
        ...(sug.description ? { body_html: sug.description } : {}),
        ...(sug.tags ? { tags: sug.tags } : {}),
      } : p));
      setAiSuggestions((prev) => { const next = { ...prev }; delete next[productId]; return next; });
      addToast("Toutes les suggestions IA appliquées ✓", "success");
      setPreviewProduct(null);
    } catch { addToast("Erreur — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const aiBatchDescriptions = async () => {
    if (selectedProducts.length === 0) return;
    setAiBatchLoading(true);
    try {
      const prods = selectedProducts
        .map((id) => {
          const p = products.find((x) => x.id === id);
          return p ? { id: p.id, title: p.title, description: p.body_html, price: p.price } : null;
        })
        .filter(Boolean);
      const batches = [];
      for (let i = 0; i < prods.length; i += 10) {
        batches.push(prods.slice(i, i + 10));
      }
      const allResults: Record<string, AISuggestion> = {};
      await Promise.all(
        batches.map(async (batch) => {
          const res = await fetch("/api/ai/generate-descriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ products: batch }),
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.descriptions) {
            data.descriptions.forEach((d: { id: string; description: string }) => {
              allResults[d.id] = { productId: d.id, description: d.description };
            });
          }
        })
      );
      setAiSuggestions((prev) => ({ ...prev, ...allResults }));
      addToast(
        `IA: ${Object.keys(allResults).length} description${Object.keys(allResults).length > 1 ? "s" : ""} générée${Object.keys(allResults).length > 1 ? "s" : ""}`,
        "success"
      );
    } catch {
      addToast("Erreur IA — réessayez", "error");
    }
    setAiBatchLoading(false);
  };

  const applyAllAISuggestions = async () => {
    setAiBatchLoading(true);
    const ids = Object.keys(aiSuggestions);
    await Promise.all(
      ids.map(async (id) => {
        const sug = aiSuggestions[id];
        if (!sug) return;
        try {
          const calls: Promise<Response>[] = [];
          if (sug.title) calls.push(fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: [id], field: "title", value: sug.title }) }));
          if (sug.description) calls.push(fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: [id], field: "body_html", value: sug.description }) }));
          if (sug.tags) calls.push(fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productIds: [id], field: "tags", value: sug.tags }) }));
          await Promise.all(calls);
        } catch { /* continue */ }
      })
    );
    // Mise à jour locale immédiate pour recalculer les scores SEO sans refetch
    setProducts((prev) => prev.map((p) => {
      const sug = aiSuggestions[p.id];
      if (!sug) return p;
      return {
        ...p,
        ...(sug.title ? { title: sug.title } : {}),
        ...(sug.description ? { body_html: sug.description } : {}),
        ...(sug.tags ? { tags: sug.tags } : {}),
      };
    }));
    // Écriture historique (fire-and-forget)
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await Promise.all(ids.map((id) => {
          const sug = aiSuggestions[id];
          const prod = products.find((p) => p.id === id);
          if (!sug) return Promise.resolve();
          return supabase.from("action_history").insert({
            user_id: user.id,
            action_type: "ai",
            description: `Optimisation IA — ${sug.title || prod?.title || id}`,
            products_count: 1,
            credits_used: 1,
            details: { product_title: sug.title || prod?.title || id, fields: ["title", "description", "tags"].filter((f) => f === "title" ? !!sug.title : f === "description" ? !!sug.description : !!sug.tags) },
          });
        }));
      }
    } catch { /* ignore history errors */ }
    addToast(`${ids.length} produit${ids.length > 1 ? "s" : ""} mis à jour avec l'IA`, "success");
    setAiSuggestions({});
    setAiBatchLoading(false);
  };

  /* ──────── Bulk actions ──────── */
  const handleBulkPriceApply = async () => {
    if (!bulkPrice) return;
    setActionLoading("price");

    // Compute new prices locally first
    const newPriceLocal = (currentPrice: string): string => {
      const cur = parseFloat(currentPrice) || 0;
      const val = parseFloat(bulkPrice) || 0;
      if (bulkPriceMode === "fixed") return val.toFixed(2);
      if (bulkPriceMode === "percent_up") return (cur * (1 + val / 100)).toFixed(2);
      if (bulkPriceMode === "percent_down") return (cur * (1 - val / 100)).toFixed(2);
      if (bulkPriceMode === "multiply") return (cur * val).toFixed(2);
      return currentPrice;
    };

    try {
      let mode = "fixed";
      let val = bulkPrice;
      if (bulkPriceMode === "percent_up") { mode = "percent"; }
      else if (bulkPriceMode === "percent_down") { mode = "percent"; val = `-${bulkPrice}`; }
      else if (bulkPriceMode === "multiply") { mode = "multiply"; }

      const res = await fetch("/api/shopify/bulk-update", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProducts, newPrice: val, mode }),
      });

      // Update local state regardless (optimistic update on success, UI stays coherent)
      if (res.ok) {
        setProducts((prev) => prev.map((p) =>
          selectedProducts.includes(p.id)
            ? { ...p, price: newPriceLocal(p.price), variants: p.variants?.map((v) => ({ ...v, price: newPriceLocal(v.price) })) }
            : p
        ));
        addToast(`✅ ${selectedProducts.length} prix mis à jour`, "success");
      } else {
        // Demo mode: still update locally so UI reflects the change
        setProducts((prev) => prev.map((p) =>
          selectedProducts.includes(p.id)
            ? { ...p, price: newPriceLocal(p.price), variants: p.variants?.map((v) => ({ ...v, price: newPriceLocal(v.price) })) }
            : p
        ));
        addToast(`✅ ${selectedProducts.length} prix mis à jour localement (boutique non connectée)`, "success");
      }
      setSelectedProducts([]); setBulkPrice(""); setActiveAction(null);
    } catch {
      addToast("Erreur lors de la mise à jour — réessayez", "error");
    }
    finally { setActionLoading(null); }
  };

  const handleBulkFieldApply = async (field: string, value: string, mode: "replace" | "append" = "replace") => {
    if (!value) return;
    setActionLoading(field);
    try {
      if (mode === "append" && field === "body_html") {
        await Promise.all(
          selectedProducts.map(async (id) => {
            const p = products.find((x) => x.id === id);
            const current = p?.body_html || "";
            const newVal = current + "\n" + value;
            await fetch("/api/shopify/bulk-edit", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productIds: [id], field, value: newVal }),
            });
          })
        );
      } else {
        const res = await fetch("/api/shopify/bulk-edit", {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: selectedProducts, field, value }),
        });
        if (!res.ok) throw new Error();
      }
      addToast(`${selectedProducts.length} produit${selectedProducts.length > 1 ? "s" : ""} mis à jour`, "success");
      const updatedIds = [...selectedProducts];
      setSelectedProducts([]); setActiveAction(null);
      setBulkTitle(""); setBulkDescription(""); setBulkTags("");
      setBulkMetaTitle(""); setBulkMetaDescription("");
      setRecentlyUpdated(updatedIds);
      setTimeout(() => setRecentlyUpdated([]), 2000);
      fetchProducts(true);
    } catch { addToast("Erreur lors de la mise à jour — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const handleBulkTitlePrefixSuffix = async () => {
    if (!titlePrefix && !titleSuffix) return;
    setActionLoading("title");
    try {
      await Promise.all(
        selectedProducts.map(async (id) => {
          const p = products.find((x) => x.id === id);
          if (!p) return;
          const newTitle = `${titlePrefix}${p.title}${titleSuffix}`.trim();
          await fetch("/api/shopify/bulk-edit", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [id], field: "title", value: newTitle }),
          });
        })
      );
      setProducts((prev) => prev.map((p) =>
        selectedProducts.includes(p.id) ? { ...p, title: `${titlePrefix}${p.title}${titleSuffix}`.trim() } : p
      ));
      addToast(`✅ ${selectedProducts.length} titre${selectedProducts.length > 1 ? "s" : ""} mis à jour`, "success");
      setRecentlyUpdated([...selectedProducts]);
      setTimeout(() => setRecentlyUpdated([]), 2000);
      setTitlePrefix(""); setTitleSuffix(""); setActiveAction(null); setSelectedProducts([]);
    } catch { addToast("Erreur — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const handleBulkDescCommonText = async () => {
    if (!descCommonText) return;
    setActionLoading("description");
    try {
      await Promise.all(
        selectedProducts.map(async (id) => {
          const p = products.find((x) => x.id === id);
          if (!p) return;
          let newDesc = p.body_html || "";
          if (descCommonMode === "prepend") newDesc = `<p>${descCommonText}</p>\n${newDesc}`;
          else if (descCommonMode === "append") newDesc = `${newDesc}\n<p>${descCommonText}</p>`;
          else if (descCommonMode === "remove") newDesc = newDesc.split(descCommonText).join("");
          await fetch("/api/shopify/bulk-edit", {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: [id], field: "body_html", value: newDesc }),
          });
        })
      );
      addToast(`✅ ${selectedProducts.length} description${selectedProducts.length > 1 ? "s" : ""} mise${selectedProducts.length > 1 ? "s" : ""} à jour`, "success");
      setRecentlyUpdated([...selectedProducts]);
      setTimeout(() => setRecentlyUpdated([]), 2000);
      setDescCommonText(""); setActiveAction(null); setSelectedProducts([]);
      fetchProducts(true);
    } catch { addToast("Erreur — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const handleBulkStatus = async (status: string) => {
    setActionLoading(status);
    try {
      const res = await fetch("/api/shopify/bulk-edit", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProducts, field: "status", value: status }),
      });
      if (!res.ok) throw new Error();
      addToast(`${selectedProducts.length} produit${selectedProducts.length > 1 ? "s" : ""} ${status === "archived" ? "archivé" : status === "draft" ? "mis en brouillon" : "activé"}${selectedProducts.length > 1 ? "s" : ""}`, "success");
      // Optimistic local update so counters refresh immediately
      setProducts((prev) => prev.map((p) => selectedProducts.includes(p.id) ? { ...p, status } : p));
      setSelectedProducts([]); setActiveAction(null);
      fetchProducts(true);
    } catch { addToast("Erreur — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  /* ──────── Inline meta field update ──────── */
  const updateProductField = (productId: string, field: keyof Product, value: string) => {
    setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, [field]: value } : p));
  };

  const saveMetaField = async (product: Product) => {
    const updates: Record<string, string> = {};
    if (product.metaTitle !== undefined) updates.metaTitle = product.metaTitle;
    if (product.metaDescription !== undefined) updates.metaDescription = product.metaDescription;
    if (!Object.keys(updates).length) return;
    try {
      await fetch("/api/shopify/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: [product.id], updates }),
      });
      addToast("Champs SEO sauvegardés sur Shopify", "success");
    } catch {
      addToast("Erreur lors de la sauvegarde SEO", "error");
    }
  };

  /* ──────── AI meta batch generation ──────── */
  const aiBatchMetaTitles = async () => {
    if (selectedProducts.length === 0) return;
    setAiBatchLoading(true);
    try {
      const prods = selectedProducts
        .map((id) => products.find((x) => x.id === id))
        .filter(Boolean)
        .map((p) => ({ id: p!.id, title: p!.title, description: p!.body_html }));
      const res = await fetch("/api/ai/generate-meta-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: prods }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.metaTitles) {
        setProducts((prev) => prev.map((p) => {
          const found = data.metaTitles.find((m: { id: string; metaTitle: string }) => m.id === p.id);
          return found ? { ...p, metaTitle: found.metaTitle } : p;
        }));
        addToast(
          data.demo
            ? `[DEMO] ${data.metaTitles.length} meta titres simulés`
            : `${data.metaTitles.length} meta titres générés — sauvegardez sur Shopify avec le bouton "SEO"`,
          "success"
        );
      }
    } catch {
      addToast("Erreur IA meta titres", "error");
    } finally {
      setAiBatchLoading(false);
    }
  };

  const aiBatchMetaDescriptions = async () => {
    if (selectedProducts.length === 0) return;
    setAiBatchLoading(true);
    try {
      const prods = selectedProducts
        .map((id) => products.find((x) => x.id === id))
        .filter(Boolean)
        .map((p) => ({ id: p!.id, title: p!.title, description: p!.body_html }));
      const res = await fetch("/api/ai/generate-meta-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: prods }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.metaDescriptions) {
        setProducts((prev) => prev.map((p) => {
          const found = data.metaDescriptions.find((m: { id: string; metaDescription: string }) => m.id === p.id);
          return found ? { ...p, metaDescription: found.metaDescription } : p;
        }));
        addToast(
          data.demo
            ? `[DEMO] ${data.metaDescriptions.length} meta descriptions simulées`
            : `${data.metaDescriptions.length} meta descriptions générées`,
          "success"
        );
      }
    } catch {
      addToast("Erreur IA meta descriptions", "error");
    } finally {
      setAiBatchLoading(false);
    }
  };

  /* ──────── Bulk price tools ──────── */
  const applyPriceChange = () => {
    if (selectedProducts.length === 0) {
      addToast('Sélectionnez au moins un produit', 'error');
      return;
    }
    if (priceValue <= 0) {
      addToast('Saisissez une valeur supérieure à 0', 'error');
      return;
    }
    const updated = products.map((product) => {
      if (!selectedProducts.includes(product.id)) return product;
      const currentPrice = parseFloat(product.price) || 0;
      let newPrice: number;
      if (priceUnit === '%') {
        newPrice = priceOp === 'increase'
          ? currentPrice * (1 + priceValue / 100)
          : currentPrice * (1 - priceValue / 100);
      } else {
        newPrice = priceOp === 'increase' ? currentPrice + priceValue : currentPrice - priceValue;
      }
      newPrice = Math.max(0.01, newPrice);
      if (priceRounding === '99') newPrice = Math.floor(newPrice) + 0.99;
      else if (priceRounding === '95') newPrice = Math.floor(newPrice) + 0.95;
      else if (priceRounding === 'round') newPrice = Math.round(newPrice);
      else newPrice = Math.round(newPrice * 100) / 100;
      return { ...product, price: newPrice.toFixed(2) };
    });
    setProducts(updated);
    addToast(
      `Prix calculés pour ${selectedProducts.length} produit(s) — cliquez "Sauvegarder" dans la barre pour appliquer sur Shopify`,
      'success'
    );
  };

  const handleDuplicate = async (productId: string) => {    setActionLoading(`dup-${productId}`);
    try {
      const res = await fetch("/api/shopify/duplicate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }) });
      if (!res.ok) throw new Error();
      addToast("Produit dupliqué avec succès", "success");
      fetchProducts(true);
    } catch { addToast("Erreur lors de la duplication", "error"); }
    finally { setActionLoading(null); }
  };

  const handleAiTitle = async (product: Product) => {
    setActionLoading(`ai-${product.id}`);
    try {
      const res = await fetch("/api/ai/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: { title: product.title, description: product.body_html }, mode: "title" }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiSuggestions((prev) => ({ ...prev, [product.id]: { productId: product.id, title: data.title } }));
      addToast("Suggestion IA générée", "success");
    } catch { addToast("Erreur IA — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  /* ──────── Export CSV ──────── */
  const exportCSV = () => {
    const headers = ["Titre", "Prix", "Statut", "Tags", "Score SEO", "Image URL"];
    const rows = filteredProducts.map((p) => [p.title, p.price, p.status, p.tags || "", seoScore(p).toString(), p.images?.[0]?.src || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `produits-ecompilot-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    addToast(`${filteredProducts.length} produit${filteredProducts.length > 1 ? "s" : ""} exporté${filteredProducts.length > 1 ? "s" : ""}`, "success");
  };

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: products.length };
    products.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [products]);

  const lowStockCount = useMemo(() => products.filter((p) => p.variants?.some((v) => (v.inventory_quantity ?? 999) < 5)).length, [products]);

  const avgSeo = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.round(products.reduce((acc, p) => acc + seoScore(p), 0) / products.length);
  }, [products]);

  return (
    <QuotaGate plan={plan} tasksUsed={tasksUsed}>
    <div className="max-w-7xl mx-auto">
      {showAIPreviewModal && (
        <AIPreviewModal
          items={aiPreviewItems}
          onApply={handleAIPreviewApply}
          onClose={() => setShowAIPreviewModal(false)}
          loading={aiBatchLoading}
        />
      )}
      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} variant="danger"
        onConfirm={() => { confirmModal.action(); setConfirmModal({ ...confirmModal, open: false }); }}
        onCancel={() => setConfirmModal({ ...confirmModal, open: false })} />

      {/* ── Preview Modal ── */}
      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPreviewProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: "#0f172a" }}>Aperçu produit</h3>
                {aiSuggestions[previewProduct.id] && <p className="text-xs mt-0.5" style={{ color: "#8b5cf6" }}>Suggestions IA disponibles — comparaison Avant / Après</p>}
              </div>
              <button onClick={() => setPreviewProduct(null)}><X className="w-5 h-5" style={{ color: "#94a3b8" }} /></button>
            </div>
            {aiSuggestions[previewProduct.id] ? (
              /* Before/After columns when AI suggestion exists */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-red-50/50 rounded-xl border border-red-100">
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#dc2626" }}>Avant</p>
                  <div className="space-y-3">
                    {previewProduct.images?.[0]?.src && <img src={previewProduct.images[0].src} alt="" className="w-full h-32 object-cover rounded-lg" />}
                    <div><p className="text-[11px] font-medium mb-1" style={{ color: "#64748b" }}>Titre</p><p className="text-sm" style={{ color: "#0f172a" }}>{previewProduct.title}</p></div>
                    {previewProduct.body_html && <div><p className="text-[11px] font-medium mb-1" style={{ color: "#64748b" }}>Description</p>
                      <div className="text-xs prose prose-sm max-w-none max-h-24 overflow-hidden" style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: previewProduct.body_html }} /></div>}
                    {previewProduct.tags && <div><p className="text-[11px] font-medium mb-1" style={{ color: "#64748b" }}>Tags</p><p className="text-xs" style={{ color: "#374151" }}>{previewProduct.tags}</p></div>}
                    <ScoreBadge score={seoScore(previewProduct)} />
                  </div>
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#059669" }}>Après (IA)</p>
                  <div className="space-y-3">
                    {previewProduct.images?.[0]?.src && <img src={previewProduct.images[0].src} alt="" className="w-full h-32 object-cover rounded-lg" />}
                    {aiSuggestions[previewProduct.id].title && <div>
                      <p className="text-[11px] font-medium mb-1" style={{ color: "#64748b" }}>Titre suggéré</p>
                      <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{aiSuggestions[previewProduct.id].title}</p>
                      <button onClick={() => applyAISuggestion(previewProduct.id, "title")} disabled={!!actionLoading} className="mt-1 text-[11px] px-2 py-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-medium" style={{ color: "#fff" }}>Appliquer</button>
                    </div>}
                    {aiSuggestions[previewProduct.id].description && <div>
                      <p className="text-[11px] font-medium mb-1" style={{ color: "#64748b" }}>Description IA</p>
                      <div className="text-xs prose prose-sm max-w-none max-h-40 overflow-y-auto border border-emerald-100 rounded-lg p-2 bg-white" style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: aiSuggestions[previewProduct.id].description! }} />
                      <button onClick={() => applyAISuggestion(previewProduct.id, "body_html")} disabled={!!actionLoading} className="mt-1 text-[11px] px-2 py-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-medium" style={{ color: "#fff" }}>Appliquer</button>
                    </div>}
                    {aiSuggestions[previewProduct.id].tags && <div>
                      <p className="text-[11px] font-medium mb-1" style={{ color: "#64748b" }}>Tags suggérés</p>
                      <p className="text-xs" style={{ color: "#374151" }}>{aiSuggestions[previewProduct.id].tags}</p>
                      <button onClick={() => applyAISuggestion(previewProduct.id, "tags")} disabled={!!actionLoading} className="mt-1 text-[11px] px-2 py-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg font-medium" style={{ color: "#fff" }}>Appliquer</button>
                    </div>}
                    {/* Score SEO projeté après IA */}
                    {(() => {
                      const sug = aiSuggestions[previewProduct.id];
                      const projected = { ...previewProduct, title: sug.title || previewProduct.title, body_html: sug.description || previewProduct.body_html, tags: sug.tags || previewProduct.tags };
                      const before = seoScore(previewProduct);
                      const after = seoScore(projected);
                      const delta = after - before;
                      return (
                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-emerald-100">
                          <ScoreBadge score={after} />
                          {delta > 0 && <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 rounded-full" style={{ color: "#059669" }}>+{delta} pts ↑</span>}
                        </div>
                      );
                    })()}
                    {/* Tout appliquer — bouton principal */}
                    <div className="pt-3 border-t border-emerald-200 mt-2">
                      <button
                        onClick={() => applyAllForProduct(previewProduct.id)}
                        disabled={!!actionLoading}
                        className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                        {actionLoading === `ai-apply-all-${previewProduct.id}` ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <CheckCircle2 className="w-4 h-4" style={{ color: "#fff" }} />}
                        <span style={{ color: "#fff" }}>Tout appliquer (titre + description + tags)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Simple product info when no AI suggestion */
              <div>
                {previewProduct.images?.[0]?.src && <img src={previewProduct.images[0].src} alt="" className="w-full h-48 object-cover rounded-xl mb-4" />}
                <p className="font-semibold text-base mb-1" style={{ color: "#0f172a" }}>{previewProduct.title}</p>
                <p className="text-sm font-bold mb-2" style={{ color: "#059669" }}>{parseFloat(previewProduct.price).toFixed(2)} €</p>
                <div className="flex items-center gap-2 mb-3">
                  {getStatusBadge(previewProduct.status)}
                  <ScoreBadge score={seoScore(previewProduct)} />
                </div>
                {previewProduct.tags && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {previewProduct.tags.split(",").map((t, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 bg-blue-50 rounded-full" style={{ color: "#2563eb" }}>{t.trim()}</span>
                    ))}
                  </div>
                )}
                {previewProduct.body_html && (
                  <div className="text-sm prose prose-sm max-w-none mt-2" style={{ color: "#374151" }} dangerouslySetInnerHTML={{ __html: previewProduct.body_html }} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: "#0f172a" }}>Catalogue produits</h1>
          <p className="text-sm mt-1 flex flex-wrap items-center gap-2" style={{ color: "#64748b" }}>
            {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
            {lowStockCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-red-50 rounded-full" style={{ color: "#dc2626" }}>
                <AlertTriangle className="w-3 h-3" /> {lowStockCount} stock bas
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: avgSeo >= 70 ? "#ecfdf5" : avgSeo >= 40 ? "#fffbeb" : "#fef2f2", color: avgSeo >= 70 ? "#059669" : avgSeo >= 40 ? "#d97706" : "#dc2626" }}>
              <BarChart3 className="w-3 h-3" /> SEO moyen {avgSeo}%
            </span>
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <button onClick={() => fetchProducts(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm disabled:opacity-50"
            style={{ color: "#374151" }}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} style={{ color: "#374151" }} /> <span className="hidden sm:inline">Synchroniser</span>
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm"
            style={{ color: "#374151" }}>
            <Download className="w-4 h-4" style={{ color: "#374151" }} /> CSV
          </button>
          <button
            onClick={() => { const next = !compactMode; setCompactMode(next); localStorage.setItem("catalog-compact", String(next)); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border shadow-sm transition-colors ${compactMode ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200 hover:bg-gray-50"}`}
            title="Mode compact"
            style={{ color: compactMode ? "#2563eb" : "#374151" }}>
            <LayoutList className="w-4 h-4" />
            <span className="hidden sm:inline">{compactMode ? "Compact ✓" : "Compact"}</span>
          </button>
          <Link href="/dashboard/import" className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm">
            <Upload className="w-4 h-4" style={{ color: "#fff" }} /><span style={{ color: "#fff" }}>Importer</span>
          </Link>
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="overflow-x-auto mb-4 -mx-1 px-1">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit min-w-full md:min-w-fit">
          {[{ key: "all", label: "Tous" }, { key: "active", label: "Actifs" }, { key: "draft", label: "Brouillons" }, { key: "archived", label: "Archivés" }].map((tab) => (
            <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
              className={`px-3 md:px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${statusFilter === tab.key ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
              style={{ color: statusFilter === tab.key ? "#0f172a" : "#64748b" }}>
              {tab.label} <span className="ml-1 text-xs" style={{ color: "#94a3b8" }}>({statusCounts[tab.key] || 0})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + price filter ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
          <input type="text" placeholder="Rechercher un produit..." value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            style={{ color: "#0f172a" }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4" style={{ color: "#94a3b8" }} /></button>}
        </div>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Min €" value={priceMin} onChange={(e) => { setPriceMin(e.target.value); setCurrentPage(1); }}
            className="w-24 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" style={{ color: "#0f172a" }} />
          <span style={{ color: "#94a3b8" }}>—</span>
          <input type="number" placeholder="Max €" value={priceMax} onChange={(e) => { setPriceMax(e.target.value); setCurrentPage(1); }}
            className="w-24 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" style={{ color: "#0f172a" }} />
        </div>
      </div>

      {/* ── Price Tools Bar ── */}
      <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" style={{ color: "#d97706" }} />
            <span className="text-sm font-semibold" style={{ color: "#92400e" }}>Outils Prix</span>
          </div>
          <div className="w-px h-6 bg-amber-200" />
          {/* Operation: increase / decrease */}
          <div className="flex items-center bg-white border border-amber-200 rounded-lg overflow-hidden">
            {(['increase', 'decrease'] as const).map((op) => (
              <button key={op} onClick={() => setPriceOp(op)}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${priceOp === op ? 'bg-amber-500 text-white' : 'hover:bg-amber-50'}`}
                style={{ color: priceOp === op ? '#fff' : '#92400e' }}>
                {op === 'increase' ? '▲ Augmenter' : '▼ Baisser'}
              </button>
            ))}
          </div>
          {/* Value */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              step={priceUnit === '%' ? 1 : 0.5}
              value={priceValue || ''}
              onChange={(e) => setPriceValue(parseFloat(e.target.value) || 0)}
              placeholder="Valeur"
              className="w-24 px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              style={{ color: '#0f172a' }}
            />
            {/* Unit: % / € */}
            <div className="flex items-center bg-white border border-amber-200 rounded-lg overflow-hidden">
              {(['%', '€'] as const).map((u) => (
                <button key={u} onClick={() => setPriceUnit(u)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all ${priceUnit === u ? 'bg-amber-500' : 'hover:bg-amber-50'}`}
                  style={{ color: priceUnit === u ? '#fff' : '#92400e' }}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-6 bg-amber-200" />
          {/* Rounding */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color: '#78350f' }}>Arrondi :</span>
            <div className="flex items-center bg-white border border-amber-200 rounded-lg overflow-hidden">
              {([
                { key: 'none', label: 'Aucun' },
                { key: '99', label: 'X,99' },
                { key: '95', label: 'X,95' },
                { key: 'round', label: '∞' },
              ] as { key: 'none' | '99' | '95' | 'round'; label: string }[]).map(({ key, label }) => (
                <button key={key} onClick={() => setPriceRounding(key)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-all ${priceRounding === key ? 'bg-amber-500' : 'hover:bg-amber-50'}`}
                  style={{ color: priceRounding === key ? '#fff' : '#92400e' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-6 bg-amber-200" />
          <button
            onClick={applyPriceChange}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 rounded-lg text-xs font-semibold transition-all shadow-sm"
            style={{ color: '#fff' }}>
            <TrendingUp className="w-3.5 h-3.5" />
            Appliquer aux sélectionnés
          </button>
          {selectedProducts.length > 0 && (
            <span className="text-xs" style={{ color: '#92400e' }}>({selectedProducts.length} sélectionné{selectedProducts.length > 1 ? 's' : ''})</span>
          )}
        </div>
      </div>

      {/* ── Bulk bar with integrated AI ── */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 px-5 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="text-sm font-semibold" style={{ color: "#1e40af" }}>{selectedProducts.length} sélectionné{selectedProducts.length > 1 ? "s" : ""}</p>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {/* Manual bulk actions */}
              {[{ key: "price", icon: DollarSign, label: "Prix" }, { key: "title", icon: Type, label: "Titre" },
                { key: "description", icon: FileText, label: "Description" }, { key: "tags", icon: Tag, label: "Tags" }].map((a) => (
                <button key={a.key} onClick={() => setActiveAction(activeAction === a.key ? null : a.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeAction === a.key ? "bg-blue-600" : "bg-white border border-blue-200 hover:bg-blue-100"}`}>
                  <a.icon className="w-3.5 h-3.5" style={{ color: activeAction === a.key ? "#fff" : "#3b82f6" }} />
                  <span style={{ color: activeAction === a.key ? "#fff" : "#1e40af" }}>{a.label}</span>
                </button>
              ))}
              {/* AI batch buttons */}
              <div className="w-px h-6 bg-blue-200 mx-1" />
              <button onClick={() => aiBatchGenerate("title")} disabled={aiBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 disabled:opacity-50">
                <Wand2 className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                <span style={{ color: "#6d28d9" }}>IA Titres</span>
              </button>
              <button onClick={() => aiBatchGenerate("tags")} disabled={aiBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 disabled:opacity-50">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                <span style={{ color: "#6d28d9" }}>IA Tags</span>
              </button>
              <button onClick={() => aiBatchDescriptions()} disabled={aiBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 disabled:opacity-50">
                <FileText className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                <span style={{ color: "#6d28d9" }}>IA Descriptions</span>
              </button>
              <button onClick={() => aiBatchGenerate("full")} disabled={aiBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-medium disabled:opacity-50">
                {aiBatchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#fff" }} /> : <TrendingUp className="w-3.5 h-3.5" style={{ color: "#fff" }} />}
                <span style={{ color: "#fff" }}>IA Complète</span>
              </button>
              <div className="w-px h-6 bg-blue-200 mx-1" />
              {[{ key: "meta_title", icon: FileText, label: "Meta Titre" }, { key: "meta_description", icon: FileText, label: "Meta Desc" }].map((a) => (
                <button key={a.key} onClick={() => setActiveAction(activeAction === a.key ? null : a.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeAction === a.key ? "bg-blue-600" : "bg-white border border-blue-200 hover:bg-blue-100"}`}>
                  <a.icon className="w-3.5 h-3.5" style={{ color: activeAction === a.key ? "#fff" : "#3b82f6" }} />
                  <span style={{ color: activeAction === a.key ? "#fff" : "#1e40af" }}>{a.label}</span>
                </button>
              ))}
              <button onClick={aiBatchMetaTitles} disabled={aiBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 disabled:opacity-50">
                <Wand2 className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                <span style={{ color: "#6d28d9" }}>IA Meta Titres</span>
              </button>
              <button onClick={aiBatchMetaDescriptions} disabled={aiBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-xs font-medium hover:bg-violet-100 disabled:opacity-50">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                <span style={{ color: "#6d28d9" }}>IA Meta Desc</span>
              </button>
              <div className="w-px h-6 bg-blue-200 mx-1" />
              <button onClick={() => setConfirmModal({ open: true, title: "Archiver", message: `Archiver ${selectedProducts.length} produit${selectedProducts.length > 1 ? "s" : ""} ?`, action: () => handleBulkStatus("archived") })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100"
                title="Archive les produits (retirés de la vitrine)">
                <Archive className="w-3.5 h-3.5" style={{ color: "#d97706" }} /><span style={{ color: "#92400e" }}>Archiver</span>
              </button>
              <button onClick={() => setConfirmModal({ open: true, title: "Brouillon", message: `Passer ${selectedProducts.length} produit${selectedProducts.length > 1 ? "s" : ""} en brouillon ?`, action: () => handleBulkStatus("draft") })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100"
                title="Met les produits en brouillon (non publiés)">
                <FileText className="w-3.5 h-3.5" style={{ color: "#6366f1" }} /><span style={{ color: "#3730a3" }}>Brouillon</span>
              </button>
              <button onClick={() => handleBulkStatus("active")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100"
                title="Publie à nouveau les produits archivés ou en brouillon">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#059669" }} /><span style={{ color: "#065f46" }}>Restaurer Actif</span>
              </button>
              <button onClick={() => { setSelectedProducts([]); setActiveAction(null); }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50" style={{ color: "#374151" }}>Annuler</button>
            </div>
          </div>

          {/* AI suggestions banner */}
          {Object.keys(aiSuggestions).length > 0 && (
            <div className="flex items-center gap-3 p-3 mb-3 bg-violet-50 rounded-lg border border-violet-200">
              <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: "#8b5cf6" }} />
              <p className="text-xs font-medium flex-1" style={{ color: "#6d28d9" }}>
                {Object.keys(aiSuggestions).length} suggestion{Object.keys(aiSuggestions).length > 1 ? "s" : ""} IA prête{Object.keys(aiSuggestions).length > 1 ? "s" : ""} — vérifiez dans le tableau puis appliquez
              </p>
              <button onClick={applyAllAISuggestions} disabled={aiBatchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-xs font-medium disabled:opacity-50">
                {aiBatchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#fff" }} /> : <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#fff" }} />}
                <span style={{ color: "#fff" }}>Tout appliquer</span>
              </button>
              <button onClick={() => setAiSuggestions({})} className="text-xs font-medium px-2 py-1 rounded hover:bg-violet-100" style={{ color: "#8b5cf6" }}>Ignorer</button>
            </div>
          )}

          {activeAction === "price" && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
              <select value={bulkPriceMode} onChange={(e) => setBulkPriceMode(e.target.value as typeof bulkPriceMode)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white" style={{ color: "#0f172a" }}>
                <option value="fixed">Prix fixe (€)</option>
                <option value="percent_up">Augmenter (%)</option>
                <option value="percent_down">Réduire (%)</option>
                <option value="multiply">Multiplier (×)</option>
              </select>
              <input type="number" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)}
                placeholder={bulkPriceMode === "fixed" ? "29.99" : bulkPriceMode === "multiply" ? "2.5" : "10"}
                className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
              <button onClick={handleBulkPriceApply} disabled={!bulkPrice || actionLoading === "price"}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                <span style={{ color: "#fff" }}>{actionLoading === "price" ? "..." : "Appliquer"}</span>
              </button>
            </div>
          )}
          {activeAction === "title" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-blue-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#64748b" }}>Préfixe / Suffixe commun</p>
                <p className="text-[11px] mb-3" style={{ color: "#94a3b8" }}>Chaque produit garde son titre unique — ajoutez seulement un élément commun avant ou après</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "#374151" }}>Préfixe (avant le titre)</label>
                    <input type="text" value={titlePrefix} onChange={(e) => setTitlePrefix(e.target.value)} placeholder='Ex: 🌟 — '
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1" style={{ color: "#374151" }}>Suffixe (après le titre)</label>
                    <input type="text" value={titleSuffix} onChange={(e) => setTitleSuffix(e.target.value)} placeholder='Ex:  | Livraison offerte'
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
                  </div>
                  {(titlePrefix || titleSuffix) && (
                    <p className="text-[11px] bg-blue-50 p-2 rounded-lg" style={{ color: "#2563eb" }}>
                      Aperçu : <em>{titlePrefix}Titre du produit{titleSuffix}</em>
                    </p>
                  )}
                </div>
                <button onClick={handleBulkTitlePrefixSuffix} disabled={(!titlePrefix && !titleSuffix) || actionLoading === "title"}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                  <span style={{ color: "#fff" }}>{actionLoading === "title" ? "..." : `Appliquer aux ${selectedProducts.length} titre${selectedProducts.length > 1 ? "s" : ""}`}</span>
                </button>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8b5cf6" }}>Génération IA</p>
                <p className="text-[11px] mb-3" style={{ color: "#94a3b8" }}>Titre SEO unique pour chaque produit, généré par IA — aperçu avant application</p>
                <button onClick={() => aiBatchGenerate("title")} disabled={aiBatchLoading}
                  className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {aiBatchLoading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Wand2 className="w-4 h-4" style={{ color: "#fff" }} />}
                  <span style={{ color: "#fff" }}>Générer {selectedProducts.length} titre{selectedProducts.length > 1 ? "s" : ""} IA</span>
                </button>
                <p className="text-[11px] mt-2" style={{ color: "#8b5cf6" }}>Score SEO visiblement amélioré — titres 50-70 caractères optimisés</p>
              </div>
            </div>
          )}
          {activeAction === "description" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-blue-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#64748b" }}>Texte commun à ajouter / retirer</p>
                <p className="text-[11px] mb-3" style={{ color: "#94a3b8" }}>Chaque produit garde sa description unique — ajoutez ou retirez seulement un fragment commun</p>
                <textarea value={descCommonText} onChange={(e) => setDescCommonText(e.target.value)}
                  placeholder="Ex: Livraison gratuite en 48h. Satisfait ou remboursé 30 jours." rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" style={{ color: "#0f172a" }} />
                <div className="flex items-center gap-3 mt-2">
                  {([{ val: "append", label: "Ajouter après" }, { val: "prepend", label: "Ajouter avant" }, { val: "remove", label: "Retirer" }] as const).map((opt) => (
                    <label key={opt.val} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="radio" name="descCommonMode" value={opt.val} checked={descCommonMode === opt.val} onChange={() => setDescCommonMode(opt.val)} className="accent-blue-600" />
                      <span style={{ color: "#374151" }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <button onClick={handleBulkDescCommonText} disabled={!descCommonText || !!actionLoading}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                  <span style={{ color: "#fff" }}>{actionLoading === "description" ? "..." : "Appliquer"}</span>
                </button>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8b5cf6" }}>Génération IA</p>
                <p className="text-[11px] mb-3" style={{ color: "#94a3b8" }}>Description SEO unique (200+ mots) pour chaque produit — score SEO fortement amélioré</p>
                <button onClick={() => aiBatchDescriptions()} disabled={aiBatchLoading}
                  className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {aiBatchLoading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Sparkles className="w-4 h-4" style={{ color: "#fff" }} />}
                  <span style={{ color: "#fff" }}>Générer {selectedProducts.length} description{selectedProducts.length > 1 ? "s" : ""} IA</span>
                </button>
                {Object.values(aiSuggestions).filter((s) => s.description).length > 0 && (
                  <div className="mt-3 p-2 bg-violet-50 rounded-lg border border-violet-200">
                    <p className="text-[11px] font-semibold" style={{ color: "#6d28d9" }}>
                      ✅ {Object.values(aiSuggestions).filter((s) => s.description).length} description{Object.values(aiSuggestions).filter((s) => s.description).length > 1 ? "s" : ""} prête{Object.values(aiSuggestions).filter((s) => s.description).length > 1 ? "s" : ""} — vérifiez dans le tableau
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeAction === "tags" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-blue-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>Modification manuelle</p>
                <input type="text" value={bulkTags} onChange={(e) => setBulkTags(e.target.value)} placeholder="tag1, tag2, tag3"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
                <button onClick={() => handleBulkFieldApply("tags", bulkTags)} disabled={!bulkTags || !!actionLoading}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                  <span style={{ color: "#fff" }}>{actionLoading ? "..." : "Appliquer"}</span>
                </button>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#8b5cf6" }}>Génération IA</p>
                <button onClick={() => aiBatchGenerate("tags")} disabled={aiBatchLoading}
                  className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {aiBatchLoading ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#fff" }} /> : <Sparkles className="w-4 h-4" style={{ color: "#fff" }} />}
                  <span style={{ color: "#fff" }}>Générer {selectedProducts.length} lot{selectedProducts.length > 1 ? "s" : ""} de tags IA</span>
                </button>
                <p className="text-[11px] mt-2" style={{ color: "#8b5cf6" }}>10 tags SEO pertinents par produit — vérifiez puis appliquez</p>
              </div>
            </div>
          )}
          {activeAction === "meta_title" && (
            <div className="p-4 bg-white rounded-lg border border-blue-100">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>Meta Titre (55-60 caractères idéal)</p>
              <input type="text" value={bulkMetaTitle} onChange={(e) => setBulkMetaTitle(e.target.value)}
                placeholder="Meta titre pour les moteurs de recherche..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px]" style={{ color: bulkMetaTitle.length > 60 ? "#dc2626" : "#94a3b8" }}>{bulkMetaTitle.length}/60 caractères</p>
              </div>
              <button onClick={() => handleBulkFieldApply("metafields_global_title_tag", bulkMetaTitle)} disabled={!bulkMetaTitle || !!actionLoading}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                <span style={{ color: "#fff" }}>{actionLoading ? "..." : "Appliquer"}</span>
              </button>
            </div>
          )}
          {activeAction === "meta_description" && (
            <div className="p-4 bg-white rounded-lg border border-blue-100">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>Meta Description (150-160 caractères idéal)</p>
              <textarea value={bulkMetaDescription} onChange={(e) => setBulkMetaDescription(e.target.value)}
                placeholder="Meta description pour les moteurs de recherche..." rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" style={{ color: "#0f172a" }} />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px]" style={{ color: bulkMetaDescription.length > 160 ? "#dc2626" : "#94a3b8" }}>{bulkMetaDescription.length}/160 caractères</p>
              </div>
              <button onClick={() => handleBulkFieldApply("metafields_global_description_tag", bulkMetaDescription)} disabled={!bulkMetaDescription || !!actionLoading}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                <span style={{ color: "#fff" }}>{actionLoading ? "..." : "Appliquer"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center">
          <RefreshCw className="w-8 h-8 animate-spin mb-3" style={{ color: "#3b82f6" }} />
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>Chargement des produits...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 flex flex-col items-center">
          <p className="text-sm font-medium" style={{ color: "#dc2626" }}>{error}</p>
          <button onClick={() => fetchProducts()} className="mt-3 px-4 py-2 bg-red-50 rounded-lg text-sm font-medium" style={{ color: "#dc2626" }}>Réessayer</button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center text-center">
          <Package className="w-12 h-12 mb-4" style={{ color: "#cbd5e1" }} />
          <h3 className="text-lg font-semibold mb-2" style={{ color: "#0f172a" }}>Aucun produit trouvé</h3>
          <p className="text-sm mb-4" style={{ color: "#64748b" }}>Importez vos premiers produits pour commencer</p>
          <Link href="/dashboard/import" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
            <span style={{ color: "#fff" }}>Importer mes premiers produits</span>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 md:px-4 py-3 text-left w-10">
                    <button onClick={selectAll} title="Tout sélectionner (Ctrl+A)">
                      {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0
                        ? <CheckSquare className="w-4 h-4" style={{ color: "#3b82f6" }} />
                        : <Square className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                    </button>
                  </th>
                  <th className={`px-3 md:px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${compactMode ? "hidden" : "hidden sm:table-cell"}`} style={{ color: "#64748b" }}>Image</th>
                  <th className="px-3 md:px-4 py-3 text-left"><button onClick={() => handleSort("title")} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Titre <ArrowUpDown className="w-3 h-3" style={{ color: "#94a3b8" }} /></button></th>
                  <th className="px-3 md:px-4 py-3 text-left"><button onClick={() => handleSort("price")} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Prix <ArrowUpDown className="w-3 h-3" style={{ color: "#94a3b8" }} /></button></th>
                  <th className="px-3 md:px-4 py-3 text-left hidden sm:table-cell"><button onClick={() => handleSort("status")} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Statut <ArrowUpDown className="w-3 h-3" style={{ color: "#94a3b8" }} /></button></th>
                  <th className="px-3 md:px-4 py-3 text-left hidden md:table-cell"><button onClick={() => handleSort("seo")} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>SEO <ArrowUpDown className="w-3 h-3" style={{ color: "#94a3b8" }} /></button></th>
                  <th className="px-3 md:px-4 py-3 text-left hidden lg:table-cell text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>IA</th>
                  <th className="px-3 md:px-4 py-3 text-left hidden xl:table-cell text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Meta Titre <span className="normal-case font-normal text-gray-400">(60)</span></th>
                  <th className="px-3 md:px-4 py-3 text-left hidden xl:table-cell text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Meta Desc <span className="normal-case font-normal text-gray-400">(160)</span></th>
                  <th className="px-3 md:px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.map((product) => {
                  const isSelected = selectedProducts.includes(product.id);
                  const imageUrl = product.images?.[0]?.src;
                  const score = seoScore(product);
                  const hasLowStock = product.variants?.some((v) => (v.inventory_quantity ?? 999) < 5);
                  const suggestion = aiSuggestions[product.id];
                  const justUpdated = recentlyUpdated.includes(product.id);
                  return (
                    <tr key={product.id} className={`hover:bg-blue-50/30 transition-colors ${isSelected ? "bg-blue-50/50" : ""} ${justUpdated ? "bg-emerald-50/60" : ""}`}>
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-3"}`}><button onClick={() => toggleSelectProduct(product.id)}>{isSelected ? <CheckSquare className="w-4 h-4" style={{ color: "#3b82f6" }} /> : <Square className="w-4 h-4" style={{ color: "#d1d5db" }} />}</button></td>
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-3"} ${compactMode ? "hidden" : "hidden sm:table-cell"}`}>
                        {imageUrl ? <img src={imageUrl} alt={product.title} className="w-11 h-11 rounded-lg object-cover border border-gray-100" />
                          : <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200"><ImageOff className="w-4 h-4" style={{ color: "#cbd5e1" }} /></div>}
                      </td>
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-3"} cursor-pointer`} onClick={() => setPreviewProduct(product)}>
                        <p className="text-sm font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-none hover:text-blue-600 transition-colors" style={{ color: "#0f172a" }}>{product.title}</p>
                        {product.vendor && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{product.vendor}</p>}
                        {hasLowStock && <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 rounded mt-1" style={{ color: "#dc2626" }}><AlertTriangle className="w-2.5 h-2.5" /> Stock bas</span>}
                        {suggestion?.title && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-50 rounded" style={{ color: "#8b5cf6" }}>IA: {suggestion.title.slice(0, 40)}...</span>
                          </div>
                        )}
                        {suggestion?.description && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 bg-violet-50 rounded" style={{ color: "#8b5cf6" }}>📝 Description IA prête</span>
                          </div>
                        )}
                      </td>
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-3"}`}><p className="text-sm font-bold" style={{ color: "#059669" }}>{parseFloat(product.price).toFixed(2)} €</p></td>
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-3"} hidden sm:table-cell`}>{getStatusBadge(product.status)}</td>
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-3"} hidden md:table-cell`}><ScoreBadge score={score} /></td>
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-3"} hidden lg:table-cell`}>
                        {suggestion ? (
                          <div className="flex items-center gap-1">
                            {suggestion.title && (
                              <button onClick={() => applyAISuggestion(product.id, "title")} disabled={actionLoading === `ai-apply-${product.id}`} className="p-1 hover:bg-violet-50 rounded" title="Appliquer titre IA">
                                <Type className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                              </button>
                            )}
                            {suggestion.description && (
                              <button onClick={() => applyAISuggestion(product.id, "body_html")} disabled={actionLoading === `ai-apply-${product.id}`} className="p-1 hover:bg-violet-50 rounded" title="Appliquer description IA">
                                <FileText className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                              </button>
                            )}
                            {suggestion.tags && (
                              <button onClick={() => applyAISuggestion(product.id, "tags")} disabled={actionLoading === `ai-apply-${product.id}`} className="p-1 hover:bg-violet-50 rounded" title="Appliquer tags IA">
                                <Tag className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                              </button>
                            )}
                            <button onClick={() => applyAISuggestion(product.id, "title")} disabled={!suggestion.title || actionLoading === `ai-apply-${product.id}`} className="p-1 hover:bg-violet-50 rounded" title="Tout appliquer">
                              <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                            </button>
                            <button onClick={() => { setAiSuggestions((prev) => { const n = { ...prev }; delete n[product.id]; return n; }); }} className="p-1 hover:bg-red-50 rounded" title="Ignorer">
                              <X className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px]" style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                      {/* Meta title inline cell */}
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-2"} hidden xl:table-cell`}>
                        <div className="relative">
                          <input
                            value={product.metaTitle || ""}
                            onChange={(e) => updateProductField(product.id, "metaTitle", e.target.value)}
                            onBlur={() => product.metaTitle !== undefined && saveMetaField(product)}
                            maxLength={70}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                            placeholder="Meta titre SEO…"
                            style={{ color: "#0f172a", paddingBottom: "16px", minWidth: "160px" }}
                          />
                          <span className={`absolute right-1.5 bottom-1 text-[10px] tabular-nums ${
                            (product.metaTitle?.length || 0) > 60 ? "text-red-500" :
                            (product.metaTitle?.length || 0) > 50 ? "text-orange-500" : "text-gray-400"
                          }`}>
                            {product.metaTitle?.length || 0}/60
                          </span>
                        </div>
                      </td>
                      {/* Meta description inline cell */}
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-2"} hidden xl:table-cell`}>
                        <div className="relative">
                          <textarea
                            value={product.metaDescription || ""}
                            onChange={(e) => updateProductField(product.id, "metaDescription", e.target.value)}
                            onBlur={() => product.metaDescription !== undefined && saveMetaField(product)}
                            maxLength={170}
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                            placeholder="Meta description SEO…"
                            style={{ color: "#0f172a", paddingBottom: "16px", minWidth: "200px" }}
                          />
                          <span className={`absolute right-1.5 bottom-1 text-[10px] tabular-nums ${
                            (product.metaDescription?.length || 0) > 160 ? "text-red-500" :
                            (product.metaDescription?.length || 0) > 140 ? "text-orange-500" : "text-gray-400"
                          }`}>
                            {product.metaDescription?.length || 0}/160
                          </span>
                        </div>
                      </td>
                      <td className={`px-3 md:px-4 ${compactMode ? "py-1" : "py-3"}`}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setPreviewProduct(product)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Aperçu">
                            <Eye className="w-4 h-4" style={{ color: "#64748b" }} />
                          </button>
                          <button onClick={() => handleAiTitle(product)} disabled={actionLoading === `ai-${product.id}`}
                            className="p-1.5 hover:bg-violet-50 rounded-lg" title="Générer titre IA">
                            {actionLoading === `ai-${product.id}` ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#8b5cf6" }} /> : <Sparkles className="w-4 h-4" style={{ color: "#8b5cf6" }} />}
                          </button>
                          <button onClick={() => handleDuplicate(product.id)} disabled={actionLoading === `dup-${product.id}`}
                            className="p-1.5 hover:bg-blue-50 rounded-lg" title="Dupliquer">
                            {actionLoading === `dup-${product.id}` ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#3b82f6" }} /> : <Copy className="w-4 h-4" style={{ color: "#3b82f6" }} />}
                          </button>
                          <button onClick={() => saveMetaField(product)} className="p-1.5 hover:bg-emerald-50 rounded-lg" title="Sauvegarder les champs SEO sur Shopify">
                            <Save className="w-4 h-4" style={{ color: "#059669" }} />
                          </button>
                          <button onClick={() => setConfirmModal({ open: true, title: "Archiver", message: `Archiver "${product.title}" ?`, action: () => handleBulkStatus("archived") })}
                            className="p-1.5 hover:bg-red-50 rounded-lg" title="Archiver">
                            <Archive className="w-4 h-4" style={{ color: "#ef4444" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm" style={{ color: "#64748b" }}>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredProducts.length)} sur {filteredProducts.length}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                className="p-2 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" style={{ color: "#374151" }} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === page ? "bg-blue-600" : "hover:bg-white border border-gray-200"}`}
                  style={{ color: currentPage === page ? "#fff" : "#374151" }}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                className="p-2 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" style={{ color: "#374151" }} />
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs mt-3 text-center" style={{ color: "#94a3b8" }}>Ctrl+A : tout sélectionner · Échap : désélectionner · ← → : naviguer</p>
    </div>
    </QuotaGate>
  );
}
