"use client";

import { useState } from "react";
import {
  Search, Sparkles, RefreshCw, ShoppingBag, TrendingUp,
  Filter, Star, AlertTriangle, ArrowRight, Crown, ChevronDown,
} from "lucide-react";
import { useToast } from "@/lib/toast";
import Link from "next/link";

interface ProductResult {
  title: string;
  image: string;
  supplierPrice: number;
  salePrice: number;
  margin: number;
  platform: "AliExpress" | "CJ" | "Temu" | "Amazon";
  url: string;
  trendingScore: number;
  competition: "Faible" | "Moyen" | "Élevé";
  rating?: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  AliExpress: "#e8192c",
  CJ: "#0066ff",
  Temu: "#ff6b35",
  Amazon: "#ff9900",
};

const NICHES = ["Mode", "Tech", "Maison", "Sport", "Beauté", "Enfants", "Animaux", "Autre"];
const PLATFORMS = ["AliExpress", "CJ", "Temu", "Amazon", "Zendrop", "Alibaba"];

export default function RechercheIAPage() {
  const { addToast } = useToast();
  const [platform, setPlatform] = useState<string>("AliExpress");
  const [niche, setNiche] = useState<string>("Mode");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("50");
  const [minMargin, setMinMargin] = useState("2");
  const [trend, setTrend] = useState<"trending" | "bestsellers" | "new">("trending");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [importingIdx, setImportingIdx] = useState<number | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch("/api/products/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, niche, minPrice, maxPrice, minMargin, trend, keywords }),
      });
      const data = await res.json();
      if (res.status === 403) {
        addToast(data.error || "Fonctionnalité Pro requise", "error");
        return;
      }
      if (!res.ok) {
        addToast(data.error || "Erreur lors de la recherche", "error");
        return;
      }
      setResults(data.products || []);
      if ((data.products || []).length === 0) {
        addToast("Aucun produit trouvé — essayez d'autres filtres", "info");
      }
    } catch {
      addToast("Erreur réseau", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (product: ProductResult, idx: number) => {
    setImportingIdx(idx);
    try {
      const res = await fetch("/api/import/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: product.url, margin: parseFloat(String(product.margin)) }),
      });
      const data = await res.json();
      if (data.success || data.preview) {
        addToast(`"${product.title.substring(0, 40)}…" ajouté au catalogue`, "success");
      } else {
        addToast(data.error || "Erreur lors de l'import", "error");
      }
    } catch {
      addToast("Erreur réseau", "error");
    } finally {
      setImportingIdx(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#0f172a" }}>
          <Search className="w-6 h-6 text-blue-600" />
          Recherche de produits par IA
        </h1>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          Trouvez des produits gagnants automatiquement — cueillis, scorés et prêts à importer
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold" style={{ color: "#0f172a" }}>Filtres de recherche</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Platform */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Plateforme</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    platform === p
                      ? "text-white border-transparent"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={platform === p ? { backgroundColor: PLATFORM_COLORS[p] || "#2563eb" } : { color: "#374151" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Niche */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Niche</label>
            <div className="flex flex-wrap gap-1.5">
              {NICHES.map(n => (
                <button
                  key={n}
                  onClick={() => setNiche(n)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    niche === n
                      ? "border-blue-500 text-blue-700 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={niche !== n ? { color: "#374151" } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Trend */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Tendance</label>
            <div className="flex gap-1.5">
              {([["trending", "🔥 Trending"], ["bestsellers", "⭐ Best sellers"], ["new", "🆕 Nouveautés"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTrend(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    trend === val ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-200"
                  }`}
                  style={trend !== val ? { color: "#374151" } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Prix fournisseur (€)</label>
            <div className="flex items-center gap-2">
              <input
                type="number" placeholder="0" value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                style={{ color: "#0f172a" }}
              />
              <span className="text-xs" style={{ color: "#94a3b8" }}>—</span>
              <input
                type="number" placeholder="50" value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                style={{ color: "#0f172a" }}
              />
            </div>
          </div>

          {/* Margin */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Marge minimum</label>
            <div className="relative w-32">
              <select
                value={minMargin}
                onChange={e => setMinMargin(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs pr-8 appearance-none"
                style={{ color: "#0f172a" }}
              >
                <option value="1.5">× 1.5</option>
                <option value="2">× 2</option>
                <option value="2.5">× 2.5</option>
                <option value="3">× 3</option>
                <option value="4">× 4</option>
                <option value="5">× 5</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "#94a3b8" }} />
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Mots-clés (optionnel)</label>
            <input
              type="text"
              placeholder="ex: veste femme hiver, gadget cuisine..."
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
              style={{ color: "#0f172a" }}
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="mt-5 flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-sm font-semibold text-white transition-colors"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Recherche en cours…" : "Lancer la recherche IA"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: "#0f172a" }}>
            {results.length} produit{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {results.map((product, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Image */}
                <div className="relative aspect-square bg-gray-100">
                  {product.image ? (
                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-10 h-10" style={{ color: "#cbd5e1" }} />
                    </div>
                  )}
                  <span
                    className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: PLATFORM_COLORS[product.platform] || "#64748b" }}
                  >
                    {product.platform}
                  </span>
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 rounded-full px-1.5 py-0.5">
                    <TrendingUp className="w-2.5 h-2.5 text-orange-500" />
                    <span className="text-[10px] font-bold text-orange-500">{product.trendingScore}/10</span>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-xs font-medium line-clamp-2 mb-2" style={{ color: "#0f172a" }}>
                    {product.title}
                  </p>

                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: "#94a3b8" }}>Fournisseur</span>
                      <span className="text-xs font-medium" style={{ color: "#374151" }}>{product.supplierPrice.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: "#94a3b8" }}>Vente</span>
                      <span className="text-xs font-bold" style={{ color: "#059669" }}>{product.salePrice.toFixed(2)}€</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: "#94a3b8" }}>Marge</span>
                      <span className="text-xs font-bold text-blue-600">×{product.margin}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      product.competition === "Faible" ? "bg-emerald-50 text-emerald-700" :
                      product.competition === "Moyen" ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-600"
                    }`}>
                      Concurrence {product.competition}
                    </span>
                    {product.rating && (
                      <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "#f59e0b" }}>
                        <Star className="w-2.5 h-2.5 fill-current" />
                        {product.rating}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleImport(product, idx)}
                    disabled={importingIdx === idx}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-xs font-semibold text-white transition-colors"
                  >
                    {importingIdx === idx ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                    {importingIdx === idx ? "Import…" : "Importer"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-3" style={{ color: "#e2e8f0" }} />
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>
            Configurez vos filtres et lancez la recherche IA
          </p>
          <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
            L&apos;IA analyse les plateformes et sélectionne les produits les plus rentables pour vous
          </p>
        </div>
      )}
    </div>
  );
}
