'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'

type Product = {
  id: string
  shopify_product_id?: string
  title: string
  body_html?: string
  description?: string
  vendor?: string
  price?: number
  compare_at_price?: number | null
  images?: unknown
  variants?: any[]
  tags?: string
  status?: string
}

type EditState = {
  title: string
  description: string
  price: string
  compareAtPrice: string
  tags: string
  vendor: string
}

const PER_PAGE = 24

const P = {
  text:    '#e8ecf4',
  sub:     '#8a95b0',
  muted:   '#555f7a',
  accent:  '#4f8ef7',
  ok:      '#10b981',
  err:     '#f87171',
  card:    'rgba(255,255,255,0.04)',
  cardAlt: 'rgba(255,255,255,0.02)',
  border:  'rgba(255,255,255,0.08)',
  borderHi:'rgba(255,255,255,0.14)',
}

function asImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((img) => {
      if (typeof img === 'string') return img
      if (img && typeof img === 'object' && 'src' in img) {
        const src = (img as { src?: unknown }).src
        return typeof src === 'string' ? src : ''
      }
      return ''
    }).filter(Boolean)
  }
  if (typeof value === 'string') {
    try { return asImageUrls(JSON.parse(value)) } catch { return [] }
  }
  return []
}

function asVariants(value: unknown): any[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }
  return []
}

function parsePrice(v: string): number | null {
  if (!v.trim()) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  color: '#e8ecf4',
  fontSize: 14,
  fontWeight: 400,
  padding: '10px 12px',
  boxSizing: 'border-box',
  outline: 'none',
}

const cardStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
}

// ─── BULK EDIT TAB ───────────────────────────────────────────
function BulkEditTab({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [action, setAction] = useState<'price' | 'tags_add' | 'status' | 'title_suffix'>('price')
  const [priceType, setPriceType] = useState<'set' | 'increase_pct' | 'decrease_pct'>('set')
  const [value, setValue] = useState('')
  const [applying, setApplying] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)

  const allIds = products.map(p => p.shopify_product_id || p.id)
  const allSelected = selected.size === products.length && products.length > 0

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(allIds))
  }

  function toggle(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  async function applyBulk() {
    if (!selected.size || !value.trim()) return
    setApplying(true)
    setMsg('')
    let success = 0, fail = 0

    for (const pid of Array.from(selected)) {
      const product = products.find(p => (p.shopify_product_id || p.id) === pid)
      if (!product) continue

      let payload: any = {}
      if (action === 'price') {
        const v = parseFloat(value)
        let newPrice = typeof product.price === 'number' ? product.price : 0
        if (priceType === 'set') newPrice = v
        else if (priceType === 'increase_pct') newPrice = newPrice * (1 + v / 100)
        else if (priceType === 'decrease_pct') newPrice = newPrice * (1 - v / 100)
        newPrice = Math.max(0, Math.round(newPrice * 100) / 100)
        const variants = asVariants(product.variants)
        payload = {
          variants: variants.length
            ? variants.map((variant: any, i: number) =>
                i === 0 ? { ...variant, price: newPrice.toFixed(2) } : variant)
            : [{ price: newPrice.toFixed(2) }],
        }
      } else if (action === 'tags_add') {
        const current = typeof product.tags === 'string' ? product.tags : ''
        payload = { tags: current ? current + ',' + value : value }
      } else if (action === 'status') {
        payload = { status: value }
      } else if (action === 'title_suffix') {
        payload = { title: product.title + ' ' + value }
      }

      try {
        const res = await fetch('/api/shopify/products/' + pid, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        res.ok ? success++ : fail++
      } catch { fail++ }

      await new Promise(r => setTimeout(r, 150))
    }

    setMsg(success + ' produit(s) mis à jour' + (fail > 0 ? ', ' + fail + ' échec(s)' : ''))
    setMsgOk(fail === 0)
    setApplying(false)
    setTimeout(() => setMsg(''), 6000)
  }

  const rowBase: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', borderRadius: '10px',
    cursor: 'pointer', marginBottom: '6px',
    transition: 'background 0.1s',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
  }
  const rowSel: CSSProperties = {
    ...rowBase,
    background: 'rgba(79,142,247,0.06)',
    border: '1px solid rgba(79,142,247,0.2)',
  }
  const selStyle: CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#e8ecf4',
    fontSize: '14px',
    padding: '10px 14px',
    outline: 'none',
    fontFamily: 'inherit',
    fontWeight: 400,
    boxSizing: 'border-box' as const,
  }

  function Checkbox({ checked }: { checked: boolean }) {
    return (
      <div style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        border: '1.5px solid ' + (checked ? '#4f8ef7' : 'rgba(255,255,255,0.2)'),
        background: checked ? '#4f8ef7' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
    )
  }

  return (
    <div className="bulkGrid">
      {/* ── LEFT: product list ── */}
      <div>
        {/* Select all header */}
        <div onClick={toggleAll} style={{
          ...rowBase,
          marginBottom: 12,
          background: allSelected ? 'rgba(79,142,247,0.08)' : 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Checkbox checked={allSelected} />
          <span style={{ color: '#e8ecf4', fontSize: 14, fontWeight: 500 }}>
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </span>
          {selected.size > 0 && (
            <span style={{ marginLeft: 'auto', color: '#4f8ef7', fontSize: 13, fontWeight: 500 }}>
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Products list */}
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {products.length === 0 ? (
            <p style={{ color: '#8a95b0', fontSize: 14, textAlign: 'center', padding: '40px 0', fontWeight: 400 }}>
              Synchronisez vos produits Shopify pour commencer
            </p>
          ) : products.map(p => {
            const pid = p.shopify_product_id || p.id
            const isSel = selected.has(pid)
            const img = asImageUrls(p.images)[0]
            const price = typeof p.price === 'number' ? p.price : Number(p.price || 0)
            return (
              <div key={pid} onClick={() => toggle(pid)} style={isSel ? rowSel : rowBase}>
                <Checkbox checked={isSel} />
                {img ? (
                  <img src={img} alt={p.title}
                    style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                    onError={e => { e.currentTarget.style.display = 'none' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#e8ecf4', fontSize: 13, fontWeight: 500, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </p>
                  <p style={{ color: '#8a95b0', fontSize: 12, margin: 0, fontWeight: 400 }}>
                    {p.vendor || 'Sans fournisseur'}
                  </p>
                </div>
                <span style={{ color: '#4f8ef7', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {price > 0 ? price.toFixed(2) + '€' : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── RIGHT: action panel ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: 20,
        position: 'sticky', top: 24, alignSelf: 'start',
      }}>
        <p style={{ color: '#e8ecf4', fontSize: 15, fontWeight: 600, margin: '0 0 20px' }}>
          Action en masse
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Action type */}
          <div>
            <label style={{ color: '#8a95b0', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6, letterSpacing: '0.02em' }}>
              TYPE D&apos;ACTION
            </label>
            <select value={action} onChange={e => setAction(e.target.value as any)} style={selStyle}>
              <option value="price">Modifier le prix</option>
              <option value="tags_add">Ajouter des tags</option>
              <option value="status">Changer le statut</option>
              <option value="title_suffix">Ajouter au titre</option>
            </select>
          </div>

          {/* Price sub-option */}
          {action === 'price' && (
            <div>
              <label style={{ color: '#8a95b0', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                MÉTHODE
              </label>
              <select value={priceType} onChange={e => setPriceType(e.target.value as any)} style={selStyle}>
                <option value="set">Fixer à (€)</option>
                <option value="increase_pct">Augmenter de (%)</option>
                <option value="decrease_pct">Réduire de (%)</option>
              </select>
            </div>
          )}

          {/* Value */}
          <div>
            <label style={{ color: '#8a95b0', fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              {action === 'price' ? (priceType === 'set' ? 'NOUVEAU PRIX (€)' : 'POURCENTAGE (%)')
                : action === 'tags_add' ? 'TAGS À AJOUTER'
                : action === 'status' ? 'STATUT'
                : 'TEXTE À AJOUTER'}
            </label>
            {action === 'status' ? (
              <select value={value} onChange={e => setValue(e.target.value)} style={selStyle}>
                <option value="">Choisir...</option>
                <option value="active">Actif</option>
                <option value="draft">Brouillon</option>
                <option value="archived">Archivé</option>
              </select>
            ) : (
              <input
                type={action === 'price' ? 'number' : 'text'}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={
                  action === 'price' ? (priceType === 'set' ? 'ex: 29.99' : 'ex: 20')
                    : action === 'tags_add' ? 'ex: promo, soldes'
                    : 'ex: - Édition limitée'
                }
                style={selStyle}
                min={action === 'price' ? '0' : undefined}
                step={action === 'price' ? '0.01' : undefined}
              />
            )}
          </div>

          {/* Apply button */}
          <button
            onClick={applyBulk}
            disabled={applying || !selected.size || !value.trim()}
            style={{
              width: '100%', padding: 12,
              background: applying || !selected.size || !value.trim()
                ? 'rgba(79,142,247,0.15)' : '#4f8ef7',
              color: applying || !selected.size || !value.trim() ? '#4f8ef7' : '#fff',
              border: '1px solid rgba(79,142,247,0.3)',
              borderRadius: 10, fontSize: 14, fontWeight: 500,
              cursor: applying || !selected.size ? 'not-allowed' : 'pointer',
            }}>
            {applying ? 'Application...'
              : selected.size > 0
                ? 'Appliquer aux ' + selected.size + ' produit(s)'
                : 'Sélectionnez des produits'}
          </button>

          {msg && (
            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 500, color: msgOk ? '#10b981' : '#f87171', margin: 0 }}>
              {msg}
            </p>
          )}

          {selected.size === 0 && (
            <p style={{ color: '#555f7a', fontSize: 12, textAlign: 'center', margin: 0, fontWeight: 400 }}>
              Cochez des produits dans la liste de gauche
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [syncMsg, setSyncMsg] = useState('')
  const [syncOk, setSyncOk] = useState(true)
  const [saveMsg, setSaveMsg] = useState('')

  const [selected, setSelected] = useState<Product | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [hasShop, setHasShop] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<'products' | 'bulk'>('products')

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total])

  const fetchProducts = useCallback(async (nextPage = 1, nextSearch = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PER_PAGE), page: String(nextPage) })
      if (nextSearch.trim()) params.set('search', nextSearch.trim())
      const res = await fetch('/api/shopify/products?' + params.toString(), { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setProducts(Array.isArray(body.products) ? body.products : [])
        setTotal(typeof body.total === 'number' ? body.total : 0)
        setHasShop(true)
        return
      }
      if (res.status === 400) setHasShop(false)
      setProducts([]); setTotal(0)
      setSyncMsg(body.error || 'Erreur API ' + res.status); setSyncOk(false)
    } catch {
      setProducts([]); setTotal(0)
      setSyncMsg('Erreur reseau'); setSyncOk(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Produits - EcomPilot Elite'
    fetchProducts(1, '')
  }, [fetchProducts])

  async function doSync() {
    setSyncing(true); setSyncMsg('Synchronisation en cours...'); setSyncOk(true)
    try {
      const res = await fetch('/api/shopify/sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setSyncMsg(data.synced + ' produits synchronises depuis ' + (data.shop || 'la boutique'))
        setSyncOk(true); setPage(1); await fetchProducts(1, search)
      } else {
        setSyncMsg(data.error || 'Erreur de synchronisation'); setSyncOk(false)
      }
    } catch { setSyncMsg('Erreur reseau'); setSyncOk(false) }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(''), 6000) }
  }

  function openEdit(p: Product) {
    setSelected(p); setSaveMsg('')
    const variants = asVariants(p.variants)
    const firstVariant = variants[0] || {}
    const pPrice = typeof p.price === 'number' ? p.price : Number(firstVariant.price || 0)
    setEdit({
      title: p.title || '',
      description: p.body_html || p.description || '',
      price: Number.isFinite(pPrice) ? String(pPrice) : '',
      compareAtPrice: p.compare_at_price == null ? '' : String(p.compare_at_price),
      tags: p.tags || '',
      vendor: p.vendor || '',
    })
  }

  async function doSave() {
    if (!selected || !edit) return
    const pid = selected.shopify_product_id || selected.id
    if (!pid) return
    setSaving(true); setSaveMsg('')
    try {
      const variants = asVariants(selected.variants)
      const updatedVariants = variants.length
        ? variants.map((v, idx) =>
            idx === 0 ? { ...v, price: edit.price, compare_at_price: edit.compareAtPrice.trim() ? edit.compareAtPrice : null } : v)
        : [{ price: edit.price, compare_at_price: edit.compareAtPrice.trim() ? edit.compareAtPrice : null }]

      const res = await fetch('/api/shopify/products/' + pid, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: edit.title, body_html: edit.description,
          vendor: edit.vendor, tags: edit.tags, variants: updatedVariants,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSaveMsg(data.error || 'Erreur de sauvegarde'); return }
      setSaveMsg('Mis a jour sur Shopify')
      const nextPrice = parsePrice(edit.price)
      const nextCompareAt = parsePrice(edit.compareAtPrice)
      setProducts(prev => prev.map(p => {
        const id = p.shopify_product_id || p.id
        if (id !== pid) return p
        return { ...p, title: edit.title, body_html: edit.description, vendor: edit.vendor, tags: edit.tags, price: nextPrice ?? p.price, compare_at_price: nextCompareAt }
      }))
    } catch { setSaveMsg('Erreur reseau') }
    finally { setSaving(false) }
  }

  const onSearchChange = (v: string) => { setSearch(v); setPage(1); fetchProducts(1, v) }
  const onPageChange = (n: number) => {
    const safe = Math.max(1, Math.min(totalPages, n))
    setPage(safe); fetchProducts(safe, search)
  }

  return (
    <div className="productsPage">
      {/* ── Header ── */}
      <div className="headerRow">
        <div>
          <h1 className="title">Produits Shopify</h1>
          <p className="subtitle">
            {total > 0 ? total + ' produit' + (total > 1 ? 's' : '') : 'Synchronisez pour voir vos produits'}
          </p>
        </div>
        <div className="headerActions">
          {syncMsg && (
            <span style={{ color: syncOk ? '#10b981' : '#f87171', fontSize: 13, fontWeight: 500 }}>
              {syncMsg}
            </span>
          )}
          <button className="primaryBtn" onClick={doSync} disabled={syncing}>
            {syncing ? 'Synchronisation...' : 'Synchroniser Shopify'}
          </button>
        </div>
      </div>

      {hasShop === false && (
        <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: '#e8ecf4', fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>
            Aucune boutique connectee
          </p>
          <p style={{ color: '#8a95b0', fontSize: 14, fontWeight: 400, margin: '0 0 20px' }}>
            Connectez votre boutique Shopify pour voir et modifier vos produits.
          </p>
          <a href="/dashboard/shops" className="primaryBtn" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Connecter une boutique
          </a>
        </div>
      )}

      {hasShop !== false && (
        <>
          {/* ── Tab switcher ── */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
            {([['products', 'Produits'], ['bulk', 'Modifier en masse']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                padding: '10px 20px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 14, fontWeight: 500,
                color: activeTab === id ? '#e8ecf4' : '#555f7a',
                borderBottom: '2px solid ' + (activeTab === id ? '#4f8ef7' : 'transparent'),
              }}>{label}</button>
            ))}
          </div>

          {/* ── Products tab ── */}
          {activeTab === 'products' && (
            <div className={'mainGrid' + (selected && edit ? ' withEditor' : '')}>
              <section>
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text" placeholder="Rechercher un produit..."
                    value={search} onChange={e => onSearchChange(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {loading && (
                  <div style={{ ...cardStyle, padding: '42px 16px', textAlign: 'center' }}>
                    <p style={{ color: '#8a95b0', fontSize: 14, fontWeight: 400, margin: 0 }}>Chargement...</p>
                  </div>
                )}

                {!loading && products.length === 0 && (
                  <div style={{ ...cardStyle, padding: '42px 16px', textAlign: 'center' }}>
                    <p style={{ color: '#e8ecf4', fontSize: 16, fontWeight: 500, margin: '0 0 8px' }}>Aucun produit</p>
                    <p style={{ color: '#8a95b0', fontSize: 14, fontWeight: 400, margin: '0 0 14px' }}>
                      Cliquez sur Synchroniser Shopify pour importer vos produits.
                    </p>
                    <button className="primaryBtn" onClick={doSync} disabled={syncing}>
                      {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                    </button>
                  </div>
                )}

                {!loading && products.length > 0 && (
                  <div className="productGrid">
                    {products.map(p => {
                      const id = p.shopify_product_id || p.id
                      const isSelected = (selected?.shopify_product_id || selected?.id) === id
                      const image = asImageUrls(p.images)[0]
                      const priceNum = typeof p.price === 'number' ? p.price : Number(p.price || 0)
                      return (
                        <button type="button" key={id}
                          className={'productCard' + (isSelected ? ' selected' : '')}
                          onClick={() => openEdit(p)}>
                          <div className="thumbWrap">
                            {image
                              ? <img src={image} alt={p.title} className="thumb" />
                              : <div className="thumbEmpty">Image indisponible</div>}
                          </div>
                          <div className="cardInfo">
                            <p className="prodTitle">{p.title}</p>
                            <p className="prodPrice">
                              {Number.isFinite(priceNum) && priceNum > 0 ? priceNum.toFixed(2) + ' EUR' : '--'}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="pager">
                    <button type="button" className="ghostBtn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>Prev</button>
                    <span className="pagerText">{page} / {totalPages}</span>
                    <button type="button" className="ghostBtn" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>Next</button>
                  </div>
                )}
              </section>

              {selected && edit && (
                <aside className="editorPanel">
                  <div className="panelHeader">
                    <p style={{ color: '#e8ecf4', margin: 0, fontSize: 15, fontWeight: 600 }}>Modifier le produit</p>
                    <button type="button" className="closeBtn" onClick={() => { setSelected(null); setEdit(null) }}>✕</button>
                  </div>

                  {asImageUrls(selected.images)[0] && (
                    <div className="editorImageWrap">
                      <img src={asImageUrls(selected.images)[0]} alt={selected.title} className="editorImage" />
                    </div>
                  )}

                  <div className="fieldStack">
                    <label className="fieldLabel">Titre</label>
                    <input style={inputStyle} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />

                    <label className="fieldLabel">Description</label>
                    <textarea style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }}
                      value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} />

                    <div className="twoCols">
                      <div>
                        <label className="fieldLabel">Prix</label>
                        <input type="number" step="0.01" min="0" style={inputStyle}
                          value={edit.price} onChange={e => setEdit({ ...edit, price: e.target.value })} />
                      </div>
                      <div>
                        <label className="fieldLabel">Prix barre</label>
                        <input type="number" step="0.01" min="0" style={inputStyle}
                          value={edit.compareAtPrice} onChange={e => setEdit({ ...edit, compareAtPrice: e.target.value })} />
                      </div>
                    </div>

                    <label className="fieldLabel">Fournisseur</label>
                    <input style={inputStyle} value={edit.vendor} onChange={e => setEdit({ ...edit, vendor: e.target.value })} />

                    <label className="fieldLabel">Tags</label>
                    <input style={inputStyle} value={edit.tags} onChange={e => setEdit({ ...edit, tags: e.target.value })} placeholder="tag1, tag2" />
                  </div>

                  <button className="primaryBtn fullWidth" onClick={doSave} disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer sur Shopify'}
                  </button>

                  {saveMsg && (
                    <p style={{ textAlign: 'center', color: saveMsg.toLowerCase().includes('erreur') ? '#f87171' : '#10b981', fontSize: 13, fontWeight: 500, marginTop: 10 }}>
                      {saveMsg}
                    </p>
                  )}

                  <p style={{ textAlign: 'center', marginTop: 12 }}>
                    <a href={'https://admin.shopify.com/products/' + (selected.shopify_product_id || selected.id)}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: '#4f8ef7', textDecoration: 'none', fontSize: 12, fontWeight: 400 }}>
                      Ouvrir dans Shopify Admin
                    </a>
                  </p>
                </aside>
              )}
            </div>
          )}

          {/* ── Bulk tab ── */}
          {activeTab === 'bulk' && <BulkEditTab products={products} />}
        </>
      )}

      <style jsx>{`
        .productsPage {
          max-width: 1240px;
          margin: 0 auto;
          padding: 16px;
        }
        .headerRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .title {
          margin: 0;
          color: #e8ecf4;
          font-size: 20px;
          line-height: 1.25;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .subtitle {
          margin: 4px 0 0;
          color: #8a95b0;
          font-size: 14px;
          font-weight: 400;
        }
        .headerActions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .mainGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
        }
        .bulkGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 300px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 760px) {
          .bulkGrid {
            grid-template-columns: 1fr;
          }
        }
        .productGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
        .productCard {
          width: 100%;
          text-align: left;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          padding: 0;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .productCard:hover {
          border-color: rgba(255,255,255,0.15);
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .productCard.selected {
          background: rgba(79,142,247,0.08);
          border-color: rgba(79,142,247,0.4);
          box-shadow: 0 0 0 2px rgba(79,142,247,0.15);
        }
        .thumbWrap {
          width: 100%;
          padding-top: 72%;
          position: relative;
          background: rgba(255,255,255,0.03);
        }
        .thumb {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .thumbEmpty {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #555f7a;
          font-size: 11px;
          font-weight: 400;
          padding: 6px;
          text-align: center;
        }
        .cardInfo { padding: 8px 10px 10px; }
        .prodTitle {
          margin: 0 0 3px;
          color: #e8ecf4;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .prodPrice {
          margin: 0;
          color: #4f8ef7;
          font-size: 14px;
          font-weight: 600;
        }
        .editorPanel {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 16px;
          align-self: start;
        }
        .panelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .closeBtn {
          border: 0;
          background: transparent;
          color: #8a95b0;
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }
        .closeBtn:hover { background: rgba(255,255,255,0.06); }
        .editorImageWrap {
          width: 100%;
          height: 140px;
          border-radius: 10px;
          overflow: hidden;
          background: rgba(255,255,255,0.03);
          margin-bottom: 12px;
        }
        .editorImage { width: 100%; height: 100%; object-fit: contain; }
        .fieldStack { display: grid; gap: 8px; }
        .fieldLabel { color: #8a95b0; font-size: 12px; font-weight: 500; margin-top: 2px; }
        .twoCols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .primaryBtn {
          border: none;
          background: #4f8ef7;
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .primaryBtn:hover { background: #3b7de0; }
        .primaryBtn:disabled { opacity: 0.55; cursor: wait; }
        .fullWidth { width: 100%; margin-top: 14px; }
        .pager { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 14px; }
        .pagerText { color: #8a95b0; font-size: 13px; font-weight: 500; }
        .ghostBtn {
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: #e8ecf4;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          padding: 7px 14px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ghostBtn:hover { background: rgba(255,255,255,0.08); }
        .ghostBtn:disabled { opacity: 0.35; cursor: not-allowed; }
        @media (min-width: 480px) {
          .productGrid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
        }
        @media (min-width: 700px) {
          .productsPage { padding: 20px; }
          .productGrid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
        }
        @media (min-width: 1100px) {
          .mainGrid.withEditor { grid-template-columns: minmax(0, 1fr) 360px; }
          .editorPanel { position: sticky; top: 20px; max-height: calc(100vh - 64px); overflow: auto; }
        }
      `}</style>
    </div>
  )
}
