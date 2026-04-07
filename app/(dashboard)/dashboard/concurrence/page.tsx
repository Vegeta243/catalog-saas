'use client'

import { useState, useEffect, useCallback } from 'react'
import GuideBanner from '@/components/GuideBanner'
import {
  Eye, Plus, Trash2, RefreshCw, TrendingDown, TrendingUp,
  AlertTriangle, CheckCircle, Package, Tag, Star, ExternalLink,
  Bell, BarChart2, Search, BookOpen, Shield, ChevronRight, Lock,
} from 'lucide-react'
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag'
import { useToast } from '@/lib/toast'

/* ─────────────────────────── TYPES ─────────────────────────── */
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
  products?: { title: string; price: number | null; url?: string }[]
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

type Tab = 'overview' | 'prices' | 'seo' | 'catalog' | 'alerts'

type Alert = {
  id: string
  alert_type: string
  threshold_value: number | null
  frequency: string
  notification_method: string
  is_active: boolean
  competitor_id: string | null
}

type PricePoint = {
  id: string
  product_name: string
  price: number
  currency: string
  recorded_at: string
}

type SeoResult = {
  competitor_strengths: string[]
  my_opportunities: string[]
  keyword_gaps: string[]
  quick_wins: string[]
  score: { competitor: number; me: number }
  error?: string
} | null

type CatalogResult = {
  missing_categories: string[]
  unique_to_me: string[]
  price_positioning: string
  recommendations: string[]
  opportunity_score: number
  error?: string
} | null

type CompetitiveScore = {
  score: number
  threat_level: 'high' | 'medium' | 'low'
  threat_label: string
  breakdown: Record<string, { score: number; label: string }>
  summary: string
} | null

/* ─────────────────────────── TAB NAV ─────────────────────────── */
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: "Vue d'ensemble", icon: <Eye className="w-3.5 h-3.5" /> },
  { id: 'prices', label: 'Prix', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { id: 'seo', label: 'SEO', icon: <Search className="w-3.5 h-3.5" /> },
  { id: 'catalog', label: 'Catalogue', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'alerts', label: 'Alertes', icon: <Bell className="w-3.5 h-3.5" /> },
]

const THREAT_COLORS = {
  high: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: 'bg-red-100 text-red-700' },
  medium: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', badge: 'bg-amber-100 text-amber-700' },
  low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', badge: 'bg-green-100 text-green-700' },
}

/* ─────────────────────────── SEO SCORER ─────────────────────────── */
function scoreSEO(product: { title: string; body_html: string; tags: string; images: string[] }): { score: number; issues: string[] } {
  const issues: string[] = []
  let score = 100
  if (!product.title || product.title.length < 10) { score -= 20; issues.push('Titre trop court (< 10 car.)') }
  else if (product.title.length > 70) { score -= 10; issues.push('Titre trop long (> 70 car.)') }
  const desc = (product.body_html || '').replace(/<[^>]*>/g, '')
  if (!desc || desc.length < 20) { score -= 25; issues.push('Description manquante ou trop courte') }
  else if (desc.length < 100) { score -= 10; issues.push('Description courte (< 100 car.)') }
  const imgCount = Array.isArray(product.images) ? product.images.length : 0
  if (imgCount === 0) { score -= 20; issues.push('Aucune image') }
  else if (imgCount < 3) { score -= 5; issues.push("Peu d'images (< 3)") }
  const tagList = (product.tags || '').split(',').map(t => t.trim()).filter(Boolean)
  if (tagList.length === 0) { score -= 15; issues.push('Aucun tag') }
  else if (tagList.length < 3) { score -= 5; issues.push('Peu de tags (< 3)') }
  return { score: Math.max(0, score), issues }
}

/* ─────────────────────────── MAIN PAGE ─────────────────────────── */
export default function ConcurrencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [selected, setSelected] = useState<Competitor | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showAddModal, setShowAddModal] = useState(false)
  const [guideVisible, setGuideVisible] = useState(true)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)

  // Tab-specific state
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([])
  const [isPriceLoading, setIsPriceLoading] = useState(false)
  const [seoResult, setSeoResult] = useState<SeoResult>(null)
  const [isSeoLoading, setIsSeoLoading] = useState(false)
  const [myKeywords, setMyKeywords] = useState('')
  const [catalogResult, setCatalogResult] = useState<CatalogResult>(null)
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [myProducts, setMyProducts] = useState('')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isAlertsLoading, setIsAlertsLoading] = useState(false)
  const [newAlertType, setNewAlertType] = useState('price_drop')
  const [newAlertFreq, setNewAlertFreq] = useState('daily')
  const [newAlertMethod, setNewAlertMethod] = useState('email')
  const [newAlertThreshold, setNewAlertThreshold] = useState('')
  const [compScore, setCompScore] = useState<CompetitiveScore>(null)
  const [myStats, setMyStats] = useState<{ total: number; avgPrice: number; minPrice: number; maxPrice: number; activeProducts: number; withImages: number; withoutImages: number } | null>(null)
  const [myStatsLoading, setMyStatsLoading] = useState(false)
  const [myShopProducts, setMyShopProducts] = useState<{ title: string; body_html: string; tags: string; images: string[]; status: string; price: number }[]>([])

  const { addToast } = useToast()
  useEffect(() => { document.title = "Concurrence | EcomPilot"; }, []);

  const { enabled: featureEnabled, loading: featureLoading } = useFeatureFlag('concurrence')

  /* ─── Fetch ─── */
  const fetchCompetitors = useCallback(async () => {
    try {
      const res = await fetch('/api/concurrence/competitors')
      const data = await res.json()
      setCompetitors(data.competitors || [])
    } catch { /* silent */ }
    setIsLoading(false)
  }, [])

  const fetchMyStats = useCallback(async () => {
    setMyStatsLoading(true)
    try {
      const res = await fetch('/api/shopify/products?limit=250')
      const data = await res.json()
      const prods: { title: string; body_html: string; tags: string; images: string[]; status: string; price: number }[] = data.products || []
      const prices = prods.map(p => p.price).filter(p => p > 0)
      const active = prods.filter(p => p.status === 'active')
      const withImg = prods.filter(p => Array.isArray(p.images) && p.images.length > 0)
      setMyShopProducts(prods)
      setMyStats({
        total: data.total || prods.length,
        avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
        minPrice: prices.length > 0 ? Math.min(...prices) : 0,
        maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
        activeProducts: active.length,
        withImages: withImg.length,
        withoutImages: prods.length - withImg.length,
      })
    } catch { /* silent */ }
    setMyStatsLoading(false)
  }, [])

  useEffect(() => { fetchCompetitors() }, [fetchCompetitors])
  useEffect(() => { fetchMyStats() }, [fetchMyStats])

  useEffect(() => {
    if (!selected) return
    if (activeTab === 'prices') loadPriceHistory()
    if (activeTab === 'alerts') loadAlerts()
    if (activeTab === 'overview' && selected.snapshot) loadCompetitiveScore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, activeTab])

  const loadPriceHistory = async () => {
    if (!selected) return
    setIsPriceLoading(true)
    try {
      const res = await fetch(`/api/concurrence/price-history?competitor_id=${selected.id}`)
      const data = await res.json()
      setPriceHistory(data.history || [])
    } catch { /* silent */ }
    setIsPriceLoading(false)
  }

  const loadAlerts = async () => {
    if (!selected) return
    setIsAlertsLoading(true)
    try {
      const res = await fetch(`/api/concurrence/alerts?competitor_id=${selected.id}`)
      const data = await res.json()
      setAlerts(data.alerts || [])
    } catch { /* silent */ }
    setIsAlertsLoading(false)
  }

  const loadCompetitiveScore = async () => {
    if (!selected?.snapshot) return
    try {
      const res = await fetch('/api/concurrence/competitive-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: selected.id, snapshot: selected.snapshot }),
      })
      const data = await res.json()
      if (!data.error) setCompScore(data)
    } catch { /* silent */ }
  }

  const handleAdd = async () => {
    setGuideVisible(false)
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
          addToast('Tables manquantes — contactez le support', 'error')
        } else {
          addToast(d.error || "Erreur lors de l'ajout", 'error')
        }
        return
      }
      setShowAddModal(false)
      setNewName('')
      setNewUrl('')
      addToast('Concurrent ajouté', 'success')
      fetchCompetitors()
    } catch { addToast('Erreur réseau', 'error') }
    finally { setIsAdding(false) }
  }

  const handleAnalyze = async (competitor: Competitor) => {
    setGuideVisible(false)
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
        products: data.products || [],
        seo: data.seo,
        social: data.social,
        payment: data.payment,
      }
      // Auto-save price history
      if (snapshot.products && snapshot.products.length > 0) {
        const prods = snapshot.products
          .filter(p => p.price !== null)
          .map(p => ({ product_name: p.title, price: p.price as number }))
        if (prods.length > 0) {
          fetch('/api/concurrence/price-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ competitor_id: competitor.id, products: prods }),
          }).catch(() => { /* silent */ })
        }
      }
      const updated = { ...competitor, snapshot, last_analyzed_at: new Date().toISOString() }
      setSelected(updated)
      setCompetitors(prev => prev.map(c => c.id === competitor.id ? updated : c))
      setSeoResult(null)
      setCatalogResult(null)
      setCompScore(null)
      addToast('Analyse terminée', 'success')
    } catch (e: unknown) {
      addToast((e as Error).message || "Erreur lors de l'analyse", 'error')
    }
    finally { setAnalyzingId(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce concurrent ?')) return
    try {
      await fetch('/api/concurrence/competitors', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (selected?.id === id) { setSelected(null); setCompScore(null) }
      setCompetitors(prev => prev.filter(c => c.id !== id))
      addToast('Concurrent supprimé', 'success')
    } catch { addToast('Erreur lors de la suppression', 'error') }
  }

  const handleSeoCompare = async () => {
    if (!selected) return
    setIsSeoLoading(true)
    try {
      const res = await fetch('/api/concurrence/seo-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: selected.id, my_keywords: myKeywords, competitor_snapshot: selected.snapshot }),
      })
      const data = await res.json()
      setSeoResult(data)
      addToast('Comparaison SEO terminée', 'success')
    } catch { setSeoResult(null); addToast('Erreur lors de la comparaison SEO', 'error') }
    setIsSeoLoading(false)
  }

  const handleCatalogCompare = async () => {
    if (!selected) return
    setIsCatalogLoading(true)
    try {
      const res = await fetch('/api/concurrence/catalog-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: selected.id, my_products: myProducts.split('\n').filter(Boolean), competitor_snapshot: selected.snapshot }),
      })
      const data = await res.json()
      setCatalogResult(data)
      addToast('Comparaison catalogue terminée', 'success')
    } catch { setCatalogResult(null); addToast('Erreur lors de la comparaison catalogue', 'error') }
    setIsCatalogLoading(false)
  }

  const handleAddAlert = async () => {
    if (!selected) return
    try {
      const res = await fetch('/api/concurrence/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_id: selected.id, alert_type: newAlertType, threshold_value: newAlertThreshold ? parseFloat(newAlertThreshold) : null, frequency: newAlertFreq, notification_method: newAlertMethod }),
      })
      if (res.ok) { setNewAlertThreshold(''); loadAlerts(); addToast('Alerte créée', 'success') }
      else addToast('Erreur lors de la création de l\'alerte', 'error')
    } catch { addToast('Erreur réseau', 'error') }
  }

  const handleDeleteAlert = async (id: string) => {
    try {
      await fetch('/api/concurrence/alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setAlerts(prev => prev.filter(a => a.id !== id))
      addToast('Alerte supprimée', 'success')
    } catch { addToast('Erreur lors de la suppression', 'error') }
  }

  const selectCompetitor = (c: Competitor) => {
    setGuideVisible(false)
    setSelected(c)
    setActiveTab('overview')
    setCompScore(null)
    setSeoResult(null)
    setCatalogResult(null)
    setShowSidebar(false)
  }

  return (
    <>
    {!featureLoading && !featureEnabled && (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <Lock className="w-12 h-12 mb-4" style={{ color: "#cbd5e1" }} />
        <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Fonctionnalité non disponible</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>L&apos;analyse concurrentielle n&apos;est pas incluse dans votre plan actuel.</p>
        <a href="/dashboard/billing" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium" style={{ color: "#fff" }}>
          Voir les plans
        </a>
      </div>
    )}
    {(featureLoading || featureEnabled) && (
    <div className="flex h-full" style={{ minHeight: 'calc(100vh - 64px)' }}>

      {/* Mobile sidebar backdrop */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <div className={`
        fixed md:static top-0 left-0 h-full z-40 md:z-auto
        w-72 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white
        transition-transform duration-300
        ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
              <Eye className="w-4 h-4 text-blue-500" /> Concurrents
            </h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {competitors.length} concurrent{competitors.length !== 1 ? 's' : ''} suivis
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--text-tertiary)" }}>Chargement...</div>
          ) : competitors.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Eye className="w-8 h-8 mx-auto mb-3" style={{ color: '#d1d5db' }} />
              <p className="text-sm mb-1" style={{ color: "var(--text-tertiary)" }}>Aucun concurrent</p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Ajoutez l&apos;URL d&apos;une boutique concurrente pour commencer le suivi
              </p>
            </div>
          ) : competitors.map(c => (
            <div
              key={c.id}
              onClick={() => selectCompetitor(c)}
              className={`p-3 rounded-xl cursor-pointer border transition-all ${
                selected?.id === c.id
                  ? 'border-blue-200 bg-blue-50'
                  : 'border-transparent bg-gray-50 hover:border-gray-200'
              }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
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
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
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
                style={{ color: "var(--text-secondary)" }}>
                <RefreshCw className={`w-3 h-3 ${analyzingId === c.id ? 'animate-spin' : ''}`} />
                {analyzingId === c.id ? 'Analyse...' : 'Analyser'} · 5 tâches
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col min-w-0">

        <div className="p-4 md:p-6 pb-0">
          <GuideBanner
            visible={guideVisible}
            icon="i"
            title="Analyse concurrence"
            text="Entrez l'URL d'une boutique Shopify concurrente pour comparer ses prix, son catalogue et ses mots-clés avec les vôtres. Vos stats de boutique sont affichées automatiquement en haut de page."
            onClose={() => setGuideVisible(false)}
          />
        </div>

        {/* Mobile header bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 md:hidden">
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5">
            <Eye className="w-3.5 h-3.5" />
            {selected ? selected.name : 'Concurrents'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          {selected && (
            <button onClick={() => handleAnalyze(selected)} disabled={analyzingId === selected.id}
              className="ml-auto border border-gray-200 bg-white rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1 disabled:opacity-50"
              style={{ color: "var(--text-secondary)" }}>
              <RefreshCw className={`w-3 h-3 ${analyzingId === selected.id ? 'animate-spin' : ''}`} />
              Analyser
            </button>
          )}
        </div>

        {!selected ? (
          /* Empty state */
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* Ma boutique */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                <Package className="w-4 h-4 text-blue-500" /> Ma boutique
              </h3>
              {myStatsLoading ? (
                <div className="text-center py-4 text-sm text-gray-400">Chargement...</div>
              ) : myStats ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Produits', value: String(myStats.total), icon: <Package className="w-4 h-4" style={{ color: '#2563eb' }} /> },
                    { label: 'Prix moyen', value: myStats.avgPrice > 0 ? `${myStats.avgPrice.toFixed(2)}€` : 'N/A', icon: <Tag className="w-4 h-4" style={{ color: '#7c3aed' }} /> },
                    { label: 'Prix min', value: myStats.minPrice > 0 ? `${myStats.minPrice.toFixed(2)}€` : 'N/A', icon: <TrendingDown className="w-4 h-4" style={{ color: '#059669' }} /> },
                    { label: 'Prix max', value: myStats.maxPrice > 0 ? `${myStats.maxPrice.toFixed(2)}€` : 'N/A', icon: <TrendingUp className="w-4 h-4" style={{ color: '#ef4444' }} /> },
                    { label: 'Actifs', value: String(myStats.activeProducts), icon: <CheckCircle className="w-4 h-4" style={{ color: '#059669' }} /> },
                    { label: 'Avec images', value: String(myStats.withImages), icon: <Eye className="w-4 h-4" style={{ color: '#2563eb' }} /> },
                    { label: 'Sans images', value: String(myStats.withoutImages), icon: <AlertTriangle className="w-4 h-4" style={{ color: myStats.withoutImages > 0 ? '#f59e0b' : '#059669' }} /> },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1">{kpi.icon}<span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</span></div>
                      <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            {/* SEO score per product */}
            {myShopProducts.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                  <Search className="w-4 h-4 text-blue-500" /> Score SEO par produit
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {myShopProducts.map((prod, i) => {
                    const { score, issues } = scoreSEO(prod)
                    const color = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#dc2626'
                    return (
                      <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <svg width="44" height="44" viewBox="0 0 44 44" className="flex-shrink-0">
                          <circle cx="22" cy="22" r="18" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                          <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="4"
                            strokeDasharray={`${(score / 100) * 113.1} 113.1`}
                            strokeLinecap="round" transform="rotate(-90 22 22)" />
                          <text x="22" y="26" textAnchor="middle" fontSize="12" fontWeight="bold" fill={color}>{score}</text>
                        </svg>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{prod.title}</p>
                          {issues.length > 0 && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{issues.join(' · ')}</p>
                          )}
                        </div>
                        <a href="/dashboard/products" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0">
                          Optimiser
                        </a>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <div className="flex flex-col items-center justify-center text-center px-8 py-8">
              <Eye className="w-16 h-16 mb-4" style={{ color: '#d1d5db' }} />
              <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Analyse concurrentielle</h3>
              <p className="max-w-md text-sm" style={{ color: "var(--text-tertiary)" }}>
                Sélectionnez un concurrent dans la liste pour voir les résultats.
              </p>
              {competitors.length === 0 && (
                <button onClick={() => setShowAddModal(true)}
                  className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 text-sm">
                  + Ajouter mon premier concurrent
                </button>
              )}
              {competitors.length > 0 && (
                <button onClick={() => setShowSidebar(true)}
                  className="mt-4 text-blue-600 text-sm flex items-center gap-1 md:hidden">
                  <Eye className="w-4 h-4" /> Voir la liste
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop header */}
            <div className="hidden md:flex items-center justify-between p-5 bg-white border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  {selected.name}
                  <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                  {selected.last_analyzed_at ? `Dernière analyse : ${new Date(selected.last_analyzed_at).toLocaleString('fr-FR')}` : 'Pas encore analysé'}
                </p>
              </div>
              <button onClick={() => handleAnalyze(selected)} disabled={analyzingId === selected.id}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${analyzingId === selected.id ? 'animate-spin' : ''}`} />
                {analyzingId === selected.id ? 'Analyse...' : 'Ré-analyser'}
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-gray-200 bg-white overflow-x-auto">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* No snapshot warning */}
            {!selected.snapshot && activeTab !== 'alerts' && (
              <div className="flex flex-col items-center justify-center flex-1 text-center px-8 py-16">
                <RefreshCw className="w-12 h-12 mb-4" style={{ color: '#1d4ed8' }} />
                <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                  {selected.name} n&apos;a pas encore été analysé
                </h3>
                <p className="mb-6 text-sm" style={{ color: "var(--text-tertiary)" }}>Lancez l&apos;analyse pour voir les produits, prix, SEO et recommandations.</p>
                <button onClick={() => handleAnalyze(selected)} disabled={analyzingId === selected.id}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 text-sm">
                  <RefreshCw className={`w-4 h-4 ${analyzingId === selected.id ? 'animate-spin' : ''}`} />
                  {analyzingId === selected.id ? 'Analyse en cours...' : "Lancer l'analyse"}
                </button>
              </div>
            )}

            {selected.snapshot && (
              <div className="flex-1 overflow-y-auto">
                {/* TAB: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="p-4 md:p-6 space-y-5">
                    {/* Ma boutique vs Concurrent */}
                    {myStats && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                          <Package className="w-4 h-4 text-blue-500" /> Comparaison avec ma boutique
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 rounded-xl p-4">
                            <div className="text-xs font-bold mb-3 text-blue-600">Ma boutique</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs"><span style={{ color: "var(--text-tertiary)" }}>Produits</span><span className="font-bold" style={{ color: "var(--text-primary)" }}>{myStats.total}</span></div>
                              <div className="flex justify-between text-xs"><span style={{ color: "var(--text-tertiary)" }}>Prix moyen</span><span className="font-bold" style={{ color: "var(--text-primary)" }}>{myStats.avgPrice > 0 ? `${myStats.avgPrice.toFixed(2)}€` : '—'}</span></div>
                              <div className="flex justify-between text-xs"><span style={{ color: "var(--text-tertiary)" }}>Prix min</span><span className="font-bold" style={{ color: "#059669" }}>{myStats.minPrice > 0 ? `${myStats.minPrice.toFixed(2)}€` : '—'}</span></div>
                              <div className="flex justify-between text-xs"><span style={{ color: "var(--text-tertiary)" }}>Prix max</span><span className="font-bold" style={{ color: "#ef4444" }}>{myStats.maxPrice > 0 ? `${myStats.maxPrice.toFixed(2)}€` : '—'}</span></div>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="text-xs font-bold mb-3 text-gray-500">{selected.name}</div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs"><span style={{ color: "var(--text-tertiary)" }}>Produits</span><span className="font-bold" style={{ color: "var(--text-primary)" }}>{selected.snapshot?.products_found ?? '—'}</span></div>
                              <div className="flex justify-between text-xs"><span style={{ color: "var(--text-tertiary)" }}>Prix moyen</span><span className="font-bold" style={{ color: "var(--text-primary)" }}>{selected.snapshot?.avg_price ? `${selected.snapshot.avg_price.toFixed(2)}€` : '—'}</span></div>
                              <div className="flex justify-between text-xs"><span style={{ color: "var(--text-tertiary)" }}>Prix min</span><span className="font-bold" style={{ color: "#059669" }}>—</span></div>
                              <div className="flex justify-between text-xs"><span style={{ color: "var(--text-tertiary)" }}>Promos</span><span className="font-bold" style={{ color: selected.snapshot?.promo_detected ? '#ef4444' : '#059669' }}>{selected.snapshot?.promo_detected ? 'Actives' : 'Aucune'}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Auto-detected opportunities */}
                    {myStats && selected.snapshot && (() => {
                      const opps: { icon: string; text: string; type: 'warning' | 'success' | 'info' }[] = []
                      const priceDiff = myStats.avgPrice - (selected.snapshot!.avg_price || 0)
                      const pricePct = myStats.avgPrice > 0 ? (priceDiff / myStats.avgPrice) * 100 : 0
                      if (pricePct > 15) opps.push({ icon: '💰', text: `Vos prix sont ${pricePct.toFixed(0)}% plus élevés que ${selected.name}`, type: 'warning' })
                      else if (pricePct < -15) opps.push({ icon: '✅', text: `Vos prix sont ${Math.abs(pricePct).toFixed(0)}% moins chers que ${selected.name}`, type: 'success' })
                      const prodDiff = (selected.snapshot!.products_found || 0) - myStats.total
                      if (prodDiff > 10) opps.push({ icon: '📦', text: `${selected.name} propose ${prodDiff} produits de plus — pensez à enrichir votre catalogue`, type: 'info' })
                      if (selected.snapshot!.promo_detected) opps.push({ icon: '🏷️', text: `${selected.name} a des promotions actives — envisagez une stratégie de prix`, type: 'warning' })
                      if (myStats.withoutImages > 0) opps.push({ icon: '📸', text: `${myStats.withoutImages} de vos produits n'ont pas d'image`, type: 'warning' })
                      if (opps.length === 0) return null
                      return (
                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                            💡 Opportunités détectées
                          </h3>
                          <div className="space-y-2">
                            {opps.map((o, i) => (
                              <div key={i} className={`flex gap-3 p-3 rounded-lg text-sm ${o.type === 'warning' ? 'bg-amber-50' : o.type === 'success' ? 'bg-green-50' : 'bg-blue-50'}`}>
                                <span className="flex-shrink-0">{o.icon}</span>
                                <span style={{ color: "var(--text-secondary)" }}>{o.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                    {compScore && (
                      <div className="rounded-xl p-5 border"
                        style={{ backgroundColor: THREAT_COLORS[compScore.threat_level].bg, borderColor: THREAT_COLORS[compScore.threat_level].border }}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="w-4 h-4" style={{ color: THREAT_COLORS[compScore.threat_level].text }} />
                              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Score de menace concurrentielle</h3>
                            </div>
                            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{compScore.summary}</p>
                          </div>
                          <div className="text-center flex-shrink-0">
                            <div className="text-3xl font-black" style={{ color: THREAT_COLORS[compScore.threat_level].text }}>{compScore.score}</div>
                            <div className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${THREAT_COLORS[compScore.threat_level].badge}`}>{compScore.threat_label}</div>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {Object.entries(compScore.breakdown).map(([key, val]) => (
                            <div key={key} className="bg-white/60 rounded-lg p-2 text-center">
                              <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{val.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: 'Produits détectés', value: String(selected.snapshot.products_found || 0), icon: <Package className="w-4 h-4" style={{ color: '#2563eb' }} /> },
                        { label: 'Prix moyen', value: selected.snapshot.avg_price ? `${selected.snapshot.avg_price.toFixed(2)}€` : 'N/A', icon: <Tag className="w-4 h-4" style={{ color: '#7c3aed' }} /> },
                        { label: 'Note', value: selected.snapshot.avg_rating ? `${selected.snapshot.avg_rating}/5` : 'N/A', icon: <Star className="w-4 h-4" style={{ color: '#f59e0b' }} /> },
                        { label: 'Promotions', value: selected.snapshot.promo_detected ? ' Actives' : 'Aucune', icon: <Bell className="w-4 h-4" style={{ color: '#ef4444' }} /> },
                      ].map((kpi, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-1">{kpi.icon}<span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{kpi.label}</span></div>
                          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{kpi.value}</p>
                        </div>
                      ))}
                    </div>
                    {(selected.snapshot.price_changes?.length > 0 || selected.snapshot.new_products?.length > 0 || selected.snapshot.removed_products?.length > 0) && (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
                          <AlertTriangle className="w-4 h-4" style={{ color: '#f59e0b' }} /> Changements détectés
                        </h3>
                        <div className="space-y-2">
                          {selected.snapshot.price_changes?.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg text-sm bg-blue-50">
                              {c.direction === 'down' ? <TrendingDown className="w-4 h-4 flex-shrink-0 text-red-500" /> : <TrendingUp className="w-4 h-4 flex-shrink-0 text-green-600" />}
                              <span style={{ color: "var(--text-secondary)" }}>
                                <strong>{c.product}</strong> : {c.old_price}€ → <strong>{c.new_price}€</strong>
                                {c.old_price && c.new_price && (
                                  <span className={`ml-2 text-xs font-bold ${c.direction === 'down' ? 'text-red-500' : 'text-green-600'}`}>
                                    {c.direction === 'down' ? '↓' : '↑'} {Math.abs(((c.new_price - c.old_price) / c.old_price) * 100).toFixed(0)}%
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                          {selected.snapshot.new_products?.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg text-sm bg-green-50">
                              <span style={{ color: '#059669', fontWeight: 700 }}>NEW</span>
                              <span style={{ color: "var(--text-secondary)" }}>Nouveau : <strong>{p}</strong></span>
                            </div>
                          ))}
                          {selected.snapshot.removed_products?.map((p, i) => (
                            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg text-sm bg-red-50">
                              <span style={{ color: '#ef4444', fontWeight: 700 }}></span>
                              <span style={{ color: "var(--text-secondary)" }}>Retiré : <strong>{p}</strong></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selected.snapshot.insights?.length > 0 && (
                      <div className="rounded-xl p-5 border" style={{ background: 'linear-gradient(135deg,#eff6ff,#eef2ff)', borderColor: '#bfdbfe' }}>
                        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: "#93c5fd" }}> Recommandations IA</h3>
                        <div className="space-y-2">
                          {selected.snapshot.insights.map((insight, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-white rounded-lg text-sm" style={{ color: "var(--text-secondary)" }}>
                              <span className="font-bold flex-shrink-0" style={{ color: '#2563eb' }}>{i + 1}.</span>
                              <span>{insight}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(selected.snapshot.social || selected.snapshot.payment) && (
                      <div className="grid grid-cols-2 gap-4">
                        {selected.snapshot.social && (
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}> Réseaux sociaux</h4>
                            {[{ label: 'Facebook', val: selected.snapshot.social.facebook }, { label: 'Instagram', val: selected.snapshot.social.instagram }, { label: 'TikTok', val: selected.snapshot.social.tiktok }].map(s => (
                              <div key={s.label} className="flex items-center justify-between text-xs py-0.5">
                                <span style={{ color: "var(--text-tertiary)" }}>{s.label}</span>
                                <span style={{ color: s.val ? '#059669' : '#d1d5db' }}>{s.val ? '' : ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {selected.snapshot.payment && (
                          <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}> Paiement</h4>
                            {[{ label: 'PayPal', val: selected.snapshot.payment.paypal }, { label: 'Stripe', val: selected.snapshot.payment.stripe }, { label: 'Klarna', val: selected.snapshot.payment.klarna }].map(p => (
                              <div key={p.label} className="flex items-center justify-between text-xs py-0.5">
                                <span style={{ color: "var(--text-tertiary)" }}>{p.label}</span>
                                <span style={{ color: p.val ? '#059669' : '#d1d5db' }}>{p.val ? '' : ''}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {selected.snapshot.shipping_info && selected.snapshot.shipping_info !== 'Non détecté' && (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h3 className="font-semibold mb-1 text-sm" style={{ color: "var(--text-primary)" }}> Livraison</h3>
                        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>{selected.snapshot.shipping_info}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: PRICES */}
                {activeTab === 'prices' && (
                  <div className="p-4 md:p-6 space-y-5">
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="font-semibold mb-1 text-sm" style={{ color: "var(--text-primary)" }}> Suivi des prix</h3>
                      <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Historique des prix enregistrés automatiquement à chaque analyse.</p>
                      {isPriceLoading ? (
                        <div className="text-center py-8 text-sm text-gray-400">Chargement...</div>
                      ) : priceHistory.length === 0 ? (
                        <div className="text-center py-8">
                          <BarChart2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Aucun historique de prix</p>
                          <p className="text-xs mt-1" style={{ color: '#cbd5e1' }}>Lancez une analyse pour commencer le suivi</p>
                        </div>
                      ) : (() => {
                        const prices = priceHistory.map(p => p.price)
                        const min = Math.min(...prices)
                        const max = Math.max(...prices)
                        const avg = prices.reduce((a, b) => a + b, 0) / prices.length
                        const byProduct: Record<string, PricePoint[]> = {}
                        priceHistory.forEach(p => { if (!byProduct[p.product_name]) byProduct[p.product_name] = []; byProduct[p.product_name].push(p) })
                        return (
                          <>
                            <div className="grid grid-cols-3 gap-3 mb-4">
                              {[{ label: 'Prix min', value: `${min.toFixed(2)}€` }, { label: 'Prix moyen', value: `${avg.toFixed(2)}€` }, { label: 'Prix max', value: `${max.toFixed(2)}€` }].map((s, i) => (
                                <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                                  <div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{s.value}</div>
                                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.label}</div>
                                </div>
                              ))}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead><tr className="bg-gray-50 border-b border-gray-100">
                                  <th className="text-left p-2 font-semibold" style={{ color: "var(--text-tertiary)" }}>Produit</th>
                                  <th className="text-right p-2 font-semibold" style={{ color: "var(--text-tertiary)" }}>Dernier prix</th>
                                  <th className="text-right p-2 font-semibold" style={{ color: "var(--text-tertiary)" }}>Enregistrements</th>
                                  <th className="text-right p-2 font-semibold hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>MAJ</th>
                                </tr></thead>
                                <tbody>
                                  {Object.entries(byProduct).slice(0, 30).map(([name, points]) => {
                                    const latest = points[points.length - 1]
                                    const first = points[0]
                                    const trend = points.length > 1 ? (latest.price < first.price ? 'down' : latest.price > first.price ? 'up' : 'flat') : 'flat'
                                    return (
                                      <tr key={name} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="p-2" style={{ color: "var(--text-secondary)" }}>{name.length > 40 ? name.slice(0, 40) + '…' : name}</td>
                                        <td className="p-2 text-right font-semibold" style={{ color: '#059669' }}>
                                          {latest.price.toFixed(2)}€
                                          {trend === 'down' && <TrendingDown className="inline w-3 h-3 ml-1 text-red-500" />}
                                          {trend === 'up' && <TrendingUp className="inline w-3 h-3 ml-1 text-green-600" />}
                                        </td>
                                        <td className="p-2 text-right" style={{ color: "var(--text-tertiary)" }}>{points.length}</td>
                                        <td className="p-2 text-right hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>{new Date(latest.recorded_at).toLocaleDateString('fr-FR')}</td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                    {selected.snapshot.products && selected.snapshot.products.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="font-semibold mb-3 text-sm" style={{ color: "var(--text-primary)" }}>Produits actuels ({selected.snapshot.products.length})</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left p-2 font-semibold" style={{ color: "var(--text-tertiary)" }}>Produit</th>
                              <th className="text-right p-2 font-semibold" style={{ color: "var(--text-tertiary)" }}>Prix</th>
                            </tr></thead>
                            <tbody>
                              {selected.snapshot.products.slice(0, 30).map((p, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                                  <td className="p-2" style={{ color: "var(--text-secondary)" }}>{p.title}</td>
                                  <td className="p-2 text-right font-semibold" style={{ color: '#059669' }}>{p.price !== null ? `${p.price.toFixed(2)}€` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: SEO */}
                {activeTab === 'seo' && (
                  <div className="p-4 md:p-6 space-y-5">
                    {selected.snapshot.seo && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="font-semibold mb-3 text-sm" style={{ color: "var(--text-primary)" }}> Données SEO détectées</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Title tag</div>
                            <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{selected.snapshot.seo.title_tag || 'Non détecté'}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Meta description</div>
                            <div className="text-sm font-semibold" style={{ color: selected.snapshot.seo.has_meta_description ? '#059669' : '#ef4444' }}>
                              {selected.snapshot.seo.has_meta_description ? ' Présente' : ' Absente'}
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Balises H1</div>
                            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{selected.snapshot.seo.h1_count ?? '?'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="font-semibold mb-1 text-sm" style={{ color: "var(--text-primary)" }}> Comparaison SEO par IA</h3>
                      <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Entrez vos mots-clés pour obtenir une analyse comparative.</p>
                      <textarea value={myKeywords} onChange={e => setMyKeywords(e.target.value)}
                        placeholder="Entrez vos mots-clés..."
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400"
                        style={{ color: "var(--text-primary)", minHeight: '80px' }} />
                      <button onClick={handleSeoCompare} disabled={isSeoLoading}
                        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                        {isSeoLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Analyse IA...</> : <><Search className="w-3.5 h-3.5" />Analyser le SEO</>}
                      </button>
                    </div>
                    {seoResult && (
                      <div className="space-y-4">
                        {seoResult.score && (
                          <div className="bg-white border border-gray-200 rounded-xl p-5">
                            <h4 className="font-semibold mb-3 text-sm" style={{ color: "var(--text-primary)" }}>Score SEO comparatif</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-black text-blue-600">{seoResult.score.me}</div>
                                <div className="text-xs text-blue-500 font-medium">Ma boutique</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-black text-gray-600">{seoResult.score.competitor}</div>
                                <div className="text-xs text-gray-500 font-medium">{selected.name}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {([
                          { title: ' Points forts du concurrent', items: seoResult.competitor_strengths, color: '#fef3c7', border: '#fde68a' },
                          { title: ' Mes opportunités SEO', items: seoResult.my_opportunities, color: '#f0fdf4', border: '#bbf7d0' },
                          { title: ' Mots-clés manquants', items: seoResult.keyword_gaps, color: '#eff6ff', border: '#bfdbfe' },
                          { title: ' Actions rapides', items: seoResult.quick_wins, color: '#faf5ff', border: '#e9d5ff' },
                        ] as { title: string; items: string[]; color: string; border: string }[]).map(({ title, items, color, border }) => items?.length > 0 && (
                          <div key={title} className="rounded-xl p-4 border" style={{ backgroundColor: color, borderColor: border }}>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: "var(--text-primary)" }}>{title}</h4>
                            <ul className="space-y-1.5">{items.map((item, i) => <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text-secondary)" }}><span className="flex-shrink-0">•</span>{item}</li>)}</ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: CATALOG */}
                {activeTab === 'catalog' && (
                  <div className="p-4 md:p-6 space-y-5">
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                      <h3 className="font-semibold mb-1 text-sm" style={{ color: "var(--text-primary)" }}> Analyse des gaps catalogue</h3>
                      <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Comparez vos catalogues pour identifier les opportunités manquées.</p>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Mes produits (un par ligne)</label>
                      <textarea value={myProducts} onChange={e => setMyProducts(e.target.value)}
                        placeholder={"Produit A\nProduit B\nProduit C..."}
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400"
                        style={{ color: "var(--text-primary)", minHeight: '100px' }} />
                      <button onClick={handleCatalogCompare} disabled={isCatalogLoading}
                        className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                        {isCatalogLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Analyse IA...</> : <><BookOpen className="w-3.5 h-3.5" />Analyser les catalogues</>}
                      </button>
                    </div>
                    {selected.snapshot.products_found > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="font-semibold mb-2 text-sm" style={{ color: "var(--text-primary)" }}>Produits concurrent : {selected.snapshot.products_found}</h4>
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Prix moyen : {selected.snapshot.avg_price ? `${selected.snapshot.avg_price.toFixed(2)}€` : 'N/A'}</p>
                      </div>
                    )}
                    {catalogResult && (
                      <div className="space-y-4">
                        <div className="bg-white border border-blue-200 rounded-xl p-4 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Score d&apos;opportunité catalogue</div>
                            <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{catalogResult.price_positioning}</div>
                          </div>
                          <div className="text-3xl font-black text-blue-600">{catalogResult.opportunity_score}</div>
                        </div>
                        {([
                          { title: ' Catégories manquantes', items: catalogResult.missing_categories, color: '#fef2f2', border: '#fecaca' },
                          { title: ' Mes exclusivités', items: catalogResult.unique_to_me, color: '#f0fdf4', border: '#bbf7d0' },
                          { title: ' Recommandations', items: catalogResult.recommendations, color: '#eff6ff', border: '#bfdbfe' },
                        ] as { title: string; items: string[]; color: string; border: string }[]).map(({ title, items, color, border }) => items?.length > 0 && (
                          <div key={title} className="rounded-xl p-4 border" style={{ backgroundColor: color, borderColor: border }}>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: "var(--text-primary)" }}>{title}</h4>
                            <ul className="space-y-1.5">{items.map((item, i) => <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text-secondary)" }}><span className="flex-shrink-0">•</span>{item}</li>)}</ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB: ALERTS — always visible when competitor selected */}
            {activeTab === 'alerts' && (
              <div className="p-4 md:p-6 space-y-5">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-semibold mb-1 text-sm" style={{ color: "var(--text-primary)" }}> Configurer une alerte</h3>
                  <p className="text-xs mb-4" style={{ color: "var(--text-tertiary)" }}>Soyez notifié des changements de ce concurrent.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Type d&apos;alerte</label>
                      <select value={newAlertType} onChange={e => setNewAlertType(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" style={{ color: "var(--text-secondary)" }}>
                        <option value="price_drop">Baisse de prix</option>
                        <option value="price_increase">Hausse de prix</option>
                        <option value="new_product">Nouveau produit</option>
                        <option value="out_of_stock">Rupture de stock</option>
                        <option value="seo_change">Changement SEO</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Seuil (€, optionnel)</label>
                      <input type="number" value={newAlertThreshold} onChange={e => setNewAlertThreshold(e.target.value)}
                        placeholder="ex: 5.00"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-blue-400" style={{ color: "var(--text-secondary)" }} />
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Fréquence</label>
                      <select value={newAlertFreq} onChange={e => setNewAlertFreq(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" style={{ color: "var(--text-secondary)" }}>
                        <option value="immediate">Immédiat</option>
                        <option value="daily">Quotidien</option>
                        <option value="weekly">Hebdomadaire</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Notification</label>
                      <select value={newAlertMethod} onChange={e => setNewAlertMethod(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" style={{ color: "var(--text-secondary)" }}>
                        <option value="email">Email</option>
                        <option value="dashboard">Dashboard</option>
                        <option value="both">Les deux</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleAddAlert}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5" /> Créer l&apos;alerte
                  </button>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="font-semibold mb-3 text-sm" style={{ color: "var(--text-primary)" }}>Alertes actives</h3>
                  {isAlertsLoading ? (
                    <div className="text-center py-4 text-sm text-gray-400">Chargement...</div>
                  ) : alerts.length === 0 ? (
                    <div className="text-center py-6">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Aucune alerte configurée</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map(alert => {
                        const typeLabels: Record<string, string> = { price_drop: 'Baisse prix', price_increase: 'Hausse prix', new_product: 'Nouveau produit', out_of_stock: 'Rupture stock', seo_change: 'Changement SEO' }
                        const freqLabels: Record<string, string> = { immediate: 'Immédiat', daily: 'Quotidien', weekly: 'Hebdomadaire' }
                        return (
                          <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg border ${alert.is_active ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}>
                            <div>
                              <div className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                                {typeLabels[alert.alert_type] || alert.alert_type}
                                {alert.threshold_value && <span className="ml-2 text-xs text-gray-500">seuil: {alert.threshold_value}€</span>}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                                {freqLabels[alert.frequency] || alert.frequency} · {alert.notification_method === 'both' ? 'Email + Dashboard' : alert.notification_method === 'email' ? 'Email' : 'Dashboard'}
                              </div>
                            </div>
                            <button onClick={() => handleDeleteAlert(alert.id)} className="text-gray-300 hover:text-red-500 ml-2 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ADD COMPETITOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Ajouter un concurrent</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-tertiary)" }}>Entrez l&apos;URL de la boutique à surveiller.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Nom du concurrent</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ex: Boutique concurrente"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-blue-500" style={{ color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>URL de la boutique</label>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.myshopify.com"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:border-blue-500" style={{ color: "var(--text-primary)" }} />
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>Shopify, WooCommerce ou toute page produit</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setNewName(''); setNewUrl('') }}
                className="flex-1 border border-gray-300 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50" style={{ color: "var(--text-secondary)" }}>
                Annuler
              </button>
              <button onClick={handleAdd} disabled={isAdding || !newName || !newUrl}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {isAdding ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )}
    </>
  )
}
