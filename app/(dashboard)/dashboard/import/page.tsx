'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Package, Upload, Link, X, Check, AlertCircle, Zap, 
  RefreshCw, ShoppingCart, TrendingUp, Clock, AlertTriangle,
  ChevronRight, ChevronDown, Trash2, Copy, ExternalLink,
  CheckCircle2, XCircle, Loader2, Sparkles, Layers, Target
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform = 'aliexpress' | 'alibaba' | 'cjdropshipping' | 'dhgate' | 'banggood' | 'temu' | 'other'

interface ImportUrl {
  id: string
  url: string
  platform: Platform
  status: 'pending' | 'validating' | 'valid' | 'invalid' | 'importing' | 'success' | 'failed' | 'retrying'
  error?: string
  retryCount: number
}

interface ImportResult {
  url: string
  success: boolean
  title?: string
  price?: number
  image?: string
  images?: number
  shopify_id?: string
  platform?: string
  error?: string
}

interface ImportStats {
  total: number
  successful: number
  failed: number
  success_rate: number
  platforms: Record<string, number>
}

interface ImportJob {
  id: string
  platform: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
  imported_count: number
  total_products: number
  failed_count: number
  created_at: string
  results?: ImportResult[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORMS: Array<{ 
  id: Platform
  name: string
  emoji: string
  color: string
  bg: string
  border: string
  text: string
  domains: string[]
}> = [
  { 
    id: 'aliexpress', 
    name: 'AliExpress', 
    emoji: '🛒',
    color: '#ff4747',
    bg: 'rgba(255, 71, 71, 0.1)',
    border: 'rgba(255, 71, 71, 0.3)',
    text: '#ff6b6b',
    domains: ['aliexpress.com', 'aliexpress.ru']
  },
  { 
    id: 'alibaba', 
    name: 'Alibaba', 
    emoji: '🌐',
    color: '#ff6a00',
    bg: 'rgba(255, 106, 0, 0.1)',
    border: 'rgba(255, 106, 0, 0.3)',
    text: '#ff8c42',
    domains: ['alibaba.com']
  },
  { 
    id: 'cjdropshipping', 
    name: 'CJ Dropshipping', 
    emoji: '📦',
    color: '#00c853',
    bg: 'rgba(0, 200, 83, 0.1)',
    border: 'rgba(0, 200, 83, 0.3)',
    text: '#69f0ae',
    domains: ['cjdropshipping.com', 'cjdropshippingapp.com']
  },
  { 
    id: 'dhgate', 
    name: 'DHgate', 
    emoji: '🏭',
    color: '#1890ff',
    bg: 'rgba(24, 144, 255, 0.1)',
    border: 'rgba(24, 144, 255, 0.3)',
    text: '#69c0ff',
    domains: ['dhgate.com']
  },
  { 
    id: 'banggood', 
    name: 'Banggood', 
    emoji: '⚡',
    color: '#ff9800',
    bg: 'rgba(255, 152, 0, 0.1)',
    border: 'rgba(255, 152, 0, 0.3)',
    text: '#ffb74d',
    domains: ['banggood.com']
  },
  { 
    id: 'temu', 
    name: 'Temu', 
    emoji: '🎯',
    color: '#fb7701',
    bg: 'rgba(251, 119, 1, 0.1)',
    border: 'rgba(251, 119, 1, 0.3)',
    text: '#ff9846',
    domains: ['temu.com']
  },
  { 
    id: 'other', 
    name: 'Autre site', 
    emoji: '🔗',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.1)',
    border: 'rgba(100, 116, 139, 0.3)',
    text: '#94a3b8',
    domains: []
  },
]

const MAX_URLS = 100
const AUTO_RETRY_ENABLED = true
const MAX_RETRIES = 3

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function detectPlatform(url: string): Platform {
  const lower = url.toLowerCase()
  for (const p of PLATFORMS) {
    if (p.domains.some(d => lower.includes(d))) {
      return p.id
    }
  }
  return 'other'
}

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function proxyImg(src: string): string {
  if (!src) return ''
  return '/api/import/image-proxy?url=' + encodeURIComponent(src)
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  // State
  const [urls, setUrls] = useState<ImportUrl[]>([])
  const [pasteText, setPasteText] = useState('')
  const [showPasteModal, setShowPasteModal] = useState(false)
  const [pushShopify, setPushShopify] = useState(true)
  const [shopifyOk, setShopifyOk] = useState(false)
  const [shopDomain, setShopDomain] = useState<string | null>(null)
  const [autoRetry, setAutoRetry] = useState(AUTO_RETRY_ENABLED)
  const [margin, setMargin] = useState(1.5)
  
  // Import state
  const [importing, setImporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{
    success?: boolean
    preview?: {
      platform?: string
      product?: {
        title: string
        price: number
        supplierPrice?: number
        images?: string[]
      }
    } | null
    error?: string
  } | null>(null)
  const [results, setResults] = useState<ImportResult[]>([])
  const [showResults, setShowResults] = useState(false)
  
  // History
  const [history, setHistory] = useState<ImportJob[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  // Stats
  const validCount = urls.filter(u => u.status === 'valid' || u.status === 'pending').length
  const invalidCount = urls.filter(u => u.status === 'invalid').length
  const successCount = results.filter(r => r.success).length
  const failedCount = results.filter(r => !r.success).length

  // ───────────────────────────────────────────────────────────────────────────
  // Effects
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    document.title = 'Import en Masse — EcomPilot Elite'
    checkShopifyConnection()
    loadHistory()
  }, [])

  async function checkShopifyConnection() {
    try {
      const supabase = createClient()
      const { data: shop } = await supabase
        .from('shops')
        .select('shop_domain, shop_name')
        .eq('is_active', true)
        .limit(1)
        .single()
      
      if (shop) {
        setShopifyOk(true)
        setShopDomain(shop.shop_domain)
      }
    } catch {
      setShopifyOk(false)
    }
  }

  async function loadHistory() {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/import/history')
      const data = await res.json()
      setHistory(data.jobs || [])
    } catch {
      console.error('Failed to load history')
    }
    setLoadingHistory(false)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // URL Management
  // ───────────────────────────────────────────────────────────────────────────

  const addUrl = useCallback((url: string) => {
    const trimmed = url.trim()
    if (!trimmed || !trimmed.startsWith('http')) return
    
    setUrls(prev => {
      if (prev.some(u => u.url === trimmed)) return prev
      if (prev.length >= MAX_URLS) return prev
      
      return [...prev, {
        id: generateId(),
        url: trimmed,
        platform: detectPlatform(trimmed),
        status: 'pending',
        retryCount: 0,
      }]
    })
  }, [])

  const removeUrl = useCallback((id: string) => {
    setUrls(prev => prev.filter(u => u.id !== id))
  }, [])

  const clearAllUrls = useCallback(() => {
    setUrls([])
    setResults([])
    setPreviewData(null)
    setPreviewUrl(null)
  }, [])

  const handlePaste = useCallback(() => {
    const lines = pasteText.split(/[\n,;\s]+/)
      .filter(l => l.trim().startsWith('http'))
      .slice(0, MAX_URLS)
    
    lines.forEach(url => addUrl(url))
    setPasteText('')
    setShowPasteModal(false)
  }, [pasteText, addUrl])

  const validateAllUrls = useCallback(async () => {
    setUrls(prev => prev.map(u => ({ ...u, status: 'validating' as const })))
    
    // Simple validation - mark all as valid for now
    // Could add HTTP HEAD requests for deeper validation
    await new Promise(r => setTimeout(r, 500))
    
    setUrls(prev => prev.map(u => ({
      ...u,
      status: u.url.length > 20 ? 'valid' : 'invalid',
      error: u.url.length <= 20 ? 'URL trop courte' : undefined,
    })))
  }, [])

  // ───────────────────────────────────────────────────────────────────────────
  // Preview
  // ───────────────────────────────────────────────────────────────────────────

  const previewFirstUrl = useCallback(async () => {
    const firstValid = urls.find(u => u.status !== 'invalid')
    if (!firstValid) return

    setPreviewing(true)
    setPreviewUrl(firstValid.url)
    setPreviewData(null)

    try {
      const res = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: firstValid.url,
          margin,
        }),
      })

      const data = await res.json()
      setPreviewData(data)
    } catch (error) {
      setPreviewData({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
      })
    }

    setPreviewing(false)
  }, [urls, margin])

  // ───────────────────────────────────────────────────────────────────────────
  // Import
  // ───────────────────────────────────────────────────────────────────────────

  const startImport = useCallback(async () => {
    const validUrls = urls.filter(u => u.status !== 'invalid').map(u => u.url)
    if (validUrls.length === 0) return

    setImporting(true)
    setResults([])
    setShowResults(true)
    setProgress(0)

    // Update URL statuses
    setUrls(prev => prev.map(u => ({
      ...u,
      status: 'importing' as const,
    })))

    try {
      const res = await fetch('/api/import/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: validUrls,
          push_to_shopify: pushShopify && shopifyOk,
          auto_retry: autoRetry,
          margin,
        }),
      })

      const data = await res.json()
      
      if (data.results) {
        setResults(data.results)
        
        // Update URL statuses based on results
        setUrls(prev => prev.map(u => {
          const result = data.results.find((r: ImportResult) => r.url === u.url)
          if (!result) return u
          return {
            ...u,
            status: result.success ? 'success' : 'failed',
            error: result.error,
          }
        }))
      }

      // Update progress
      setProgress(100)
      
      // Reload history
      loadHistory()
    } catch (error) {
      console.error('Import failed:', error)
      setResults([{
        url: '',
        success: false,
        error: error instanceof Error ? error.message : 'Erreur réseau',
      }])
    }

    setTimeout(() => {
      setImporting(false)
    }, 1000)
  }, [urls, pushShopify, shopifyOk, autoRetry, margin])

  const retryFailed = useCallback(async () => {
    const failedUrls = urls.filter(u => u.status === 'failed' && u.retryCount < MAX_RETRIES)
    if (failedUrls.length === 0) return

    setImporting(true)
    setProgress(0)

    // Mark as retrying
    setUrls(prev => prev.map(u => 
      failedUrls.find(f => f.id === u.id) 
        ? { ...u, status: 'retrying' as const, retryCount: u.retryCount + 1 }
        : u
    ))

    try {
      const res = await fetch('/api/import/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: failedUrls.map(u => u.url),
          push_to_shopify: pushShopify && shopifyOk,
          auto_retry: false,
          margin,
        }),
      })

      const data = await res.json()
      
      if (data.results) {
        // Update results
        setResults(prev => {
          const newResults = [...prev]
          for (const result of data.results) {
            const idx = newResults.findIndex(r => r.url === result.url)
            if (idx >= 0) {
              newResults[idx] = result
            } else {
              newResults.push(result)
            }
          }
          return newResults
        })

        // Update URL statuses
        setUrls(prev => prev.map(u => {
          const result = data.results.find((r: ImportResult) => r.url === u.url)
          if (!result) return u
          return {
            ...u,
            status: result.success ? 'success' : 'failed',
            error: result.error,
          }
        }))
      }

      setProgress(100)
    } catch (error) {
      console.error('Retry failed:', error)
    }

    setTimeout(() => setImporting(false), 1000)
  }, [urls, pushShopify, shopifyOk, margin])

  // ───────────────────────────────────────────────────────────────────────────
  // Styles
  // ───────────────────────────────────────────────────────────────────────────

  const styles = {
    card: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      border: '1px solid #334155',
      borderRadius: '16px',
      padding: '20px',
    } as React.CSSProperties,

    input: {
      width: '100%',
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '12px',
      color: '#f1f5f9',
      fontSize: '14px',
      padding: '12px 16px',
      boxSizing: 'border-box',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s',
    } as React.CSSProperties,

    btnPrimary: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '12px',
      padding: '14px 24px',
      fontWeight: 700,
      fontSize: '14px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'transform 0.1s, box-shadow 0.2s',
      boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
    } as React.CSSProperties,

    btnSecondary: {
      background: '#1e293b',
      border: '1px solid #334155',
      color: '#94a3b8',
      borderRadius: '12px',
      padding: '10px 16px',
      fontWeight: 600,
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as React.CSSProperties,

    btnDanger: {
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      color: '#f87171',
      borderRadius: '12px',
      padding: '10px 16px',
      fontWeight: 600,
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    } as React.CSSProperties,

    label: {
      color: '#94a3b8',
      fontSize: '12px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    } as React.CSSProperties,

    badge: {
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
    } as React.CSSProperties,
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#f1f5f9' }}>
      
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}>
            📦
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Import en Masse
            </h1>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
              Importez des produits depuis AliExpress, Alibaba, CJ, DHgate, Banggood, Temu
            </p>
          </div>
        </div>
      </div>

      {/* ─── Platform Badges ───────────────────────────────────────────────── */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '8px', 
        marginBottom: '24px',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '12px',
        border: '1px solid #1e293b',
      }}>
        {PLATFORMS.slice(0, -1).map(p => (
          <div 
            key={p.id}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px', 
              borderRadius: '10px', 
              background: p.bg,
              border: `1px solid ${p.border}`,
            }}
          >
            <span style={{ fontSize: '14px' }}>{p.emoji}</span>
            <span style={{ color: p.text, fontSize: '12px', fontWeight: 700 }}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* ─── Main Grid ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* URL Input Card */}
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link size={20} color="#3b82f6" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px' }}>URLs à importer</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ 
                  ...styles.badge,
                  background: validCount > 0 ? 'rgba(34, 197, 94, 0.2)' : '#1e293b',
                  color: validCount > 0 ? '#4ade80' : '#94a3b8',
                  border: `1px solid ${validCount > 0 ? 'rgba(34, 197, 94, 0.3)' : '#334155'}`,
                }}>
                  {validCount} valides
                </span>
                <span style={{ 
                  ...styles.badge,
                  background: invalidCount > 0 ? 'rgba(239, 68, 68, 0.2)' : '#1e293b',
                  color: invalidCount > 0 ? '#f87171' : '#94a3b8',
                  border: `1px solid ${invalidCount > 0 ? 'rgba(239, 68, 68, 0.3)' : '#334155'}`,
                }}>
                  {invalidCount} invalides
                </span>
                <span style={{ 
                  ...styles.badge,
                  background: '#1e293b',
                  color: '#94a3b8',
                  border: '1px solid #334155',
                }}>
                  {urls.length}/{MAX_URLS}
                </span>
              </div>
            </div>

            {/* URL List */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              marginBottom: '16px',
              maxHeight: '280px',
              overflowY: 'auto',
              paddingRight: '8px',
            }}>
              {urls.length === 0 ? (
                <div style={{ 
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                  border: '2px dashed #334155',
                  borderRadius: '12px',
                }}>
                  <Link size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>Aucune URL ajoutée</p>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>Collez des URLs de produits ci-dessus</p>
                </div>
              ) : (
                urls.map((u, i) => (
                  <div 
                    key={u.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: '#0f172a',
                      border: `1px solid ${
                        u.status === 'invalid' ? 'rgba(239, 68, 68, 0.3)' :
                        u.status === 'success' ? 'rgba(34, 197, 94, 0.3)' :
                        u.status === 'failed' ? 'rgba(239, 68, 68, 0.3)' :
                        '#334155'
                      }`,
                    }}
                  >
                    {/* Platform Icon */}
                    <span style={{ fontSize: '16px' }}>
                      {PLATFORMS.find(p => p.id === u.platform)?.emoji || '🔗'}
                    </span>
                    
                    {/* URL */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        margin: 0, 
                        fontSize: '13px', 
                        color: '#f1f5f9',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {u.url}
                      </p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'capitalize' }}>
                          {u.platform}
                        </span>
                        {u.status === 'validating' && (
                          <Loader2 size={12} className="animate-spin" color="#3b82f6" />
                        )}
                        {u.status === 'valid' && <CheckCircle2 size={12} color="#4ade80" />}
                        {u.status === 'invalid' && <XCircle size={12} color="#f87171" />}
                        {u.status === 'success' && <CheckCircle2 size={12} color="#4ade80" />}
                        {u.status === 'failed' && <XCircle size={12} color="#f87171" />}
                        {u.status === 'retrying' && <RefreshCw size={12} className="animate-spin" color="#fbbf24" />}
                      </div>
                    </div>

                    {/* Retry Count */}
                    {u.retryCount > 0 && (
                      <span style={{ fontSize: '11px', color: '#fbbf24' }}>
                        {u.retryCount}/{MAX_RETRIES}
                      </span>
                    )}

                    {/* Remove Button */}
                    <button
                      onClick={() => removeUrl(u.id)}
                      style={{ 
                        ...styles.btnSecondary,
                        padding: '6px 8px',
                        background: 'transparent',
                        border: 'none',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowPasteModal(true)}
                disabled={urls.length >= MAX_URLS}
                style={{ 
                  ...styles.btnSecondary,
                  flex: '1 1 auto',
                  opacity: urls.length >= MAX_URLS ? 0.5 : 1,
                }}
              >
                <Copy size={16} />
                Coller en masse
              </button>
              <button
                onClick={clearAllUrls}
                disabled={urls.length === 0}
                style={{ 
                  ...styles.btnSecondary,
                  opacity: urls.length === 0 ? 0.5 : 1,
                }}
              >
                <Trash2 size={16} />
                Tout effacer
              </button>
              <button
                onClick={validateAllUrls}
                disabled={urls.length === 0}
                style={{ 
                  ...styles.btnSecondary,
                  opacity: urls.length === 0 ? 0.5 : 1,
                }}
              >
                <Check size={16} />
                Valider
              </button>
            </div>
          </div>

          {/* Settings Card */}
          <div style={styles.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Zap size={20} color="#fbbf24" />
              <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px' }}>Paramètres</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Shopify Toggle */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                padding: '14px',
                background: '#0f172a',
                borderRadius: '12px',
                border: '1px solid #334155',
              }}>
                <div 
                  onClick={() => shopifyOk && setPushShopify(!pushShopify)}
                  style={{ 
                    width: '48px', 
                    height: '26px', 
                    borderRadius: '13px', 
                    background: pushShopify && shopifyOk ? '#3b82f6' : '#334155',
                    position: 'relative',
                    cursor: shopifyOk ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    background: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    transition: 'transform 0.2s',
                    transform: pushShopify && shopifyOk ? 'translateX(25px)' : 'translateX(3px)',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>
                    Synchroniser avec Shopify
                  </p>
                  <p style={{ 
                    ...styles.label, 
                    margin: 0, 
                    color: shopifyOk ? '#4ade80' : '#f87171',
                    textTransform: 'none',
                  }}>
                    {shopifyOk ? `✓ Connecté à ${shopDomain}` : 'Aucune boutique connectée'}
                  </p>
                </div>
                {shopifyOk && (
                  <ExternalLink size={18} color="#64748b" />
                )}
              </div>

              {/* Auto Retry Toggle */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '14px',
                padding: '14px',
                background: '#0f172a',
                borderRadius: '12px',
                border: '1px solid #334155',
              }}>
                <div 
                  onClick={() => setAutoRetry(!autoRetry)}
                  style={{ 
                    width: '48px', 
                    height: '26px', 
                    borderRadius: '13px', 
                    background: autoRetry ? '#3b82f6' : '#334155',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ 
                    width: '20px', 
                    height: '20px', 
                    borderRadius: '50%', 
                    background: '#ffffff',
                    position: 'absolute',
                    top: '3px',
                    transition: 'transform 0.2s',
                    transform: autoRetry ? 'translateX(25px)' : 'translateX(3px)',
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>
                    Réessai automatique
                  </p>
                  <p style={{ ...styles.label, margin: 0, textTransform: 'none' }}>
                    {autoRetry ? `Activé (max ${MAX_RETRIES} tentatives)` : 'Désactivé'}
                  </p>
                </div>
                <RefreshCw size={18} color={autoRetry ? '#3b82f6' : '#64748b'} />
              </div>

              {/* Margin Slider */}
              <div style={{ 
                padding: '14px',
                background: '#0f172a',
                borderRadius: '12px',
                border: '1px solid #334155',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600, margin: 0 }}>
                    Marge commerciale
                  </p>
                  <span style={{ 
                    ...styles.badge,
                    background: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    padding: '4px 12px',
                  }}>
                    x{margin.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="1.1"
                  max="5"
                  step="0.1"
                  value={margin}
                  onChange={e => setMargin(parseFloat(e.target.value))}
                  style={{ 
                    width: '100%',
                    accentColor: '#3b82f6',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>1.1x</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>5x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Import Button */}
          <button
            onClick={startImport}
            disabled={importing || validCount === 0}
            style={{ 
              ...styles.btnPrimary,
              opacity: validCount === 0 ? 0.5 : 1,
              cursor: validCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {importing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Importation en cours...
              </>
            ) : (
              <>
                <Upload size={20} />
                Importer {validCount > 0 ? `(${validCount} produits)` : ''}
              </>
            )}
          </button>

          {/* Progress Bar */}
          {importing && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                  Progression
                </span>
                <span style={{ color: '#3b82f6', fontSize: '13px', fontWeight: 700 }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div style={{ 
                height: '8px', 
                background: '#1e293b', 
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div style={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                  width: `${progress}%`,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Preview Card */}
          {(previewData || previewing) && (
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sparkles size={20} color="#fbbf24" />
                  <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px' }}>Aperçu</span>
                </div>
                {previewing && (
                  <Loader2 size={18} className="animate-spin" color="#3b82f6" />
                )}
              </div>

              {previewData?.success && previewData.preview ? (
                <div>
                  <div style={{ 
                    width: '100%', 
                    height: '200px', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {previewData.preview.product?.images?.[0] ? (
                      <img 
                        src={proxyImg(previewData.preview.product.images[0])} 
                        alt={previewData.preview.product.title}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    ) : (
                      <Package size={48} color="#64748b" />
                    )}
                  </div>
                  <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '14px', margin: '0 0 8px', lineHeight: 1.4 }}>
                    {previewData.preview.product?.title}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ color: '#4ade80', fontWeight: 900, fontSize: '22px' }}>
                      {previewData.preview.product && previewData.preview.product.price > 0
                        ? `${previewData.preview.product.price.toFixed(2)} €`
                        : 'Prix N/A'}
                    </span>
                    {previewData.preview.product && previewData.preview.product.supplierPrice && previewData.preview.product.supplierPrice > 0 && (
                      <span style={{ color: '#64748b', fontSize: '13px' }}>
                        (fournisseur: {previewData.preview.product.supplierPrice.toFixed(2)} €)
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      ...styles.badge,
                      background: PLATFORMS.find(p => p.id === previewData.preview?.platform)?.bg,
                      color: PLATFORMS.find(p => p.id === previewData.preview?.platform)?.text,
                      border: `1px solid ${PLATFORMS.find(p => p.id === previewData.preview?.platform)?.border}`,
                    }}>
                      {previewData.preview?.platform || 'unknown'}
                    </span>
                    <span style={{
                      ...styles.badge,
                      background: '#1e293b',
                      color: '#94a3b8',
                      border: '1px solid #334155',
                    }}>
                      {previewData.preview.product?.images?.length || 0} images
                    </span>
                  </div>
                </div>
              ) : previewData?.error ? (
                <div style={{ 
                  padding: '20px',
                  textAlign: 'center',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}>
                  <AlertCircle size={32} color="#f87171" style={{ marginBottom: '10px' }} />
                  <p style={{ color: '#f87171', fontSize: '14px', margin: 0 }}>
                    {previewData.error}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                }}>
                  <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontSize: '14px' }}>Chargement de l'aperçu...</p>
                </div>
              )}
            </div>
          )}

          {/* Results Card */}
          {showResults && results.length > 0 && (
            <div style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Layers size={20} color="#3b82f6" />
                  <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px' }}>Résultats</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ 
                    ...styles.badge,
                    background: 'rgba(34, 197, 94, 0.2)',
                    color: '#4ade80',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}>
                    ✓ {successCount}
                  </span>
                  <span style={{ 
                    ...styles.badge,
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}>
                    ✗ {failedCount}
                  </span>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                maxHeight: '320px',
                overflowY: 'auto',
                paddingRight: '8px',
              }}>
                {results.map((r, i) => (
                  <div 
                    key={i}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      padding: '10px',
                      borderRadius: '10px',
                      background: r.success 
                        ? 'rgba(34, 197, 94, 0.08)' 
                        : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${
                        r.success 
                          ? 'rgba(34, 197, 94, 0.25)' 
                          : 'rgba(239, 68, 68, 0.25)'
                      }`,
                    }}
                  >
                    {r.success && r.image ? (
                      <img 
                        src={proxyImg(r.image)} 
                        alt={r.title || ''}
                        style={{ 
                          width: '48px', 
                          height: '48px', 
                          borderRadius: '8px', 
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid #334155',
                        }}
                        onError={e => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    ) : (
                      <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '8px', 
                        background: '#1e293b',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}>
                        {r.success ? '📦' : '❌'}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ 
                        color: r.success ? '#f1f5f9' : '#f87171',
                        fontSize: '13px',
                        fontWeight: 600,
                        margin: '0 0 2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {r.success ? r.title : 'Échec'}
                      </p>
                      <p style={{ ...styles.label, margin: 0, textTransform: 'none' }}>
                        {r.success 
                          ? `${r.price?.toFixed(2)} € · ${r.platform}`
                          : r.error?.slice(0, 50)}
                      </p>
                    </div>
                    {r.shopify_id && (
                      <span style={{ 
                        background: 'rgba(34, 197, 94, 0.2)',
                        color: '#4ade80',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        flexShrink: 0,
                      }}>
                        ✓ Shopify
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {failedCount > 0 && (
                <button
                  onClick={retryFailed}
                  disabled={importing}
                  style={{ 
                    ...styles.btnSecondary,
                    width: '100%',
                    marginTop: '14px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    color: '#fbbf24',
                  }}
                >
                  <RefreshCw size={16} />
                  Réessayer les échecs ({failedCount})
                </button>
              )}
            </div>
          )}

          {/* Info Card */}
          {!previewData && results.length === 0 && (
            <div style={styles.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Target size={20} color="#3b82f6" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px' }}>Fonctionnalités</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { icon: '⚡', text: 'Scraping multi-stratégies' },
                  { icon: '🔄', text: 'Réessai automatique intelligent' },
                  { icon: '📊', text: 'Jusqu\'à 100 URLs par lot' },
                  { icon: '🛍️', text: 'Synchronisation Shopify' },
                  { icon: '💰', text: 'Calcul de marge automatique' },
                  { icon: '🎯', text: 'Détection de plateforme' },
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{f.icon}</span>
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Paste Modal ───────────────────────────────────────────────────── */}
      {showPasteModal && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9000,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ 
            ...styles.card,
            width: '100%',
            maxWidth: '550px',
            zIndex: 9001,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Copy size={20} color="#3b82f6" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '16px' }}>
                  Coller des URLs en masse
                </span>
              </div>
              <button
                onClick={() => { setShowPasteModal(false); setPasteText('') }}
                style={{ 
                  ...styles.btnSecondary,
                  padding: '6px 8px',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 12px' }}>
              Collez vos URLs ci-dessous (une par ligne, virgule ou espace). Maximum {MAX_URLS} URLs.
            </p>

            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder="https://www.aliexpress.com/item/...&#10;https://cjdropshipping.com/product/...&#10;https://www.banggood.com/..."
              style={{ 
                ...styles.input,
                height: '200px',
                resize: 'vertical',
                marginBottom: '16px',
                fontFamily: 'monospace',
                fontSize: '13px',
              }}
              autoFocus
            />

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                {pasteText.split(/[\n,;\s]+/).filter(l => l.trim().startsWith('http')).length} URLs détectées
              </span>
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                Max: {MAX_URLS}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowPasteModal(false); setPasteText('') }}
                style={{ ...styles.btnSecondary, flex: 1 }}
              >
                Annuler
              </button>
              <button
                onClick={handlePaste}
                disabled={!pasteText.trim()}
                style={{ 
                  ...styles.btnPrimary, 
                  flex: 2,
                  opacity: !pasteText.trim() ? 0.5 : 1,
                }}
              >
                <Check size={16} />
                Ajouter les URLs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── History Modal ─────────────────────────────────────────────────── */}
      {showHistory && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9000,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{ 
            ...styles.card,
            width: '100%',
            maxWidth: '700px',
            maxHeight: '80vh',
            zIndex: 9001,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={20} color="#3b82f6" />
                <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '18px' }}>
                  Historique des imports
                </span>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                style={{ 
                  ...styles.btnSecondary,
                  padding: '6px 8px',
                  background: 'transparent',
                  border: 'none',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loadingHistory ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>
                  <Loader2 size={32} className="animate-spin" color="#3b82f6" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: '#94a3b8', margin: 0 }}>Chargement...</p>
                </div>
              ) : history.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <Clock size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>Aucun historique</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {history.map(job => (
                    <div 
                      key={job.id}
                      style={{ 
                        padding: '14px',
                        background: '#0f172a',
                        borderRadius: '12px',
                        border: `1px solid ${
                          job.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' :
                          job.status === 'failed' ? 'rgba(239, 68, 68, 0.3)' :
                          'rgba(59, 130, 246, 0.3)'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ 
                              ...styles.badge,
                              background: job.status === 'completed' 
                                ? 'rgba(34, 197, 94, 0.2)' 
                                : job.status === 'failed'
                                  ? 'rgba(239, 68, 68, 0.2)'
                                  : 'rgba(59, 130, 246, 0.2)',
                              color: job.status === 'completed' 
                                ? '#4ade80' 
                                : job.status === 'failed'
                                  ? '#f87171'
                                  : '#60a5fa',
                              border: `1px solid ${
                                job.status === 'completed' 
                                  ? 'rgba(34, 197, 94, 0.3)' 
                                  : job.status === 'failed'
                                    ? 'rgba(239, 68, 68, 0.3)'
                                    : 'rgba(59, 130, 246, 0.3)'
                              }`,
                            }}>
                              {job.status === 'completed' ? 'Terminé' : 
                               job.status === 'failed' ? 'Échoué' : 'Partiel'}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '12px', textTransform: 'capitalize' }}>
                              {job.platform}
                            </span>
                          </div>
                          <p style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>
                            {job.imported_count}/{job.total_products} produits importés
                          </p>
                          {job.failed_count > 0 && (
                            <p style={{ color: '#f87171', fontSize: '12px', margin: 0 }}>
                              {job.failed_count} échecs
                            </p>
                          )}
                        </div>
                        <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                          {new Date(job.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
