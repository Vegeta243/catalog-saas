const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'app', '(dashboard)', 'dashboard', 'import', 'page.tsx')

const content = `'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  X,
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
  Link2,
  History,
  RefreshCw,
} from 'lucide-react'
import { FeatureHelp } from '@/components/feature-help'

const PLATFORMS = [
  {
    id: 'aliexpress',
    name: 'AliExpress',
    emoji: '\\u{1F6D2}',
    bg: 'bg-red-500/15',
    border: 'border-red-500/30',
    text: 'text-red-300',
    example: 'https://www.aliexpress.com/item/...',
  },
  {
    id: 'cjdropshipping',
    name: 'CJDropshipping',
    emoji: '\\u{1F4E6}',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    example: 'https://cjdropshipping.com/product/...',
  },
  {
    id: 'dhgate',
    name: 'DHgate',
    emoji: '\\u{1F3ED}',
    bg: 'bg-green-500/15',
    border: 'border-green-500/30',
    text: 'text-green-300',
    example: 'https://www.dhgate.com/product/...',
  },
  {
    id: 'alibaba',
    name: 'Alibaba',
    emoji: '\\u{1F310}',
    bg: 'bg-yellow-500/15',
    border: 'border-yellow-500/30',
    text: 'text-yellow-300',
    example: 'https://www.alibaba.com/product-detail/...',
  },
  {
    id: 'banggood',
    name: 'Banggood',
    emoji: '\\u26A1',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    example: 'https://www.banggood.com/...',
  },
  {
    id: 'other',
    name: 'Autre site',
    emoji: '\\u{1F517}',
    bg: 'bg-slate-700/50',
    border: 'border-slate-600',
    text: 'text-slate-300',
    example: 'Toute URL produit e-commerce',
  },
]

type ImportResultItem = {
  url: string
  success: boolean
  title?: string
  price?: number
  image?: string | null
  images?: number
  shopify_id?: string
  platform?: string
  error?: string
}

type PreviewData = {
  platform: string
  success: boolean
  product?: {
    title: string
    price: number
    images: string[]
    description: string
    vendor: string
  }
  error?: string
}

type HistoryJob = {
  id: string
  platform: string
  status: string
  imported_count: number
  total_products: number
  failed_count: number
  created_at: string
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const IMPORT_HELP_STEPS = [
  {
    title: 'Copiez une URL',
    description: "Ouvrez un produit sur AliExpress, CJDropshipping, DHgate etc. et copiez l'URL depuis la barre d'adresse.",
  },
  {
    title: 'Collez dans le champ',
    description: 'Collez dans le champ ci-dessous. Utilisez "Coller en masse" pour plusieurs URLs en meme temps.',
  },
  {
    title: 'Previsualiser',
    description: 'Cliquez sur Previsualiser pour verifier le titre, prix et images avant import.',
  },
  {
    title: 'Importer',
    description: 'Cliquez sur Importer - le produit est ajoute a votre catalogue et synchronise avec Shopify si connecte.',
  },
]

export default function BulkImportPage() {
  const [urls, setUrls] = useState<string[]>([''])
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<ImportResultItem[]>([])
  const [pushToShopify, setPushToShopify] = useState(false)
  const [shopifyStatus, setShopifyStatus] = useState<'checking' | 'connected' | 'none'>('checking')
  const [tab, setTab] = useState<'import' | 'history'>('import')
  const [history, setHistory] = useState<HistoryJob[]>([])
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pasteText, setPasteText] = useState('')

  useEffect(() => {
    document.title = 'Import produits — EcomPilot Elite'
    loadHistory()
    checkShopify()
  }, [])

  async function checkShopify() {
    try {
      const res = await fetch('/api/shopify/products?limit=1')
      if (res.ok) {
        setShopifyStatus('connected')
        setPushToShopify(true)
      } else {
        setShopifyStatus('none')
      }
    } catch {
      setShopifyStatus('none')
    }
  }

  async function loadHistory() {
    try {
      const res = await fetch('/api/import/history')
      if (res.ok) {
        const data = await res.json()
        setHistory(data.jobs || [])
      }
    } catch {
      // ignore
    }
  }

  function addUrl() {
    setUrls(prev => [...prev, ''])
  }

  function removeUrl(i: number) {
    setUrls(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateUrl(i: number, value: string) {
    setUrls(prev => {
      const next = [...prev]
      next[i] = value
      return next
    })
  }

  function handlePasteConfirm() {
    const lines = pasteText
      .split('\\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.startsWith('http'))
      .slice(0, 50)
    if (lines.length > 0) {
      setUrls(lines)
      setShowPasteModal(false)
      setPasteText('')
    }
  }

  async function handlePreview() {
    const url = urls.find(u => u.trim().startsWith('http'))
    if (!url) return
    setPreviewLoading(true)
    setPreview(null)
    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      setPreview(data)
    } catch {
      setPreview({ platform: 'unknown', success: false, error: 'Erreur de connexion' })
    }
    setPreviewLoading(false)
  }

  async function handleImport() {
    const validUrls = urls.filter(u => u.trim().startsWith('http'))
    if (validUrls.length === 0) return

    setImporting(true)
    setResults([])
    setProgress(0)

    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 100 / validUrls.length / 3, 90))
    }, 800)

    try {
      const res = await fetch('/api/import/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: validUrls,
          push_to_shopify: pushToShopify && shopifyStatus === 'connected',
        }),
      })

      const data = await res.json()
      clearInterval(interval)
      setProgress(100)

      if (data.results) {
        setResults(data.results)
        loadHistory()
      }
    } catch {
      clearInterval(interval)
      setResults([{ url: '', success: false, error: 'Erreur de connexion au serveur' }])
    }

    setTimeout(() => {
      setImporting(false)
      setProgress(0)
    }, 500)
  }

  const validCount = urls.filter(u => u.trim().startsWith('http')).length
  const pasteUrlCount = pasteText.split('\\n').filter(l => l.trim().startsWith('http')).length

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Paste modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-white font-black text-lg mb-2">Coller vos URLs en masse</h3>
            <p className="text-slate-400 text-sm mb-4">Une URL par ligne (max 50)</p>
            <textarea
              className="w-full h-48 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl p-3 resize-none focus:border-blue-500 focus:outline-none"
              placeholder="https://www.aliexpress.com/item/..."
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setShowPasteModal(false); setPasteText('') }}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handlePasteConfirm}
                disabled={pasteUrlCount === 0}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-40"
              >
                {pasteUrlCount > 0 ? 'Importer ' + pasteUrlCount + ' URL(s)' : 'Importer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Import de produits</h1>
        <p className="text-slate-400">
          Importez depuis AliExpress, CJDropshipping, DHgate, Alibaba, Banggood et plus encore.
        </p>
      </div>

      {/* Feature Help */}
      <FeatureHelp
        title="Import de produits"
        description="Importez des produits depuis n'importe quelle plateforme en quelques secondes"
        steps={IMPORT_HELP_STEPS}
      />

      {/* Platform badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PLATFORMS.map(p => (
          <div
            key={p.id}
            className={'flex items-center gap-2 px-3 py-2 ' + p.bg + ' border ' + p.border + ' rounded-xl'}
          >
            <span className="text-base">{p.emoji}</span>
            <span className={'text-sm font-bold ' + p.text}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-800">
        {[
          { id: 'import', label: 'Nouvel import' },
          { id: 'history', label: 'Historique' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'import' | 'history')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors -mb-px',
              tab === t.id
                ? 'border-blue-500 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            {t.id === 'import'
              ? <Upload className="w-4 h-4" />
              : <History className="w-4 h-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Import tab */}
      {tab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: URL input + options */}
          <div className="space-y-4">
            {/* URL input */}
            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-white">URLs a importer</h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                  {validCount}/50 URL{validCount > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                {urls.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={e => updateUrl(i, e.target.value)}
                      placeholder={i === 0 ? 'https://www.aliexpress.com/item/...' : 'URL produit...'}
                      className="flex-1 bg-slate-900 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:border-blue-500 focus:outline-none placeholder:text-slate-600"
                    />
                    {urls.length > 1 && (
                      <button
                        onClick={() => removeUrl(i)}
                        className="p-2.5 text-slate-500 hover:text-red-400 transition-colors rounded-xl hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addUrl}
                  disabled={urls.length >= 50}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
                <button
                  onClick={() => setShowPasteModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  <Link2 className="w-4 h-4" />
                  Coller en masse
                </button>
              </div>
            </div>

            {/* Shopify options */}
            <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5">
              <h3 className="font-bold text-white text-sm mb-4">Options</h3>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <div
                    onClick={() => {
                      if (shopifyStatus === 'none') {
                        window.location.href = '/dashboard/shops'
                        return
                      }
                      setPushToShopify(v => !v)
                    }}
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors relative flex-shrink-0',
                      pushToShopify && shopifyStatus === 'connected'
                        ? 'bg-blue-600 cursor-pointer'
                        : shopifyStatus === 'none'
                        ? 'bg-slate-700 cursor-not-allowed'
                        : 'bg-slate-700 cursor-pointer'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
                        pushToShopify && shopifyStatus === 'connected'
                          ? 'translate-x-5'
                          : 'translate-x-1'
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Synchroniser avec Shopify</p>
                    <p className={cn('text-xs',
                      shopifyStatus === 'connected' ? 'text-green-400' : 'text-slate-500')}>
                      {shopifyStatus === 'checking'
                        ? 'Verification...'
                        : shopifyStatus === 'connected'
                        ? 'Boutique connectee'
                        : 'Aucune boutique — Cliquer pour connecter'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={previewLoading || validCount === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-40"
              >
                {previewLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Package className="w-4 h-4" />
                )}
                Previsualiser
              </button>

              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-sm transition-colors disabled:opacity-40"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importation...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Importer {validCount > 0 ? '(' + validCount + ')' : ''}
                  </>
                )}
              </button>
            </div>

            {/* Progress bar */}
            {importing && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Importation en cours...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: progress + '%' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview + Results */}
          <div className="space-y-4">
            {/* Preview */}
            {preview && (
              <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5">
                <h3 className="font-black text-white mb-4 flex items-center gap-2">
                  {preview.success ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  Previsualisation
                </h3>

                {preview.success && preview.product ? (
                  <div>
                    <div className="w-full h-48 rounded-xl mb-3 overflow-hidden border border-slate-700 bg-slate-900 flex items-center justify-center">
                      {preview.product.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview.product.images[0]}
                          alt={preview.product.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const t = e.target as HTMLImageElement
                            t.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="text-slate-600 text-center">
                          <Package className="w-10 h-10 mx-auto mb-2" />
                          <p className="text-xs">Aucune image disponible</p>
                        </div>
                      )}
                    </div>
                    <p className="text-white font-bold text-sm mb-2">{preview.product.title}</p>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-blue-400 font-black text-lg">
                        {preview.product.price > 0
                          ? preview.product.price.toFixed(2) + ' EUR'
                          : 'Prix non disponible'}
                      </span>
                      <span className="text-slate-500 text-xs capitalize">
                        via {preview.product.vendor || preview.platform}
                      </span>
                    </div>
                    {preview.product.description &&
                     preview.product.description !== preview.product.title && (
                      <p className="text-slate-400 text-xs line-clamp-2">
                        {preview.product.description.slice(0, 200)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-red-400 text-sm">
                    {preview.error || 'Impossible de recuperer le produit'}
                  </p>
                )}
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5">
                <h3 className="font-black text-white mb-4">
                  Resultats ({results.filter(r => r.success).length}/{results.length} reussis)
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {results.map((r, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl text-sm',
                        r.success
                          ? 'bg-green-500/10 border border-green-500/20'
                          : 'bg-red-500/10 border border-red-500/20'
                      )}
                    >
                      {r.success && r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.image}
                          alt={r.title || ''}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-700"
                          onError={e => {
                            const t = e.target as HTMLImageElement
                            t.style.display = 'none'
                          }}
                        />
                      ) : r.success ? (
                        <div className="w-12 h-12 rounded-lg bg-slate-800 flex-shrink-0 flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-600" />
                        </div>
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-sm">
                          {r.success ? r.title : "Echec de l'import"}
                        </p>
                        <p className="text-slate-500 text-xs truncate">
                          {r.success
                            ? (r.price ? r.price.toFixed(2) + ' EUR' : '') + ' ' + (r.platform || '')
                            : r.error?.slice(0, 80)}
                        </p>
                      </div>
                      {r.shopify_id && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-lg flex-shrink-0 font-bold">
                          Shopify
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform guide */}
            {!preview && results.length === 0 && (
              <div className="bg-[#1e293b] border border-slate-700 rounded-2xl p-5">
                <h3 className="font-bold text-white text-sm mb-4">Plateformes supportees</h3>
                <div className="space-y-3">
                  {PLATFORMS.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-start gap-3">
                      <span className="text-xl">{p.emoji}</span>
                      <div>
                        <p className={'font-bold text-sm ' + p.text}>{p.name}</p>
                        <p className="text-slate-600 text-xs truncate">{p.example}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-black text-white">Historique des imports</h2>
            <button
              onClick={loadHistory}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">Aucun import pour l&apos;instant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(job => (
                <div
                  key={job.id}
                  className="bg-[#1e293b] border border-slate-700 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-lg font-bold',
                          job.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : job.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-blue-500/20 text-blue-400'
                        )}
                      >
                        {job.status === 'completed'
                          ? 'Termine'
                          : job.status === 'failed'
                          ? 'Echoue'
                          : 'En cours'}
                      </span>
                      <span className="text-slate-500 text-xs capitalize">{job.platform}</span>
                    </div>
                    <span className="text-slate-600 text-xs">
                      {new Date(job.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-white text-sm font-semibold">
                    {job.imported_count}/{job.total_products} produits importes
                  </p>
                  {job.failed_count > 0 && (
                    <p className="text-red-400 text-xs">{job.failed_count} echec(s)</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
`

fs.writeFileSync(filePath, content, 'utf8')
console.log('Written successfully. Size:', fs.statSync(filePath).size, 'bytes')
