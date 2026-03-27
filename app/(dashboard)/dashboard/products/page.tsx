'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Search, RefreshCw, Save, Check, X } from 'lucide-react'

type Variant = {
  id: string | number
  price?: string
  compare_at_price?: string | null
  sku?: string
}

type Product = {
  id: string
  title: string
  body_html?: string
  vendor?: string
  tags?: string
  status?: string
  images?: Array<{ src: string }>
  variants?: Variant[]
  price?: string
}

const colors = {
  page: '#080d1a',
  card: '#0f1629',
  subtle: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.06)',
  subtleBorder: 'rgba(255,255,255,0.04)',
  text: '#e8ecf4',
  secondary: '#6b7a99',
  muted: '#3d4d6b',
  blue: '#4f8ef7',
  success: '#10b981',
  danger: '#ef4444',
}

const S = {
  page: { padding: '32px', maxWidth: '1200px', margin: '0 auto', background: colors.page, borderRadius: '14px' } as CSSProperties,
  card: { background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '14px', padding: '20px' } as CSSProperties,
  subtleCard: { background: colors.subtle, border: `1px solid ${colors.subtleBorder}`, borderRadius: '10px', padding: '12px 16px' } as CSSProperties,
  title: { color: colors.text, fontSize: '22px', fontWeight: 600, margin: 0 } as CSSProperties,
  subtitle: { color: colors.secondary, fontSize: '14px', fontWeight: 400, margin: '4px 0 0 0' } as CSSProperties,
  label: { color: colors.secondary, fontSize: '12px', fontWeight: 500, letterSpacing: '0.02em' } as CSSProperties,
}

function getPlainText(html?: string) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function scoreSeo(p: Product) {
  const titleLen = (p.title || '').length
  const descWords = getPlainText(p.body_html).split(' ').filter(Boolean).length
  const tagsCount = (p.tags || '').split(',').map((x) => x.trim()).filter(Boolean).length
  let s = 0
  if (titleLen >= 50 && titleLen <= 70) s += 40
  else if (titleLen >= 35) s += 22
  else if (titleLen >= 10) s += 10
  if (descWords >= 180) s += 35
  else if (descWords >= 80) s += 22
  else if (descWords >= 20) s += 12
  if (tagsCount >= 8) s += 25
  else if (tagsCount >= 4) s += 16
  else if (tagsCount >= 1) s += 8
  return Math.min(100, s)
}

function parseVariants(raw: any): Variant[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function parseImages(raw: any): Array<{ src: string }> {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return []
    if (typeof raw[0] === 'string') return raw.map((src: string) => ({ src }))
    return raw
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return []
        if (typeof parsed[0] === 'string') return parsed.map((src: string) => ({ src }))
        return parsed
      }
      return []
    } catch {
      return []
    }
  }
  return []
}

function inputStyle(): CSSProperties {
  return {
    width: '100%',
    height: '36px',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#e8ecf4',
    fontSize: '14px',
    fontWeight: 400,
    padding: '0 12px',
    outline: 'none',
  }
}

function textareaStyle(): CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: '#e8ecf4',
    fontSize: '14px',
    fontWeight: 400,
    padding: '10px 12px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '110px',
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const [bulkPrice, setBulkPrice] = useState('')
  const [bulkTags, setBulkTags] = useState('')
  const [bulkStatus, setBulkStatus] = useState<'active' | 'draft' | 'archived'>('active')
  const [bulkLoading, setBulkLoading] = useState(false)

  const [editing, setEditing] = useState<Product | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editVendor, setEditVendor] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editStatus, setEditStatus] = useState<'active' | 'draft' | 'archived'>('active')
  const [editPrice, setEditPrice] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.title = 'Produits - EcomPilot Elite'
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/shopify/products')
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setError(d.error || 'Impossible de charger les produits')
      } else {
        const normalized = (d.products || []).map((p: any) => ({
          ...p,
          id: String(p.id ?? p.shopify_product_id ?? ''),
          price: p.variants?.[0]?.price || String(p.price ?? '0'),
          variants: parseVariants(p.variants),
          images: parseImages(p.images),
        }))
        setProducts(normalized)
      }
    } catch {
      setError('Erreur reseau')
    } finally {
      setLoading(false)
    }
  }

  async function doSync() {
    setSyncing(true)
    setSyncMsg('Synchronisation...')
    try {
      const r = await fetch('/api/shopify/sync', { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (r.ok) {
        setSyncMsg(`${d.synced ?? d.total ?? 0} produits synchronises`)
        await fetchProducts()
      } else {
        setSyncMsg('Erreur: ' + (d.error || 'inconnue'))
      }
    } catch {
      setSyncMsg('Erreur reseau')
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(''), 4000)
  }

  function openEditor(p: Product) {
    setEditing(p)
    setEditTitle(p.title || '')
    setEditDesc(getPlainText(p.body_html || ''))
    setEditVendor(p.vendor || '')
    setEditTags(p.tags || '')
    setEditStatus((p.status as any) || 'active')
    setEditPrice(p.variants?.[0]?.price || p.price || '')
    setSaveMsg('')
  }

  async function saveProduct() {
    if (!editing) return
    setSaving(true)
    setSaveMsg('')
    try {
      const payload: any = {
        title: editTitle,
        body_html: editDesc,
        vendor: editVendor,
        tags: editTags,
        status: editStatus,
      }
      if (editPrice && editing.variants?.length) {
        payload.variants = editing.variants.map((v, i) => (i === 0 ? { ...v, price: editPrice } : v))
      }

      const r = await fetch(`/api/shopify/products/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setSaveMsg('Erreur: ' + (d.error || r.statusText))
        setSaving(false)
        return
      }

      const prod = d.product
      const updated: Product = {
        ...editing,
        id: String(prod?.id || editing.id),
        title: prod?.title ?? editTitle,
        body_html: prod?.body_html ?? editDesc,
        vendor: prod?.vendor ?? editVendor,
        tags: prod?.tags ?? editTags,
        status: prod?.status ?? editStatus,
        variants: prod?.variants ?? editing.variants,
        price: prod?.variants?.[0]?.price || editPrice,
      }

      setProducts((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))
      setEditing(updated)
      setSaveMsg('Enregistre sur Shopify')
    } catch {
      setSaveMsg('Erreur reseau')
    }
    setSaving(false)
  }

  async function applyBulk() {
    if (selectedIds.length === 0) return
    setBulkLoading(true)

    try {
      for (const id of selectedIds) {
        const p = products.find((x) => x.id === id)
        if (!p) continue

        const payload: any = {
          status: bulkStatus,
        }

        if (bulkTags) payload.tags = bulkTags

        if (bulkPrice) {
          payload.variants = (p.variants || []).length
            ? (p.variants || []).map((v, i) => (i === 0 ? { ...v, price: bulkPrice } : v))
            : [{ price: bulkPrice }]
        }

        await fetch(`/api/shopify/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      setProducts((prev) =>
        prev.map((p) => {
          if (!selectedIds.includes(p.id)) return p
          return {
            ...p,
            status: bulkStatus,
            tags: bulkTags || p.tags,
            variants: bulkPrice
              ? ((p.variants || []).length
                ? (p.variants || []).map((v, i) => (i === 0 ? { ...v, price: bulkPrice } : v))
                : [{ id: 'temp', price: bulkPrice }])
              : p.variants,
            price: bulkPrice || p.price,
          }
        })
      )

      setSelectedIds([])
      setSyncMsg('Mise a jour en masse terminee')
      setTimeout(() => setSyncMsg(''), 3000)
    } catch {
      setSyncMsg('Erreur pendant la mise a jour en masse')
      setTimeout(() => setSyncMsg(''), 3000)
    }

    setBulkLoading(false)
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const bySearch = (p.title || '').toLowerCase().includes(search.toLowerCase())
      const byStatus = statusFilter === 'all' || (p.status || 'draft') === statusFilter
      return bySearch && byStatus
    })
  }, [products, search, statusFilter])

  const avgSeo = useMemo(() => {
    if (!filtered.length) return 0
    return Math.round(filtered.reduce((sum, p) => sum + scoreSeo(p), 0) / filtered.length)
  }, [filtered])

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div>
          <h1 style={S.title}>Produits Shopify</h1>
          <p style={S.subtitle}>{loading ? 'Chargement...' : `${filtered.length} produits · SEO moyen ${avgSeo}/100`}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={doSync}
            disabled={syncing}
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '10px',
              border: `1px solid ${syncing ? 'rgba(79,142,247,0.2)' : 'rgba(79,142,247,0.35)'}`,
              background: syncing ? 'rgba(79,142,247,0.15)' : 'rgba(79,142,247,0.12)',
              color: colors.text,
              fontSize: '14px',
              fontWeight: 500,
              cursor: syncing ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Synchroniser
          </button>
          <a
            href="/dashboard/import"
            style={{
              height: '38px',
              padding: '0 14px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: colors.card,
              color: colors.text,
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Importer
          </a>
        </div>
      </div>

      {syncMsg && (
        <div
          style={{
            ...S.subtleCard,
            marginBottom: '16px',
            border: `1px solid ${syncMsg.startsWith('Erreur') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            color: syncMsg.startsWith('Erreur') ? '#fca5a5' : '#86efac',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {syncMsg}
        </div>
      )}

      {error && (
        <div style={{ ...S.subtleCard, marginBottom: '16px', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '13px', fontWeight: 500 }}>
          {error}
        </div>
      )}

      <div style={{ ...S.card, marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
          <div style={{ ...S.subtleCard, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search className="w-4 h-4" style={{ color: colors.muted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit"
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: colors.text,
                fontSize: '14px',
                fontWeight: 400,
                outline: 'none',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              ...S.subtleCard,
              width: '100%',
              color: colors.text,
              fontSize: '14px',
              fontWeight: 400,
              outline: 'none',
              appearance: 'none',
            }}
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="draft">Brouillons</option>
            <option value="archived">Archives</option>
          </select>
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{ color: colors.text, fontSize: '15px', fontWeight: 600, margin: 0 }}>Modifier en masse</p>
          <p style={{ color: colors.secondary, fontSize: '12px', fontWeight: 500, margin: 0 }}>{selectedIds.length} selectionnes</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
          <div>
            <p style={{ ...S.label, margin: '0 0 6px 0' }}>Prix</p>
            <input value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} placeholder="29.99" style={inputStyle()} />
          </div>

          <div>
            <p style={{ ...S.label, margin: '0 0 6px 0' }}>Tags</p>
            <input value={bulkTags} onChange={(e) => setBulkTags(e.target.value)} placeholder="tag1, tag2" style={inputStyle()} />
          </div>

          <div>
            <p style={{ ...S.label, margin: '0 0 6px 0' }}>Statut</p>
            <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as any)} style={inputStyle()}>
              <option value="active">Actif</option>
              <option value="draft">Brouillon</option>
              <option value="archived">Archive</option>
            </select>
          </div>

          <button
            onClick={applyBulk}
            disabled={bulkLoading || selectedIds.length === 0}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '10px',
              border: '1px solid rgba(79,142,247,0.2)',
              background: bulkLoading || selectedIds.length === 0 ? 'rgba(79,142,247,0.1)' : 'rgba(79,142,247,0.2)',
              color: colors.text,
              fontSize: '14px',
              fontWeight: 500,
              cursor: bulkLoading || selectedIds.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {bulkLoading ? 'Application...' : 'Appliquer'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 360px' : '1fr', gap: '16px', alignItems: 'start' }}>
        <div style={{ ...S.card, padding: '12px' }}>
          {loading ? (
            <div style={{ padding: '24px', color: colors.secondary, fontSize: '14px', fontWeight: 400 }}>Chargement des produits...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '24px', color: colors.secondary, fontSize: '14px', fontWeight: 400 }}>Aucun produit a afficher</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map((p) => {
                const selected = selectedIds.includes(p.id)
                const active = editing?.id === p.id
                const seo = scoreSeo(p)
                const price = p.variants?.[0]?.price || p.price || '0'
                return (
                  <div
                    key={p.id}
                    style={{
                      ...S.subtleCard,
                      background: active ? 'rgba(79,142,247,0.05)' : selected ? 'rgba(79,142,247,0.06)' : colors.subtle,
                      border: active
                        ? '1px solid rgba(79,142,247,0.15)'
                        : selected
                          ? '1px solid rgba(79,142,247,0.2)'
                          : `1px solid ${colors.subtleBorder}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => openEditor(p)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedIds((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
                        }}
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '5px',
                          border: `1px solid ${selected ? 'rgba(79,142,247,0.7)' : 'rgba(255,255,255,0.2)'}`,
                          background: selected ? 'rgba(79,142,247,0.2)' : 'transparent',
                          color: colors.text,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        {selected ? <Check className="w-3 h-3" /> : null}
                      </button>

                      <div
                        style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: `1px solid ${colors.subtleBorder}`,
                          background: 'rgba(255,255,255,0.02)',
                          flexShrink: 0,
                        }}
                      >
                        {p.images?.[0]?.src ? (
                          <img src={p.images[0].src} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : null}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: colors.text, fontSize: '14px', fontWeight: 500, margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: colors.blue, fontSize: '12px', fontWeight: 500 }}>{price} EUR</span>
                          <span style={{ color: colors.secondary, fontSize: '12px', fontWeight: 500 }}>{(p.status || 'draft').toUpperCase()}</span>
                          <span style={{ color: seo >= 70 ? colors.success : colors.secondary, fontSize: '12px', fontWeight: 500 }}>SEO {seo}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditor(p)
                        }}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          border: `1px solid ${colors.subtleBorder}`,
                          background: 'transparent',
                          color: colors.secondary,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {editing && (
          <div style={{ ...S.card, position: 'sticky', top: '80px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ color: colors.text, fontSize: '15px', fontWeight: 600, margin: 0 }}>Edition produit</p>
              <button
                onClick={() => setEditing(null)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.subtleBorder}`,
                  background: 'transparent',
                  color: colors.secondary,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <p style={{ ...S.label, margin: '0 0 6px 0' }}>Titre</p>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={inputStyle()} />
              </div>

              <div>
                <p style={{ ...S.label, margin: '0 0 6px 0' }}>Description</p>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={5} style={textareaStyle()} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <p style={{ ...S.label, margin: '0 0 6px 0' }}>Fournisseur</p>
                  <input value={editVendor} onChange={(e) => setEditVendor(e.target.value)} style={inputStyle()} />
                </div>
                <div>
                  <p style={{ ...S.label, margin: '0 0 6px 0' }}>Prix</p>
                  <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} style={inputStyle()} />
                </div>
              </div>

              <div>
                <p style={{ ...S.label, margin: '0 0 6px 0' }}>Tags</p>
                <input value={editTags} onChange={(e) => setEditTags(e.target.value)} style={inputStyle()} />
              </div>

              <div>
                <p style={{ ...S.label, margin: '0 0 6px 0' }}>Statut</p>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as any)} style={inputStyle()}>
                  <option value="active">Actif</option>
                  <option value="draft">Brouillon</option>
                  <option value="archived">Archive</option>
                </select>
              </div>

              {saveMsg && (
                <div
                  style={{
                    ...S.subtleCard,
                    border: `1px solid ${saveMsg.startsWith('Erreur') ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                    color: saveMsg.startsWith('Erreur') ? '#fca5a5' : '#86efac',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {saveMsg}
                </div>
              )}

              <button
                onClick={saveProduct}
                disabled={saving}
                style={{
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid rgba(79,142,247,0.3)',
                  background: 'rgba(79,142,247,0.2)',
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Sauvegarder sur Shopify'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
