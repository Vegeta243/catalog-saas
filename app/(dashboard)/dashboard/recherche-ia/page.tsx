"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Sparkles, RefreshCw, ShoppingBag, TrendingUp,
  Filter, Star, ArrowRight, ChevronDown, ExternalLink,
} from "lucide-react";
import { useToast } from "@/lib/toast";

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
  orders?: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  AliExpress: "#e8192c",
  CJ: "#0066ff",
  Temu: "#ff6b35",
  Amazon: "#ff9900",
};

const NICHES = [
  // Mode & Vêtements
  "Mode femme", "Mode homme", "Vêtements enfants", "Accessoires mode", "Lingerie",
  // Maison & Déco
  "Décoration intérieure", "Organisation maison", "Jardinage", "Luminaires",
  // Tech & Gadgets
  "Gadgets tech", "Accessoires smartphone", "Informatique", "Jeux vidéo",
  // Beauté & Santé
  "Cosmétiques", "Soin cheveux", "Fitness & Sport", "Bien-être",
  // Animaux
  "Chiens", "Chats", "Animaux exotiques",
  // Enfants & Bébé
  "Jouets enfants", "Bébé & Puériculture",
  // Autres
  "Cuisine & Gastronomie", "Voyage & Outdoor", "Voiture & Auto", "Autre",
];
const PLATFORMS = ["AliExpress", "CJ", "Temu", "Amazon", "Zendrop", "Alibaba"];

export default function RechercheIAPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [adminChecking, setAdminChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [platform, setPlatform] = useState<string>("AliExpress");
  const [niche, setNiche] = useState<string>("Décoration intérieure");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("50");
  const [minMargin, setMinMargin] = useState("2");
  const [trend, setTrend] = useState<"trending" | "bestsellers" | "new">("trending");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [importingIdx, setImportingIdx] = useState<number | null>(null);

  useEffect(() => { document.title = "Recherche IA | EcomPilot"; }, []);

  // Admin-only gate: check session cookie via API
  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(data => {
        if (!data.isAdmin) {
          router.replace('/dashboard');
        } else {
          setIsAdmin(true);
        }
      })
      .catch(() => router.replace('/dashboard'))
      .finally(() => setAdminChecking(false));
  }, []);

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
      {adminChecking ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "var(--text-tertiary)" }} />
        </div>
      ) : !isAdmin ? null : (
      <>
      <div className="mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Search className="w-6 h-6 text-blue-600" />
          Recherche de produits par IA
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
          Trouvez des produits gagnants automatiquement — cueillis, scorés et prêts à importer
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Filtres de recherche</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Platform */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Plateforme</label>
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
                  style={platform === p ? { backgroundColor: PLATFORM_COLORS[p] || "#2563eb" } : { color: "var(--text-secondary)" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Niche */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Niche</label>
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
                  style={niche !== n ? { color: "var(--text-secondary)" } : {}}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Trend */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Tendance</label>
            <div className="flex gap-1.5">
              {([["trending", "Trending"], ["bestsellers", "Best sellers"], ["new", "Nouveautes"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setTrend(val)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    trend === val ? "border-blue-500 text-blue-700 bg-blue-50" : "border-gray-200"
                  }`}
                  style={trend !== val ? { color: "var(--text-secondary)" } : {}}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Prix fournisseur (€)</label>
            <div className="flex items-center gap-2">
              <input
                type="number" placeholder="0" value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                style={{ color: "var(--text-primary)" }}
              />
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>—</span>
              <input
                type="number" placeholder="50" value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
                className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                style={{ color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Margin */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Marge minimum</label>
            <div className="relative w-32">
              <select
                value={minMargin}
                onChange={e => setMinMargin(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs pr-8 appearance-none"
                style={{ color: "var(--text-primary)" }}
              >
                <option value="1.5">× 1.5</option>
                <option value="2">× 2</option>
                <option value="2.5">× 2.5</option>
                <option value="3">× 3</option>
                <option value="4">× 4</option>
                <option value="5">× 5</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: "var(--text-tertiary)" }} />
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Mots-clés (optionnel)</label>
            <input
              type="text"
              placeholder="ex: veste femme hiver, gadget cuisine..."
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs"
              style={{ color: "var(--text-primary)" }}
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
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            {results.length} produit{results.length > 1 ? "s" : ""} trouvé{results.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {results.map((product, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {/* Image — large 300px */}
                <div className="relative bg-gray-100 flex items-center justify-center" style={{ height: 300 }}>
                  <ShoppingBag className="w-14 h-14" style={{ color: "#cbd5e1" }} />
                  {product.image && (
                    <img
                      src={product.platform === "AliExpress" ? `/api/image-proxy?url=${encodeURIComponent(product.image)}` : product.image}
                      alt={product.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <span
                    className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: PLATFORM_COLORS[product.platform] || "#64748b" }}
                  >
                    {product.platform}
                  </span>
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-bold text-blue-500">{product.trendingScore}/10</span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  {/* Title */}
                  <p className="text-sm font-semibold line-clamp-2 mb-3" style={{ color: "var(--text-primary)" }}>
                    {product.title}
                  </p>

                  {/* Pricing grid — 3 columns */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                      <span className="block text-[10px] font-medium mb-0.5" style={{ color: "var(--text-tertiary)" }}>Fournisseur</span>
                      <span className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>{product.supplierPrice.toFixed(2)}€</span>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
                      <span className="block text-[10px] font-medium mb-0.5" style={{ color: "var(--text-tertiary)" }}>Vente</span>
                      <span className="text-sm font-bold" style={{ color: "#059669" }}>{product.salePrice.toFixed(2)}€</span>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                      <span className="block text-[10px] font-medium mb-0.5" style={{ color: "var(--text-tertiary)" }}>Marge</span>
                      <span className="text-sm font-bold text-blue-600">×{product.margin}</span>
                    </div>
                  </div>

                  {/* Stats row: rating, orders, competition */}
                  <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {product.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{product.rating}</span>
                      </span>
                    )}
                    {(product.orders !== undefined && product.orders > 0) && (
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        <span>{product.orders.toLocaleString("fr-FR")} ventes</span>
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      product.competition === "Faible" ? "bg-emerald-50 text-emerald-700" :
                      product.competition === "Moyen" ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-600"
                    }`}>
                      {product.competition}
                    </span>
                  </div>

                  {/* Buttons — pushed to bottom */}
                  <div className="mt-auto flex gap-2">
                    {product.url && (
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Voir le produit
                      </a>
                    )}
                    <button
                      onClick={() => handleImport(product, idx)}
                      disabled={importingIdx === idx}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg text-xs font-semibold text-white transition-colors"
                    >
                      {importingIdx === idx ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      {importingIdx === idx ? "Import…" : "Importer"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Search className="w-12 h-12 mx-auto mb-3" style={{ color: "#e2e8f0" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
            Configurez vos filtres et lancez la recherche IA
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            L&apos;IA analyse les plateformes et sélectionne les produits les plus rentables pour vous
          </p>
        </div>
      )}
      </>
      )}
    </div>
  );
}
