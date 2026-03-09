"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import {
  Eye, Plus, RefreshCw, Trash2, TrendingUp, TrendingDown, Minus,
  AlertTriangle, Package, X, Loader2, Sparkles, ExternalLink
} from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  url: string;
  shop_platform: string;
  last_analyzed_at: string | null;
  competitor_snapshots: { id: string; products_found: number; avg_price: number; analyzed_at: string }[];
}

interface AnalysisResult {
  products_found: number;
  avg_price: number | null;
  price_changes: { title: string; oldPrice: number; newPrice: number }[];
  new_products: string[];
  removed_products: string[];
  insights: string[];
}

export default function ConcurrencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisCompetitor, setAnalysisCompetitor] = useState<string>("");

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/concurrence/analyze");
      const data = await res.json();
      setCompetitors(data.competitors || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCompetitors(); }, [fetchCompetitors]);

  const handleAdd = async () => {
    if (!addName || !addUrl) return;
    setAdding(true);
    await fetch("/api/concurrence/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", name: addName, url: addUrl }),
    });
    setAdding(false);
    setShowAddModal(false);
    setAddName("");
    setAddUrl("");
    fetchCompetitors();
  };

  const handleAnalyze = async (comp: Competitor) => {
    setAnalyzingId(comp.id);
    setAnalysisResult(null);
    setAnalysisCompetitor(comp.name);
    try {
      const res = await fetch("/api/concurrence/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", competitor_id: comp.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysisResult(data);
        fetchCompetitors();
      }
    } catch { /* silent */ }
    setAnalyzingId(null);
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/concurrence/analyze", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchCompetitors();
  };

  const getLatestSnapshot = (comp: Competitor) => {
    const snaps = comp.competitor_snapshots || [];
    return snaps.sort((a, b) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0] || null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="w-6 h-6 text-blue-600" /> Analyse concurrentielle
          </h1>
          <p className="text-sm text-gray-500 mt-1">Suivez vos concurrents et détectez les changements de prix</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Ajouter un concurrent
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competitor cards */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : competitors.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Eye className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">Aucun concurrent ajouté</p>
              <p className="text-xs text-gray-400 mb-4">Ajoutez l&apos;URL d&apos;un concurrent pour commencer l&apos;analyse</p>
              <button onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Ajouter un concurrent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {competitors.map(comp => {
                const snap = getLatestSnapshot(comp);
                const isAnalyzing = analyzingId === comp.id;
                return (
                  <div key={comp.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">{comp.name}</h3>
                        <a href={comp.url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                          {new URL(comp.url).hostname} <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <button onClick={() => handleDelete(comp.id)} className="p-1 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>

                    {snap ? (
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Produits détectés</span>
                          <span className="font-medium text-gray-700">{snap.products_found}</span>
                        </div>
                        {snap.avg_price && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Prix moyen</span>
                            <span className="font-medium text-gray-700">{snap.avg_price.toFixed(2)}€</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Dernière analyse</span>
                          <span className="text-gray-400">
                            {new Date(snap.analyzed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 mb-3">Pas encore analysé</p>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => handleAnalyze(comp)} disabled={isAnalyzing}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-50">
                        {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        {isAnalyzing ? "Analyse..." : "Analyser"}
                        <span className="text-[9px] text-blue-400 ml-1">5 tâches</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel — Analysis results */}
        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
              {analysisResult ? `Résultats — ${analysisCompetitor}` : "Changements détectés"}
            </h3>

            {!analysisResult ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Cliquez sur &quot;Analyser&quot; pour voir les résultats</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Products found */}
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
                  <Package className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-blue-700 font-medium">{analysisResult.products_found} produits détectés</span>
                </div>

                {/* Price changes */}
                {analysisResult.price_changes.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Changements de prix</h4>
                    {analysisResult.price_changes.map((pc, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 mb-1">
                        {pc.newPrice < pc.oldPrice ? (
                          <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-[10px] font-medium text-gray-700">{pc.title}</p>
                          <p className="text-[10px] text-gray-500">
                            {pc.oldPrice}€ → <span className={pc.newPrice < pc.oldPrice ? "text-red-600 font-medium" : "text-green-600 font-medium"}>{pc.newPrice}€</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New products */}
                {analysisResult.new_products.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Nouveaux produits</h4>
                    {analysisResult.new_products.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 p-1.5 text-[10px] text-green-700 bg-green-50 rounded mb-1">
                        <Plus className="w-3 h-3" /> {p}
                      </div>
                    ))}
                  </div>
                )}

                {/* Removed products */}
                {analysisResult.removed_products.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Produits retirés</h4>
                    {analysisResult.removed_products.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 p-1.5 text-[10px] text-red-700 bg-red-50 rounded mb-1">
                        <Minus className="w-3 h-3" /> {p}
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Insights */}
                {analysisResult.insights.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-500" /> Recommandations IA
                    </h4>
                    {analysisResult.insights.map((insight, i) => (
                      <div key={i} className="p-2 bg-purple-50 rounded-lg mb-1 text-[10px] text-purple-700">
                        {insight}
                      </div>
                    ))}
                  </div>
                )}

                {analysisResult.price_changes.length === 0 && analysisResult.new_products.length === 0 && analysisResult.removed_products.length === 0 && (
                  <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <Minus className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-green-700">Aucun changement détecté</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD COMPETITOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded">
              <X className="w-4 h-4 text-gray-400" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Ajouter un concurrent</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom du concurrent</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Ex: Ma Boutique Concurrente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL de la boutique</label>
                <input value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://concurrent.myshopify.com/collections/all"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none" />
                <p className="text-[10px] text-gray-400 mt-1">Shopify, WooCommerce ou toute page produits</p>
              </div>
              <button onClick={handleAdd} disabled={adding || !addName || !addUrl}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {adding ? "Ajout en cours..." : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
