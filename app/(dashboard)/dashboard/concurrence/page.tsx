'use client'

import { useState, useEffect } from 'react'
import {
  Eye, Plus, Trash2, RefreshCw, TrendingDown, TrendingUp,
  AlertTriangle, CheckCircle, Package, Tag, Star, ExternalLink,
  Bell
} from 'lucide-react'

type SnapshotData = {
  products_found: number
  avg_price: number
  avg_rating: number | null
  review_count: number
  promo_detected: boolean
  shipping_info: string
  price_changes: { product?: string; old_price?: number; new_price?: number; direction?: string }[]
  new_products: string[]
  removed_products: string[]
  insights: string[]
  seo?: { has_meta_description: boolean; title_tag: string; h1_count: number }
  social?: { facebook: boolean; instagram: boolean; tiktok: boolean }
  payment?: { paypal: boolean; stripe: boolean; klarna: boolean }
}

type Competitor = {
  id: string
  name: string
  url: string
  last_analyzed_at: string | null
  is_active: boolean
  snapshot?: SnapshotData | null
}

export default function ConcurrencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selected, setSelected] = useState<Competitor | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCompetitors = async () => {
    try {
      const res = await fetch('/api/concurrence/competitors')
      const data = await res.json()
      setCompetitors(data.competitors || [])
    } catch {
      // silent
    }
    setIsLoading(false)
  }

  useEffect(() => { fetchCompetitors() }, [])

  const handleAdd = async () => {
    if (!newName || !newUrl) return
    setIsAdding(true)
    try {
      const res = await fetch('/api/concurrence/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, url: newUrl }),
      })
      if (!res.ok) {
        const d = await res.json()
        if (d.setup_required) {
          alert('Tables manquantes. Exécutez supabase/migrations/004_new_tables.sql dans Supabase SQL Editor.')
        } else {
          alert(d.error || "Erreur lors de l'ajout")
        }
        return
      }
      setShowAddModal(false)
      setNewName('')
      setNewUrl('')
      fetchCompetitors()
    } catch { alert('Erreur réseau') }
    finally { setIsAdding(false) }
  }

  const handleAnalyze = async (competitor: Competitor) => {
    setAnalyzingId(competitor.id)
    try {
      const res = await fetch('/api/concurrence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', competitor_id: competitor.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const snapshot: SnapshotData = {
        products_found: data.products_found || 0,
        avg_price: data.avg_price || 0,
        avg_rating: data.avg_rating ?? null,
        review_count: data.review_count || 0,
        promo_detected: data.promo_detected || false,
        shipping_info: data.shipping_info || 'Non détecté',
        price_changes: data.price_changes || [],
        new_products: data.new_products || [],
        removed_products: data.removed_products || [],
        insights: data.insights || [],
        seo: data.seo,
        social: data.social,
        payment: data.payment,
      }
      const updated = { ...competitor, snapshot, last_analyzed_at: new Date().toISOString() }
      setSelected(updated)
      setCompetitors(prev => prev.map(c => c.id === competitor.id ? updated : c))
    } catch (e: unknown) {
      alert((e as Error).message || "Erreur lors de l'analyse")
    }
    finally { setAnalyzingId(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce concurrent ?')) return
    await fetch('/api/concurrence/competitors', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (selected?.id === id) setSelected(null)
    setCompetitors(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="flex h-full gap-0" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* LEFT SIDEBAR */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white" style={{ minHeight: '100%' }}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <Eye className="w-4 h-4 text-blue-500" /> Concurrents
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            {competitors.length} concurrent{competitors.length !== 1 ? 's' : ''} suivis
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm" style={{ color: '#94a3b8' }}>
              Chargement...
            </div>
          ) : competitors.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Eye className="w-8 h-8 mx-auto mb-3" style={{ color: '#d1d5db' }} />
              <p className="text-sm mb-1" style={{ color: '#64748b' }}>Aucun concurrent</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>
                Ajoutez l&apos;URL d&apos;une boutique concurrente pour commencer le suivi
              </p>
            </div>
          ) : competitors.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              className={`p-3 rounded-xl cursor-pointer border transition-all ${
                selected?.id === c.id
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-transparent bg-gray-50 hover:border-gray-200'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: '#0f172a' }}>{c.name}</p>
                  <p className="text-xs truncate" style={{ color: '#94a3b8' }}>
                    {c.url.replace(/^https?:\/\//, '')}
                  </p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                  className="text-gray-300 hover:text-red-500 ml-2 flex-shrink-0 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {c.last_analyzed_at ? (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs flex items-center gap-1" style={{ color: '#059669' }}>
                    <CheckCircle className="w-3 h-3" /> Analysé
                  </span>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    {new Date(c.last_analyzed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ) : (
                <div className="mt-2">
                  <span className="text-xs flex items-center gap-1" style={{ color: '#f59e0b' }}>
                    <AlertTriangle className="w-3 h-3" /> Pas encore analysé
                  </span>
                </div>
              )}

              <button
                onClick={e => { e.stopPropagation(); handleAnalyze(c) }}
                disabled={analyzingId === c.id}
                className="mt-2 w-full border border-gray-200 hover:bg-blue-50 hover:border-blue-300 text-xs py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 bg-white"
                style={{ color: '#374151' }}>
                <RefreshCw className={`w-3 h-3 ${analyzingId === c.id ? 'animate-spin' : ''}`} />
                {analyzingId === c.id ? 'Analyse...' : 'Analyser'} · 5 tâches
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
            <Eye className="w-16 h-16 mb-4" style={{ color: '#d1d5db' }} />
            <h3 className="text-xl font-semibold mb-2" style={{ color: '#374151' }}>Analyse concurrentielle</h3>
            <p className="max-w-md" style={{ color: '#94a3b8' }}>
              Sélectionnez un concurrent dans la liste pour voir les résultats : prix, produits, SEO, promotions, et recommandations IA.
            </p>
            {competitors.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700">
                + Ajouter mon premier concurrent
              </button>
            )}
          </div>
        ) : !selected.snapshot ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
            <RefreshCw className="w-12 h-12 mb-4" style={{ color: '#93c5fd' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#374151' }}>{selected.name} n&apos;a pas encore été analysé</h3>
            <p className="mb-6" style={{ color: '#94a3b8' }}>Lancez l&apos;analyse pour voir les produits, prix, SEO et recommandations.</p>
            <button
              onClick={() => handleAnalyze(selected)}
              disabled={analyzingId === selected.id}
              className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${analyzingId === selected.id ? 'animate-spin' : ''}`} />
              {analyzingId === selected.id ? "Analyse en cours..." : "Lancer l'analyse complète"} · 5 tâches
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
                  {selected.name}
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </h2>
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  Dernière analyse : {selected.last_analyzed_at
                    ? new Date(selected.last_analyzed_at).toLocaleString('fr-FR')
                    : 'N/A'}
                </p>
              </div>
              <button
                onClick={() => handleAnalyze(selected)}
                disabled={analyzingId === selected.id}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${analyzingId === selected.id ? 'animate-spin' : ''}`} />
                Ré-analyser
              </button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: 'Produits détectés',
                  value: String(selected.snapshot.products_found || 0),
                  icon: <Package className="w-5 h-5" style={{ color: '#2563eb' }} />,
                },
                {
                  label: 'Prix moyen',
                  value: selected.snapshot.avg_price ? `${selected.snapshot.avg_price.toFixed(2)}€` : 'N/A',
                  icon: <Tag className="w-5 h-5" style={{ color: '#7c3aed' }} />,
                },
                {
                  label: 'Note moyenne',
                  value: selected.snapshot.avg_rating ? `${selected.snapshot.avg_rating}/5 ⭐` : 'N/A',
                  icon: <Star className="w-5 h-5" style={{ color: '#f59e0b' }} />,
                },
                {
                  label: 'Promotions',
                  value: selected.snapshot.promo_detected ? '🔥 Actives' : 'Aucune',
                  icon: <Bell className="w-5 h-5" style={{ color: '#ef4444' }} />,
                },
              ].map((kpi, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {kpi.icon}
                    <span className="text-xs" style={{ color: '#94a3b8' }}>{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: '#0f172a' }}>{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Changes */}
            {(selected.snapshot.price_changes?.length > 0 ||
              selected.snapshot.new_products?.length > 0 ||
              selected.snapshot.removed_products?.length > 0) && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#0f172a' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} /> Changements détectés
                </h3>
                <div className="space-y-2">
                  {selected.snapshot.price_changes?.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg text-sm" style={{ backgroundColor: '#fff7ed' }}>
                      {c.direction === 'down'
                        ? <TrendingDown className="w-4 h-4" style={{ color: '#ef4444' }} />
                        : <TrendingUp className="w-4 h-4" style={{ color: '#059669' }} />}
                      <span style={{ color: '#374151' }}>
                        <strong>{c.product}</strong> : {c.old_price}€ →{' '}
                        <strong>{c.new_price}€</strong>
                        {c.old_price && c.new_price && (
                          <span className={`ml-2 text-xs font-bold ${c.direction === 'down' ? 'text-red-500' : 'text-green-600'}`}>
                            {c.direction === 'down' ? '↓' : '↑'}{' '}
                            {Math.abs(((c.new_price - c.old_price) / c.old_price) * 100).toFixed(0)}%
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {selected.snapshot.new_products?.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg text-sm" style={{ backgroundColor: '#f0fdf4' }}>
                      <span style={{ color: '#059669', fontWeight: 700 }}>🆕</span>
                      <span style={{ color: '#374151' }}>Nouveau produit : <strong>{p}</strong></span>
                    </div>
                  ))}
                  {selected.snapshot.removed_products?.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg text-sm" style={{ backgroundColor: '#fef2f2' }}>
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>❌</span>
                      <span style={{ color: '#374151' }}>Produit retiré : <strong>{p}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {selected.snapshot.insights && selected.snapshot.insights.length > 0 && (
              <div className="rounded-xl p-5 border" style={{ background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', borderColor: '#bfdbfe' }}>
                <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#1e40af' }}>
                  ✨ Recommandations IA
                </h3>
                <div className="space-y-3">
                  {selected.snapshot.insights.map((insight, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-white rounded-lg text-sm" style={{ color: '#374151' }}>
                      <span className="font-bold flex-shrink-0" style={{ color: '#2563eb' }}>{i + 1}.</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping */}
            {selected.snapshot.shipping_info && selected.snapshot.shipping_info !== 'Non détecté' && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="font-semibold mb-2" style={{ color: '#0f172a' }}>🚚 Livraison</h3>
                <p className="text-sm" style={{ color: '#64748b' }}>{selected.snapshot.shipping_info}</p>
              </div>
            )}

            {/* Signals */}
            {(selected.snapshot.social || selected.snapshot.payment) && (
              <div className="grid grid-cols-2 gap-4">
                {selected.snapshot.social && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>📱 Réseaux sociaux</h4>
                    <div className="space-y-1">
                      {[
                        { label: 'Facebook', val: selected.snapshot.social.facebook },
                        { label: 'Instagram', val: selected.snapshot.social.instagram },
                        { label: 'TikTok', val: selected.snapshot.social.tiktok },
                      ].map(s => (
                        <div key={s.label} className="flex items-center justify-between text-xs">
                          <span style={{ color: '#64748b' }}>{s.label}</span>
                          <span style={{ color: s.val ? '#059669' : '#d1d5db' }}>{s.val ? '✓' : '✗'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selected.snapshot.payment && (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-sm font-semibold mb-3" style={{ color: '#0f172a' }}>💳 Paiement</h4>
                    <div className="space-y-1">
                      {[
                        { label: 'PayPal', val: selected.snapshot.payment.paypal },
                        { label: 'Stripe', val: selected.snapshot.payment.stripe },
                        { label: 'Klarna', val: selected.snapshot.payment.klarna },
                      ].map(p => (
                        <div key={p.label} className="flex items-center justify-between text-xs">
                          <span style={{ color: '#64748b' }}>{p.label}</span>
                          <span style={{ color: p.val ? '#059669' : '#d1d5db' }}>{p.val ? '✓' : '✗'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {selected.snapshot.products_found === 0 && !selected.snapshot.insights?.length && (
              <div className="text-center py-8" style={{ color: '#94a3b8' }}>
                <p className="text-sm">L&apos;analyse n&apos;a pas pu extraire de données de ce site.</p>
                <p className="text-xs mt-1">Certains sites protègent leur contenu contre le scraping.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-1" style={{ color: '#0f172a' }}>Ajouter un concurrent</h3>
            <p className="text-sm mb-5" style={{ color: '#64748b' }}>
              Entrez l&apos;URL de la boutique à surveiller. Fonctionne avec Shopify, WooCommerce, ou toute page produit.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: '#374151' }}>Nom du concurrent</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="ex: Ma Boutique Concurrente"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  style={{ color: '#111827' }}
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: '#374151' }}>URL de la boutique</label>
                <input
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://example.myshopify.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
                  style={{ color: '#111827' }}
                />
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Shopify, WooCommerce ou toute page produit</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setNewName(''); setNewUrl('') }}
                className="flex-1 border border-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50"
                style={{ color: '#374151' }}>
                Annuler
              </button>
              <button
                onClick={handleAdd}
                disabled={isAdding || !newName || !newUrl}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {isAdding ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
