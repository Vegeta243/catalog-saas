"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Edit3,
  Trash2,
  Eye,
  CheckSquare,
  Square,
  ImageOff,
  ArrowUpDown,
  Tag,
  DollarSign,
  X,
} from 'lucide-react';

interface ShopifyImage {
  src: string;
}

interface Product {
  id: string;
  title: string;
  price: string;
  status: string;
  images?: ShopifyImage[];
  variants?: { price: string }[];
  product_type?: string;
  vendor?: string;
  updated_at?: string;
}

type SortKey = 'title' | 'price' | 'status';
type SortDir = 'asc' | 'desc';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkPriceMode, setBulkPriceMode] = useState<'fixed' | 'percent'>('fixed');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  const itemsPerPage = 10;

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/shopify/products");
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des produits.");
      }
      const data = await response.json();
      const prods = (data.products || []).map((p: Product) => ({
        ...p,
        price: p.variants?.[0]?.price || p.price || "0.00",
      }));
      setProducts(prods);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtered + sorted products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortKey === 'price') cmp = parseFloat(a.price) - parseFloat(b.price);
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [products, searchQuery, statusFilter, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.id));
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; class: string }> = {
      active: { label: 'Actif', class: 'badge-active' },
      archived: { label: 'Archivé', class: 'badge-archived' },
      draft: { label: 'Brouillon', class: 'badge-draft' },
    };
    const s = map[status] || { label: status, class: 'badge-archived' };
    return <span className={s.class}>{s.label}</span>;
  };

  const handleBulkPriceApply = async () => {
    setBulkSuccess(null);
    try {
      const response = await fetch("/api/shopify/bulk-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedProducts,
          newPrice: bulkPrice,
          mode: bulkPriceMode,
        }),
      });
      if (!response.ok) throw new Error("Erreur lors de la mise à jour");
      setBulkSuccess(`${selectedProducts.length} produits mis à jour avec succès`);
      setSelectedProducts([]);
      setBulkPrice("");
      fetchProducts();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const exportCSV = () => {
    const headers = ['Titre', 'Prix', 'Statut', 'Type', 'Vendeur'];
    const rows = filteredProducts.map(p => [p.title, p.price, p.status, p.product_type || '', p.vendor || '']);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `produits-ecompilot-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [products]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Catalogue produits</h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>{filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProducts}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
            style={{ color: '#374151' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#374151' }} />
            Synchroniser
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm"
              style={{ color: '#374151' }}
            >
              <Download className="w-4 h-4" style={{ color: '#374151' }} />
              Exporter
              <ChevronDown className="w-3 h-3" style={{ color: '#374151' }} />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
                <button onClick={exportCSV} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#0f172a' }}>
                  Exporter en CSV
                </button>
                <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50" style={{ color: '#0f172a' }}>
                  Exporter en Excel
                </button>
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-all">
            <Upload className="w-4 h-4" style={{ color: '#ffffff' }} />
            <span style={{ color: '#ffffff' }}>Importer</span>
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'all', label: 'Tous' },
          { key: 'active', label: 'Actifs' },
          { key: 'draft', label: 'Brouillons' },
          { key: 'archived', label: 'Archivés' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${statusFilter === tab.key ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            style={{ color: statusFilter === tab.key ? '#0f172a' : '#64748b' }}
          >
            {tab.label} {statusCounts[tab.key] !== undefined && <span className="ml-1 text-xs" style={{ color: '#94a3b8' }}>({statusCounts[tab.key] || 0})</span>}
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher par nom de produit..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            style={{ color: '#0f172a' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: '#94a3b8' }} />
            </button>
          )}
        </div>
      </div>

      {/* Success message */}
      {bulkSuccess && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
          <CheckSquare className="w-4 h-4" style={{ color: '#059669' }} />
          <p className="text-sm font-medium" style={{ color: '#059669' }}>{bulkSuccess}</p>
          <button onClick={() => setBulkSuccess(null)} className="ml-auto"><X className="w-4 h-4" style={{ color: '#059669' }} /></button>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 px-5 py-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center gap-4">
          <p className="text-sm font-semibold" style={{ color: '#1e40af' }}>
            {selectedProducts.length} produit{selectedProducts.length > 1 ? 's' : ''} sélectionné{selectedProducts.length > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 px-3 py-1.5">
              <DollarSign className="w-4 h-4" style={{ color: '#3b82f6' }} />
              <select
                value={bulkPriceMode}
                onChange={(e) => setBulkPriceMode(e.target.value as 'fixed' | 'percent')}
                className="text-sm border-0 bg-transparent focus:outline-none"
                style={{ color: '#0f172a' }}
              >
                <option value="fixed">Prix fixe (€)</option>
                <option value="percent">Variation (%)</option>
              </select>
              <input
                type="number"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                placeholder={bulkPriceMode === 'fixed' ? '29.99' : '+10'}
                className="w-24 text-sm border-0 bg-transparent focus:outline-none"
                style={{ color: '#0f172a' }}
              />
            </div>
            <button
              onClick={handleBulkPriceApply}
              disabled={!bulkPrice}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all"
            >
              <span style={{ color: '#ffffff' }}>Appliquer</span>
            </button>
            <button
              onClick={() => setSelectedProducts([])}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
              style={{ color: '#374151' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin mb-3" style={{ color: '#3b82f6' }} />
          <p className="text-sm font-medium" style={{ color: '#64748b' }}>Chargement des produits...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-red-200 p-8 flex flex-col items-center">
          <p className="text-sm font-medium" style={{ color: '#dc2626' }}>{error}</p>
          <button onClick={fetchProducts} className="mt-3 px-4 py-2 bg-red-50 rounded-lg text-sm font-medium" style={{ color: '#dc2626' }}>Réessayer</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left w-10">
                    <button onClick={selectAll} className="flex items-center">
                      {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0
                        ? <CheckSquare className="w-4 h-4" style={{ color: '#3b82f6' }} />
                        : <Square className="w-4 h-4" style={{ color: '#94a3b8' }} />
                      }
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Image</th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('title')} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                      Titre <ArrowUpDown className="w-3 h-3" style={{ color: '#94a3b8' }} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('price')} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                      Prix <ArrowUpDown className="w-3 h-3" style={{ color: '#94a3b8' }} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>
                      Statut <ArrowUpDown className="w-3 h-3" style={{ color: '#94a3b8' }} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Type</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedProducts.map((product) => {
                  const isSelected = selectedProducts.includes(product.id);
                  const imageUrl = product.images?.[0]?.src;
                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-blue-50/30 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelectProduct(product.id)}>
                          {isSelected
                            ? <CheckSquare className="w-4 h-4" style={{ color: '#3b82f6' }} />
                            : <Square className="w-4 h-4" style={{ color: '#d1d5db' }} />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={product.title}
                            className="w-11 h-11 rounded-lg object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center border border-gray-200">
                            <ImageOff className="w-4 h-4" style={{ color: '#cbd5e1' }} />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: '#0f172a' }}>{product.title}</p>
                        {product.vendor && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{product.vendor}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold" style={{ color: '#059669' }}>{parseFloat(product.price).toFixed(2)} €</p>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(product.status)}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm" style={{ color: '#64748b' }}>{product.product_type || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-all" title="Voir">
                            <Eye className="w-4 h-4" style={{ color: '#64748b' }} />
                          </button>
                          <button className="p-1.5 hover:bg-blue-50 rounded-lg transition-all" title="Modifier">
                            <Edit3 className="w-4 h-4" style={{ color: '#3b82f6' }} />
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded-lg transition-all" title="Supprimer">
                            <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-sm" style={{ color: '#64748b' }}>
              Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, filteredProducts.length)} sur {filteredProducts.length} produits
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" style={{ color: '#374151' }} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${currentPage === page ? 'bg-blue-600' : 'hover:bg-white border border-gray-200'}`}
                  style={{ color: currentPage === page ? '#ffffff' : '#374151' }}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 hover:bg-white rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" style={{ color: '#374151' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}