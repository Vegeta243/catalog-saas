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
  background: '#f9fafb',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  color: '#111827',
  fontSize: 14,
  fontWeight: 400,
  padding: '10px 12px',
  boxSizing: 'border-box',
  outline: 'none',
}

const cardStyle: CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
}

// ─── BULK EDIT TAB ────────────────────────────────────────────────────────────
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

    setMsg(success + ' produit(s) mis \u00e0 jour' + (fail > 0 ? ', ' + fail + ' \u00e9chec(s)' : ''))
    setMsgOk(fail === 0)
    setApplying(false)
    setTimeout(() => setMsg(''), 6000)
  }

  const rowBase: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 14px', borderRadius: '10px',
    cursor: 'pointer', marginBottom: '6px',
    transition: 'background 0.1s',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
  }
  const rowSel: CSSProperties = {
    ...rowBase,
    background: 'rgba(37,99,235,0.06)',
    border: '1px solid rgba(37,99,235,0.3)',
  }
  const selStyle: CSSProperties = {
    width: '100%',
    background: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    color: '#111827',
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
        border: '1.5px solid ' + (checked ? '#2563eb' : '#d1d5db'),
        background: checked ? '#2563eb' : '#ffffff',
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
      {/* LEFT: product list */}
      <div>
        <div onClick={toggleAll} style={{
          ...rowBase, marginBottom: 12,
          background: allSelected ? 'rgba(37,99,235,0.06)' : '#f3f4f6',
          border: allSelected ? '1px solid rgba(37,99,235,0.3)' : '1px solid #e5e7eb',
        }}>
          <Checkbox checked={allSelected} />
          <span style={{ color: '#111827', fontSize: 14, fontWeight: 600 }}>
            {allSelected ? 'Tout d\u00e9s\u00e9lectionner' : 'Tout s\u00e9lectionner'}
          </span>
          {selected.size > 0 && (
            <span style={{ marginLeft: 'auto', color: '#2563eb', fontSize: 13, fontWeight: 600 }}>
              {selected.size} s\u00e9lectionn\u00e9{selected.size > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div style={{ maxHeight: 540, overflowY: 'auto' }}>
          {products.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
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
                    style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e5e7eb' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                    background: '#f3f4f6', border: '1px solid #e5e7eb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>📦</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#111827', fontSize: 13, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title}
                  </p>
                  <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>
                    {p.vendor || 'Sans fournisseur'}
                  </p>
                </div>
                <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {price > 0 ? price.toFixed(2) + '\u20ac' : '\u2014'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* RIGHT: action panel */}
      <div style={{
        background: '#ffffff', border: '1px solid #e5e7eb',
        borderRadius: 14, padding: 20,
        position: 'sticky', top: 24, alignSelf: 'start',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <p style={{ color: '#111827', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>
          Action en masse
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Type d&apos;action
            </label>
            <select value={action} onChange={e => setAction(e.target.value as any)} style={selStyle}>
              <option value="price">Modifier le prix</option>
              <option value="tags_add">Ajouter des tags</option>
              <option value="status">Changer le statut</option>
              <option value="title_suffix">Ajouter au titre</option>
            </select>
          </div>

          {action === 'price' && (
            <div>
              <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                M\u00e9thode
              </label>
              <select value={priceType} onChange={e => setPriceType(e.target.value as any)} style={selStyle}>
                <option value="set">Fixer \u00e0 (\u20ac)</option>
                <option value="increase_pct">Augmenter de (%)</option>
                <option value="decrease_pct">R\u00e9duire de (%)</option>
              </select>
            </div>
          )}

          <div>
            <label style={{ color: '#374151', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {action === 'price' ? (priceType === 'set' ? 'Nouveau prix (\u20ac)' : 'Pourcentage (%)')
                : action === 'tags_add' ? 'Tags \u00e0 ajouter'
                : action === 'status' ? 'Statut'
                : 'Texte \u00e0 ajouter'}
            </label>
            {action === 'status' ? (
              <select value={value} onChange={e => setValue(e.target.value)} style={selStyle}>
                <option value="">Choisir...</option>
                <option value="active">Actif</option>
                <option value="draft">Brouillon</option>
                <option value="archived">Archiv\u00e9</option>
              </select>
            ) : (
              <input
                type={action === 'price' ? 'number' : 'text'}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={
                  action === 'price' ? (priceType === 'set' ? 'ex: 29.99' : 'ex: 20')
                    : action === 'tags_add' ? 'ex: promo, soldes'
                    : 'ex: - \u00c9dition limit\u00e9e'
                }
                style={selStyle}
                min={action === 'price' ? '0' : undefined}
                step={action === 'price' ? '0.01' : undefined}
              />
            )}
          </div>

          <button
            onClick={applyBulk}
            disabled={applying || !selected.size || !value.trim()}
            style={{
              width: '100%', padding: '12px',
              background: applying || !selected.size || !value.trim() ? '#f3f4f6' : '#2563eb',
              color: applying || !selected.size || !value.trim() ? '#9ca3af' : '#ffffff',
              border: '1px solid ' + (applying || !selected.size || !value.trim() ? '#e5e7eb' : '#2563eb'),
              borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: applying || !selected.size ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}>
            {applying ? 'Application en cours...'
              : selected.size > 0
                ? 'Appliquer aux ' + selected.size + ' produit(s)'
                : 'S\u00e9lectionnez des produits'}
          </button>

          {msg && (
            <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: msgOk ? '#059669' : '#dc2626', margin: 0 }}>
              {msg}
            </p>
          )}

          {selected.size === 0 && !msg && (
            <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', margin: 0 }}>
              Cochez des produits dans la liste de gauche
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
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
      setSyncMsg('Erreur r\u00e9seau'); setSyncOk(false)
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
        setSyncMsg(data.synced + ' produits synchronis\u00e9s depuis ' + (data.shop || 'la boutique'))
        setSyncOk(true); setPage(1); await fetchProducts(1, search)
      } else {
        setSyncMsg(data.error || 'Erreur de synchronisation'); setSyncOk(false)
      }
    } catch { setSyncMsg('Erreur r\u00e9seau'); setSyncOk(false) }
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
      setSaveMsg('Mis \u00e0 jour sur Shopify \u2713')
      const nextPrice = parsePrice(edit.price)
      const nextCompareAt = parsePrice(edit.compareAtPrice)
      setProducts(prev => prev.map(p => {
        const id = p.shopify_product_id || p.id
        if (id !== pid) return p
        return { ...p, title: edit.title, body_html: edit.description, vendor: edit.vendor, tags: edit.tags, price: nextPrice ?? p.price, compare_at_price: nextCompareAt }
      }))
    } catch { setSaveMsg('Erreur r\u00e9seau') }
    finally { setSaving(false) }
  }

  const onSearchChange = (v: string) => { setSearch(v); setPage(1); fetchProducts(1, v) }
  const onPageChange = (n: number) => {
    const safe = Math.max(1, Math.min(totalPages, n))
    setPage(safe); fetchProducts(safe, search)
  }

  return (
    <div className="productsPage">
      {/* Header */}
      <div className="headerRow">
        <div>
          <h1 className="pageTitle">Produits Shopify</h1>
          <p className="pageSubtitle">
            {total > 0 ? total + ' produit' + (total > 1 ? 's' : '') + ' synchronis\u00e9' + (total > 1 ? 's' : '') : 'Synchronisez pour voir vos produits'}
          </p>
        </div>
        <div className="headerActions">
          {syncMsg && (
            <span style={{ color: syncOk ? '#059669' : '#dc2626', fontSize: 13, fontWeight: 600 }}>
              {syncMsg}
            </span>
          )}
          <button className="primaryBtn" onClick={doSync} disabled={syncing}>
            {syncing ? 'Synchronisation...' : '\u21ba Synchroniser Shopify'}
          </button>
        </div>
      </div>

      {hasShop === false && (
        <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ color: '#111827', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
            Aucune boutique connect\u00e9e
          </p>
          <p style={{ color: '#374151', fontSize: 14, margin: '0 0 20px' }}>
            Connectez votre boutique Shopify pour voir et modifier vos produits.
          </p>
          <a href="/dashboard/shops" className="primaryBtn" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Connecter une boutique
          </a>
        </div>
      )}

      {hasShop !== false && (
        <>
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: 20 }}>
            {([['products', 'Produits'], ['bulk', 'Modifier en masse']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                padding: '10px 20px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 14, fontWeight: 600,
                color: activeTab === id ? '#111827' : '#6b7280',
                borderBottom: '2px solid ' + (activeTab === id ? '#2563eb' : 'transparent'),
                marginBottom: '-2px',
              }}>{label}</button>
            ))}
          </div>

          {/* Products tab */}
          {activeTab === 'products' && (
            <div className={'mainGrid' + (selected && edit ? ' withEditor' : '')}>
              <section>
                <div style={{ marginBottom: 14 }}>
                  <input
                    type="text" placeholder="\ud83d\udd0d  Rechercher un produit..."
                    value={search} onChange={e => onSearchChange(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {loading && (
                  <div style={{ textAlign: 'center', padding: '60px 16px' }}>
                    <p style={{ color: '#6b7280', fontSize: 14 }}>Chargement des produits...</p>
                  </div>
                )}

                {!loading && products.length === 0 && (
                  <div style={{ ...cardStyle, padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                    <p style={{ color: '#111827', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Aucun produit</p>
                    <p style={{ color: '#374151', fontSize: 14, margin: '0 0 20px' }}>
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
                              ? <img src={image} alt={p.title} className="thumb"
                                  onError={e => { (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class=\"thumbEmpty\">\ud83d\udce6</div>' }} />
                              : <div className="thumbEmpty">\ud83d\udce6</div>}
                          </div>
                          <div className="cardInfo">
                            <p className="prodTitle">{p.title}</p>
                            {p.vendor && <p className="prodVendor">{p.vendor}</p>}
                            <p className="prodPrice">
                              {Number.isFinite(priceNum) && priceNum > 0 ? priceNum.toFixed(2) + ' \u20ac' : '--'}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="pager">
                    <button type="button" className="ghostBtn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>\u2190 Pr\u00e9c.</button>
                    <span className="pagerText">Page {page} / {totalPages}</span>
                    <button type="button" className="ghostBtn" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>Suiv. \u2192</button>
                  </div>
                )}
              </section>

              {selected && edit && (
                <aside className="editorPanel">
                  <div className="panelHeader">
                    <p style={{ color: '#111827', margin: 0, fontSize: 15, fontWeight: 700 }}>Modifier le produit</p>
                    <button type="button" className="closeBtn" onClick={() => { setSelected(null); setEdit(null) }}>\u2715</button>
                  </div>

                  <div className="editorImageWrap">
                    {asImageUrls(selected.images)[0]
                      ? <img src={asImageUrls(selected.images)[0]} alt={selected.title} className="editorImage" />
                      : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 40 }}>\ud83d\udce6</div>
                    }
                  </div>

                  <div className="fieldStack">
                    <label className="fieldLabel">Titre</label>
                    <input style={inputStyle} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />

                    <label className="fieldLabel">Description</label>
                    <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                      value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} />

                    <div className="twoCols">
                      <div>
                        <label className="fieldLabel">Prix (\u20ac)</label>
                        <input type="number" step="0.01" min="0" style={inputStyle}
                          value={edit.price} onChange={e => setEdit({ ...edit, price: e.target.value })} />
                      </div>
                      <div>
                        <label className="fieldLabel">Prix barr\u00e9</label>
                        <input type="number" step="0.01" min="0" style={inputStyle}
                          value={edit.compareAtPrice} onChange={e => setEdit({ ...edit, compareAtPrice: e.target.value })} />
                      </div>
                    </div>

                    <label className="fieldLabel">Fournisseur</label>
                    <input style={inputStyle} value={edit.vendor} onChange={e => setEdit({ ...edit, vendor: e.target.value })} />

                    <label className="fieldLabel">Tags (s\u00e9par\u00e9s par des virgules)</label>
                    <input style={inputStyle} value={edit.tags} onChange={e => setEdit({ ...edit, tags: e.target.value })} placeholder="tag1, tag2, promo" />
                  </div>

                  <button className="primaryBtn fullWidth" onClick={doSave} disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer sur Shopify'}
                  </button>

                  {saveMsg && (
                    <p style={{ textAlign: 'center', color: saveMsg.includes('rreur') ? '#dc2626' : '#059669', fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                      {saveMsg}
                    </p>
                  )}

                  <p style={{ textAlign: 'center', marginTop: 14 }}>
                    <a href={'https://admin.shopify.com/products/' + (selected.shopify_product_id || selected.id)}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12 }}>
                      Ouvrir dans Shopify Admin \u2197
                    </a>
                  </p>
                </aside>
              )}
            </div>
          )}

          {/* Bulk tab */}
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
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .pageTitle {
          margin: 0 0 4px;
          color: #111827;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .pageSubtitle {
          margin: 0;
          color: #374151;
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
          grid-template-columns: minmax(0, 1fr) 310px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 760px) {
          .bulkGrid { grid-template-columns: 1fr; }
        }
        .productGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }
        .productCard {
          width: 100%;
          text-align: left;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          padding: 0;
          transition: box-shadow 0.15s, border-color 0.15s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .productCard:hover {
          border-color: #93c5fd;
          box-shadow: 0 4px 12px rgba(37,99,235,0.1);
        }
        .productCard.selected {
          background: #eff6ff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.2);
        }
        .thumbWrap {
          width: 100%;
          padding-top: 75%;
          position: relative;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
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
          font-size: 28px;
        }
        .cardInfo { padding: 8px 10px 10px; }
        .prodTitle {
          margin: 0 0 2px;
          color: #111827;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.4;
        }
        .prodVendor {
          margin: 0 0 3px;
          color: #6b7280;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .prodPrice {
          margin: 0;
          color: #2563eb;
          font-size: 13px;
          font-weight: 700;
        }
        .editorPanel {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          align-self: start;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .panelHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
        }
        .closeBtn {
          border: 0;
          background: transparent;
          color: #9ca3af;
          font-size: 16px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
          line-height: 1;
        }
        .closeBtn:hover { background: #f3f4f6; color: #374151; }
        .editorImageWrap {
          width: 100%;
          height: 160px;
          border-radius: 10px;
          overflow: hidden;
          background: #f3f4f6;
          margin-bottom: 14px;
          border: 1px solid #e5e7eb;
        }
        .editorImage { width: 100%; height: 100%; object-fit: contain; }
        .fieldStack { display: grid; gap: 10px; margin-bottom: 16px; }
        .fieldLabel { color: #374151; font-size: 12px; font-weight: 600; margin-top: 2px; display: block; }
        .twoCols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .primaryBtn {
          border: none;
          background: #2563eb;
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 18px;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .primaryBtn:hover { background: #1d4ed8; }
        .primaryBtn:disabled { opacity: 0.5; cursor: wait; }
        .fullWidth { width: 100%; }
        .pager { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 20px; }
        .pagerText { color: #374151; font-size: 13px; font-weight: 600; }
        .ghostBtn {
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #374151;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          padding: 7px 14px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ghostBtn:hover { background: #f9fafb; }
        .ghostBtn:disabled { opacity: 0.4; cursor: not-allowed; }
        @media (min-width: 480px) {
          .productGrid { grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); }
        }
        @media (min-width: 700px) {
          .productsPage { padding: 20px; }
          .productGrid { grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: 12px; }
        }
        @media (min-width: 1100px) {
          .mainGrid.withEditor { grid-template-columns: minmax(0, 1fr) 360px; }
          .editorPanel { position: sticky; top: 20px; max-height: calc(100vh - 64px); overflow-y: auto; }
        }
      `}</style>
    </div>
  )
}
