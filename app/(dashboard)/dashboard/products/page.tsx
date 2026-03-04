"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, RefreshCw, Download, Upload, ChevronLeft, ChevronRight, Package,
  CheckSquare, Square, ImageOff, ArrowUpDown, DollarSign,
  X, Copy, Archive, CheckCircle2, Tag, Type, FileText, Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import { ConfirmModal } from "@/lib/confirm-modal";

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
}

type SortKey = "title" | "price" | "status";
type SortDir = "asc" | "desc";

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
  const [bulkPriceMode, setBulkPriceMode] = useState<"fixed" | "percent_up" | "percent_down" | "multiply">("fixed");
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkDescription, setBulkDescription] = useState("");
  const [bulkTags, setBulkTags] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; action: () => void }>({
    open: false, title: "", message: "", action: () => {}
  });
  const itemsPerPage = 50;

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
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [products, searchQuery, statusFilter, priceMin, priceMax, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); selectAll(); }
      if (e.key === "Escape") { setSelectedProducts([]); setActiveAction(null); }
      if (e.key === "ArrowLeft" && currentPage > 1) setCurrentPage((p) => p - 1);
      if (e.key === "ArrowRight" && currentPage < totalPages) setCurrentPage((p) => p + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

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
      active: { label: "Actif", cls: "badge-active" },
      archived: { label: "Archivé", cls: "badge-archived" },
      draft: { label: "Brouillon", cls: "badge-draft" },
    };
    const s = m[status] || { label: status, cls: "badge-archived" };
    return <span className={s.cls}>{s.label}</span>;
  };

  const getSeoScore = (p: Product) => {
    let score = 0;
    if (p.title.length >= 50 && p.title.length <= 70) score += 40;
    else if (p.title.length >= 30) score += 20;
    if (p.body_html && p.body_html.length > 300) score += 30;
    else if (p.body_html && p.body_html.length > 100) score += 15;
    if (p.tags && p.tags.split(",").length >= 5) score += 30;
    else if (p.tags) score += 15;
    if (score >= 70) return { label: "Excellent", color: "#059669", bg: "bg-emerald-50" };
    if (score >= 40) return { label: "Moyen", color: "#d97706", bg: "bg-amber-50" };
    return { label: "Faible", color: "#dc2626", bg: "bg-red-50" };
  };

  const handleBulkPriceApply = async () => {
    if (!bulkPrice) return;
    setActionLoading("price");
    try {
      let mode = "fixed";
      let val = bulkPrice;
      if (bulkPriceMode === "percent_up") { mode = "percent"; }
      else if (bulkPriceMode === "percent_down") { mode = "percent"; val = `-${bulkPrice}`; }
      else if (bulkPriceMode === "multiply") { mode = "multiply"; }
      const res = await fetch("/api/shopify/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProducts, newPrice: val, mode }),
      });
      if (!res.ok) throw new Error();
      addToast(`${selectedProducts.length} produit${selectedProducts.length > 1 ? "s" : ""} mis à jour`, "success");
      setSelectedProducts([]); setBulkPrice(""); setActiveAction(null);
      fetchProducts(true);
    } catch { addToast("Erreur lors de la mise à jour — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const handleBulkFieldApply = async (field: string, value: string) => {
    if (!value) return;
    setActionLoading(field);
    try {
      const res = await fetch("/api/shopify/bulk-edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProducts, field, value }),
      });
      if (!res.ok) throw new Error();
      addToast(`${selectedProducts.length} produit${selectedProducts.length > 1 ? "s" : ""} mis à jour`, "success");
      setSelectedProducts([]); setActiveAction(null);
      setBulkTitle(""); setBulkDescription(""); setBulkTags("");
      fetchProducts(true);
    } catch { addToast("Erreur lors de la mise à jour — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const handleBulkStatus = async (status: string) => {
    setActionLoading(status);
    try {
      const res = await fetch("/api/shopify/bulk-edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProducts, field: "status", value: status }),
      });
      if (!res.ok) throw new Error();
      addToast(`${selectedProducts.length} produit${selectedProducts.length > 1 ? "s" : ""} ${status === "archived" ? "archivé" : "activé"}${selectedProducts.length > 1 ? "s" : ""}`, "success");
      setSelectedProducts([]); setActiveAction(null);
      fetchProducts(true);
    } catch { addToast("Erreur — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const handleDuplicate = async (productId: string) => {
    setActionLoading(`dup-${productId}`);
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
      if (data.title) {
        await fetch("/api/shopify/bulk-edit", { method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productIds: [product.id], field: "title", value: data.title }) });
        addToast("Titre SEO appliqué", "success");
        fetchProducts(true);
      }
    } catch { addToast("Erreur IA — réessayez", "error"); }
    finally { setActionLoading(null); }
  };

  const exportCSV = () => {
    const headers = ["Titre", "Prix", "Statut", "Tags", "Image URL"];
    const rows = filteredProducts.map((p) => [p.title, p.price, p.status, p.tags || "", p.images?.[0]?.src || ""]);
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

  return (
    <div className="max-w-7xl mx-auto">
      <ConfirmModal open={confirmModal.open} title={confirmModal.title} message={confirmModal.message} variant="danger"
        onConfirm={() => { confirmModal.action(); setConfirmModal({ ...confirmModal, open: false }); }}
        onCancel={() => setConfirmModal({ ...confirmModal, open: false })} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0f172a" }}>Catalogue produits</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""}
            {lowStockCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-red-50 rounded-full" style={{ color: "#dc2626" }}>
                <AlertTriangle className="w-3 h-3" /> {lowStockCount} stock bas
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchProducts(true)} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm disabled:opacity-50"
            style={{ color: "#374151" }} title="Rafraîchir les produits depuis Shopify">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} style={{ color: "#374151" }} /> Synchroniser
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm"
            style={{ color: "#374151" }} title="Télécharger un fichier CSV de tous les produits">
            <Download className="w-4 h-4" style={{ color: "#374151" }} /> Exporter CSV
          </button>
          <a href="/dashboard/import" className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm">
            <Upload className="w-4 h-4" style={{ color: "#fff" }} /><span style={{ color: "#fff" }}>Importer</span>
          </a>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {[{ key: "all", label: "Tous" }, { key: "active", label: "Actifs" }, { key: "draft", label: "Brouillons" }, { key: "archived", label: "Archivés" }].map((tab) => (
          <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === tab.key ? "bg-white shadow-sm" : "hover:bg-gray-200"}`}
            style={{ color: statusFilter === tab.key ? "#0f172a" : "#64748b" }}>
            {tab.label} <span className="ml-1 text-xs" style={{ color: "#94a3b8" }}>({statusCounts[tab.key] || 0})</span>
          </button>
        ))}
      </div>

      {/* Search + price filter */}
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

      {/* Bulk bar */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 px-5 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="text-sm font-semibold" style={{ color: "#1e40af" }}>{selectedProducts.length} sélectionné{selectedProducts.length > 1 ? "s" : ""}</p>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              {[{ key: "price", icon: DollarSign, label: "Prix" }, { key: "title", icon: Type, label: "Titre" },
                { key: "description", icon: FileText, label: "Description" }, { key: "tags", icon: Tag, label: "Tags" }].map((a) => (
                <button key={a.key} onClick={() => setActiveAction(activeAction === a.key ? null : a.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeAction === a.key ? "bg-blue-600" : "bg-white border border-blue-200 hover:bg-blue-100"}`}>
                  <a.icon className="w-3.5 h-3.5" style={{ color: activeAction === a.key ? "#fff" : "#3b82f6" }} />
                  <span style={{ color: activeAction === a.key ? "#fff" : "#1e40af" }}>{a.label}</span>
                </button>
              ))}
              <button onClick={() => setConfirmModal({ open: true, title: "Archiver", message: `Archiver ${selectedProducts.length} produit${selectedProducts.length > 1 ? "s" : ""} ?`, action: () => handleBulkStatus("archived") })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100">
                <Archive className="w-3.5 h-3.5" style={{ color: "#d97706" }} /><span style={{ color: "#92400e" }}>Archiver</span>
              </button>
              <button onClick={() => handleBulkStatus("active")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#059669" }} /><span style={{ color: "#065f46" }}>Activer</span>
              </button>
              <button onClick={() => { setSelectedProducts([]); setActiveAction(null); }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-50" style={{ color: "#374151" }}>Annuler</button>
            </div>
          </div>
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
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
              <input type="text" value={bulkTitle} onChange={(e) => setBulkTitle(e.target.value)} placeholder="Nouveau titre"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
              <button onClick={() => handleBulkFieldApply("title", bulkTitle)} disabled={!bulkTitle || actionLoading === "title"}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                <span style={{ color: "#fff" }}>{actionLoading === "title" ? "..." : "Appliquer"}</span>
              </button>
            </div>
          )}
          {activeAction === "description" && (
            <div className="flex flex-col gap-3 p-3 bg-white rounded-lg border border-blue-100">
              <textarea value={bulkDescription} onChange={(e) => setBulkDescription(e.target.value)} placeholder="Nouvelle description..." rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" style={{ color: "#0f172a" }} />
              <button onClick={() => handleBulkFieldApply("body_html", bulkDescription)} disabled={!bulkDescription || !!actionLoading}
                className="self-end px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                <span style={{ color: "#fff" }}>{actionLoading ? "..." : "Appliquer"}</span>
              </button>
            </div>
          )}
          {activeAction === "tags" && (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100">
              <input type="text" value={bulkTags} onChange={(e) => setBulkTags(e.target.value)} placeholder="tag1, tag2, tag3"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" style={{ color: "#0f172a" }} />
              <button onClick={() => handleBulkFieldApply("tags", bulkTags)} disabled={!bulkTags || !!actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium">
                <span style={{ color: "#fff" }}>{actionLoading ? "..." : "Appliquer"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
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
          <a href="/dashboard/import" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium">
            <span style={{ color: "#fff" }}>Importer mes premiers produits</span>
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left w-10">
                    <button onClick={selectAll} title="Tout sélectionner (Ctrl+A)">
                      {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0
                        ? <CheckSquare className="w-4 h-4" style={{ color: "#3b82f6" }} />
                        : <Square className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Image</th>
                  <th className="px-4 py-3 text-left"><button onClick={() => handleSort("title")} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Titre <ArrowUpDown className="w-3 h-3" style={{ color: "#94a3b8" }} /></button></th>
                  <th className="px-4 py-3 text-left"><button onClick={() => handleSort("price")} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Prix <ArrowUpDown className="w-3 h-3" style={{ color: "#94a3b8" }} /></button></th>
                  <th className="px-4 py-3 text-left"><button onClick={() => handleSort("status")} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Statut <ArrowUpDown className="w-3 h-3" style={{ color: "#94a3b8" }} /></button></th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>SEO</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.map((product) => {
                  const isSelected = selectedProducts.includes(product.id);
                  const imageUrl = product.images?.[0]?.src;
                  const seo = getSeoScore(product);
                  const hasLowStock = product.variants?.some((v) => (v.inventory_quantity ?? 999) < 5);
                  return (
                    <tr key={product.id} className={`hover:bg-blue-50/30 transition-colors ${isSelected ? "bg-blue-50/50" : ""}`}>
                      <td className="px-4 py-3"><button onClick={() => toggleSelectProduct(product.id)}>{isSelected ? <CheckSquare className="w-4 h-4" style={{ color: "#3b82f6" }} /> : <Square className="w-4 h-4" style={{ color: "#d1d5db" }} />}</button></td>
                      <td className="px-4 py-3">
                        {imageUrl ? <img src={imageUrl} alt={product.title} className="w-11 h-11 rounded-lg object-cover border border-gray-100" />
                          : <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200"><ImageOff className="w-4 h-4" style={{ color: "#cbd5e1" }} /></div>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{product.title}</p>
                        {product.vendor && <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{product.vendor}</p>}
                        {hasLowStock && <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-red-50 rounded mt-1" style={{ color: "#dc2626" }}><AlertTriangle className="w-2.5 h-2.5" /> Stock bas</span>}
                      </td>
                      <td className="px-4 py-3"><p className="text-sm font-bold" style={{ color: "#059669" }}>{parseFloat(product.price).toFixed(2)} €</p></td>
                      <td className="px-4 py-3">{getStatusBadge(product.status)}</td>
                      <td className="px-4 py-3"><span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${seo.bg}`} style={{ color: seo.color }}>{seo.label}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleAiTitle(product)} disabled={actionLoading === `ai-${product.id}`}
                            className="p-1.5 hover:bg-violet-50 rounded-lg" title="Améliorer le titre avec l'IA">
                            {actionLoading === `ai-${product.id}` ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#8b5cf6" }} /> : <Sparkles className="w-4 h-4" style={{ color: "#8b5cf6" }} />}
                          </button>
                          <button onClick={() => handleDuplicate(product.id)} disabled={actionLoading === `dup-${product.id}`}
                            className="p-1.5 hover:bg-blue-50 rounded-lg" title="Dupliquer ce produit">
                            {actionLoading === `dup-${product.id}` ? <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#3b82f6" }} /> : <Copy className="w-4 h-4" style={{ color: "#3b82f6" }} />}
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded-lg" title="Archiver"><Archive className="w-4 h-4" style={{ color: "#ef4444" }} /></button>
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
                className="p-2 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-40" title="← Page précédente">
                <ChevronLeft className="w-4 h-4" style={{ color: "#374151" }} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === page ? "bg-blue-600" : "hover:bg-white border border-gray-200"}`}
                  style={{ color: currentPage === page ? "#fff" : "#374151" }}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                className="p-2 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-40" title="→ Page suivante">
                <ChevronRight className="w-4 h-4" style={{ color: "#374151" }} />
              </button>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs mt-3 text-center" style={{ color: "#94a3b8" }}>Ctrl+A : tout sélectionner · Échap : désélectionner · ← → : naviguer</p>
    </div>
  );
}
