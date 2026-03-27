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
  width: '100%', background: '#f9fafb', border: '1px solid #d1d5db',
  borderRadius: 8, color: '#111827', fontSize: 14, fontWeight: 400,
  padding: '8px 12px', boxSizing: 'border-box', outline: 'none',
}

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
  const [hasShop, setHasShop] = useState<boolean | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Bulk action
  const [action, setAction] = useState<'price' | 'tags_add' | 'status' | 'title_suffix'>('price')
  const [priceType, setPriceType] = useState<'set' | 'increase_pct' | 'decrease_pct'>('set')
  const [bulkValue, setBulkValue] = useState('')
  const [applying, setApplying] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')
  const [bulkMsgOk, setBulkMsgOk] = useState(true)

  // Edit modal
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [editState, setEditState] = useState<EditState | null>(null)

  const allIds = products.map(p => p.shopify_product_id || p.id)
  const allSelected = selectedIds.size > 0 && selectedIds.size === products.length
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
      setSyncMsg('Erreur réseau'); setSyncOk(false)
    } finally { setLoading(false) }
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
        setSyncMsg(data.synced + ' produits synchronisés depuis ' + (data.shop || 'la boutique'))
        setSyncOk(true); setPage(1); await fetchProducts(1, search)
      } else {
        setSyncMsg(data.error || 'Erreur de synchronisation'); setSyncOk(false)
      }
    } catch { setSyncMsg('Erreur réseau'); setSyncOk(false) }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(''), 7000) }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedIds(next)
  }

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allIds))
  }

  function clearSelection() {
    setSelectedIds(new Set()); setBulkValue(''); setBulkMsg('')
  }

  async function applyBulk() {
    if (!selectedIds.size || (action !== 'status' && !bulkValue.trim())) return
    setApplying(true); setBulkMsg('')
    let success = 0, fail = 0

    for (const pid of Array.from(selectedIds)) {
      const product = products.find(p => (p.shopify_product_id || p.id) === pid)
      if (!product) continue

      let payload: any = {}
      if (action === 'price') {
        const v = parseFloat(bulkValue)
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
        payload = { tags: current ? current + ',' + bulkValue : bulkValue }
      } else if (action === 'status') {
        payload = { status: bulkValue }
      } else if (action === 'title_suffix') {
        payload = { title: product.title + ' ' + bulkValue }
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

    setBulkMsg(success + ' produit(s) mis à jour' + (fail > 0 ? ', ' + fail + ' échec(s)' : ''))
    setBulkMsgOk(fail === 0)
    setApplying(false)
    setTimeout(() => setBulkMsg(''), 7000)
  }

  function openEdit(p: Product) {
    setEditProduct(p); setSaveMsg('')
    const variants = asVariants(p.variants)
    const firstVariant = variants[0] || {}
    const pPrice = typeof p.price === 'number' ? p.price : Number(firstVariant.price || 0)
    setEditState({
      title: p.title || '',
      description: p.body_html || p.description || '',
      price: Number.isFinite(pPrice) ? String(pPrice) : '',
      compareAtPrice: p.compare_at_price == null ? '' : String(p.compare_at_price),
      tags: p.tags || '',
      vendor: p.vendor || '',
    })
  }

  function closeModal() { setEditProduct(null); setEditState(null); setSaveMsg('') }

  async function doSave() {
    if (!editProduct || !editState) return
    const pid = editProduct.shopify_product_id || editProduct.id
    if (!pid) return
    setSaving(true); setSaveMsg('')
    try {
      const variants = asVariants(editProduct.variants)
      const updatedVariants = variants.length
        ? variants.map((v, idx) =>
            idx === 0 ? { ...v, price: editState.price, compare_at_price: editState.compareAtPrice.trim() ? editState.compareAtPrice : null } : v)
        : [{ price: editState.price, compare_at_price: editState.compareAtPrice.trim() ? editState.compareAtPrice : null }]
      const res = await fetch('/api/shopify/products/' + pid, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editState.title, body_html: editState.description, vendor: editState.vendor, tags: editState.tags, variants: updatedVariants }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSaveMsg(data.error || 'Erreur de sauvegarde'); return }
      setSaveMsg('Mis à jour sur Shopify ✓')
      const nextPrice = parsePrice(editState.price)
      const nextCompareAt = parsePrice(editState.compareAtPrice)
      setProducts(prev => prev.map(p => {
        const id = p.shopify_product_id || p.id
        if (id !== pid) return p
        return { ...p, title: editState.title, body_html: editState.description, vendor: editState.vendor, tags: editState.tags, price: nextPrice ?? p.price, compare_at_price: nextCompareAt }
      }))
    } catch { setSaveMsg('Erreur réseau') }
    finally { setSaving(false) }
  }

  const onSearchChange = (v: string) => { setSearch(v); setPage(1); fetchProducts(1, v) }
  const onPageChange = (n: number) => {
    const safe = Math.max(1, Math.min(totalPages, n))
    setPage(safe); fetchProducts(safe, search)
  }

  const selStyle: CSSProperties = {
    background: '#ffffff', border: '1px solid #d1d5db', borderRadius: 8,
    color: '#111827', fontSize: 13, padding: '7px 10px', outline: 'none',
    fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer',
  }

  const bulkReady = action === 'status' ? !!bulkValue : !!bulkValue.trim()

  return (
    <div className="productsPage">
      {/* ── Header ── */}
      <div className="headerRow">
        <div>
          <h1 className="pageTitle">Mes Produits</h1>
          <p className="pageSubtitle">
            {total > 0
              ? total + ' produit' + (total > 1 ? 's' : '') + ' synchronisé' + (total > 1 ? 's' : '')
              : 'Synchronisez pour voir vos produits'}
          </p>
        </div>
        <div className="headerActions">
          {syncMsg && (
            <span style={{ color: syncOk ? '#059669' : '#dc2626', fontSize: 13, fontWeight: 600 }}>
              {syncMsg}
            </span>
          )}
          <button className="primaryBtn" onClick={doSync} disabled={syncing}>
            {syncing ? 'Synchronisation...' : '↺ Synchroniser Shopify'}
          </button>
        </div>
      </div>

      {/* ── No shop ── */}
      {hasShop === false && (
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔗</div>
          <p style={{ color: '#111827', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Aucune boutique connectée</p>
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
          {/* ── Search + select all ── */}
          <div className="searchRow">
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="searchInput"
            />
            {products.length > 0 && (
              <button className="ghostBtn" onClick={toggleSelectAll}>
                {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            )}
          </div>

          {/* ── Bulk action bar (appears when items selected) ── */}
          {selectedIds.size > 0 && (
            <div className="bulkBar">
              <span className="bulkCount">
                {selectedIds.size} produit{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>

              <div className="bulkControls">
                {/* Action type */}
                <select value={action} onChange={e => setAction(e.target.value as any)} style={selStyle}>
                  <option value="price">Modifier le prix</option>
                  <option value="tags_add">Ajouter des tags</option>
                  <option value="status">Changer le statut</option>
                  <option value="title_suffix">Ajouter au titre</option>
                </select>

                {/* Price sub-type */}
                {action === 'price' && (
                  <select value={priceType} onChange={e => setPriceType(e.target.value as any)} style={selStyle}>
                    <option value="set">Fixer à (€)</option>
                    <option value="increase_pct">Augmenter (%)</option>
                    <option value="decrease_pct">Réduire (%)</option>
                  </select>
                )}

                {/* Value input/select */}
                {action === 'status' ? (
                  <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} style={selStyle}>
                    <option value="">Choisir...</option>
                    <option value="active">Actif</option>
                    <option value="draft">Brouillon</option>
                    <option value="archived">Archivé</option>
                  </select>
                ) : (
                  <input
                    type={action === 'price' ? 'number' : 'text'}
                    value={bulkValue}
                    onChange={e => setBulkValue(e.target.value)}
                    placeholder={action === 'price' ? (priceType === 'set' ? 'Prix...' : '%...') : action === 'tags_add' ? 'Tags...' : 'Texte...'}
                    style={{ ...selStyle, width: 120 }}
                    min={action === 'price' ? '0' : undefined}
                    step={action === 'price' ? '0.01' : undefined}
                  />
                )}

                <button
                  onClick={applyBulk}
                  disabled={applying || !bulkReady}
                  className="primaryBtn"
                  style={{ padding: '7px 16px', fontSize: 13, borderRadius: 8 }}
                >
                  {applying ? 'Application...' : 'Appliquer'}
                </button>
                <button onClick={clearSelection} className="ghostBtn" style={{ padding: '7px 12px', fontSize: 13 }}>
                  ✕ Annuler
                </button>
              </div>

              {bulkMsg && (
                <div style={{ width: '100%', color: bulkMsgOk ? '#059669' : '#dc2626', fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                  {bulkMsg}
                </div>
              )}
            </div>
          )}

          {/* ── Loading ── */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ color: '#6b7280', fontSize: 14 }}>Chargement des produits...</p>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && products.length === 0 && (
            <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
              <p style={{ color: '#111827', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Aucun produit trouvé</p>
              <p style={{ color: '#374151', fontSize: 14, margin: '0 0 20px' }}>
                Cliquez sur Synchroniser Shopify pour importer vos produits.
              </p>
              <button className="primaryBtn" onClick={doSync} disabled={syncing}>
                {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
              </button>
            </div>
          )}

          {/* ── Products grid ── */}
          {!loading && products.length > 0 && (
            <div className="productGrid">
              {products.map(p => {
                const id = p.shopify_product_id || p.id
                const isSel = selectedIds.has(id)
                const image = asImageUrls(p.images)[0]
                const priceNum = typeof p.price === 'number' ? p.price : Number(p.price || 0)
                return (
                  <div key={id} className={'productCard' + (isSel ? ' selected' : '')}>
                    {/* Checkbox overlay */}
                    <div
                      className={'cardCheck' + (isSel ? ' on' : '')}
                      onClick={e => { e.stopPropagation(); toggleSelect(id) }}
                    >
                      {isSel && (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M1.5 5.5l2.5 2.5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Image */}
                    <div className="thumbWrap" onClick={() => openEdit(p)}>
                      {image && (
                        <img
                          src={image} alt={p.title} className="thumb"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <div className="thumbFallback" style={{ display: image ? 'none' : 'flex' }}>📦</div>
                    </div>

                    {/* Info */}
                    <div className="cardInfo" onClick={() => openEdit(p)}>
                      <p className="prodTitle" title={p.title}>{p.title}</p>
                      {p.vendor && <p className="prodVendor">{p.vendor}</p>}
                      <p className="prodPrice">
                        {Number.isFinite(priceNum) && priceNum > 0 ? priceNum.toFixed(2) + ' €' : '—'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="pager">
              <button className="ghostBtn" onClick={() => onPageChange(page - 1)} disabled={page === 1}>← Préc.</button>
              <span className="pagerText">Page {page} / {totalPages}</span>
              <button className="ghostBtn" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>Suiv. →</button>
            </div>
          )}
        </>
      )}

      {/* ── Edit modal ── */}
      {editProduct && editState && (
        <div className="overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modalHead">
              <h2 className="modalTitle">Modifier le produit</h2>
              <button className="closeBtn" onClick={closeModal}>✕</button>
            </div>

            {/* Product image */}
            <div className="modalImgWrap">
              {asImageUrls(editProduct.images)[0]
                ? <img src={asImageUrls(editProduct.images)[0]} alt={editProduct.title} className="modalImg" />
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 48 }}>📦</div>
              }
            </div>

            <div className="fieldGrid">
              <div className="fieldFull">
                <label className="fieldLabel">Titre</label>
                <input style={inputStyle} value={editState.title} onChange={e => setEditState({ ...editState, title: e.target.value })} />
              </div>
              <div className="fieldFull">
                <label className="fieldLabel">Description</label>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                  value={editState.description} onChange={e => setEditState({ ...editState, description: e.target.value })} />
              </div>
              <div>
                <label className="fieldLabel">Prix (€)</label>
                <input type="number" step="0.01" min="0" style={inputStyle}
                  value={editState.price} onChange={e => setEditState({ ...editState, price: e.target.value })} />
              </div>
              <div>
                <label className="fieldLabel">Prix barré (€)</label>
                <input type="number" step="0.01" min="0" style={inputStyle}
                  value={editState.compareAtPrice} onChange={e => setEditState({ ...editState, compareAtPrice: e.target.value })} />
              </div>
              <div>
                <label className="fieldLabel">Fournisseur</label>
                <input style={inputStyle} value={editState.vendor} onChange={e => setEditState({ ...editState, vendor: e.target.value })} />
              </div>
              <div>
                <label className="fieldLabel">Tags</label>
                <input style={inputStyle} value={editState.tags} onChange={e => setEditState({ ...editState, tags: e.target.value })} placeholder="tag1, tag2" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="primaryBtn" onClick={doSave} disabled={saving} style={{ flex: 1 }}>
                {saving ? 'Enregistrement...' : 'Enregistrer sur Shopify'}
              </button>
              <button className="ghostBtn" onClick={closeModal}>Annuler</button>
            </div>

            {saveMsg && (
              <p style={{ textAlign: 'center', color: saveMsg.includes('rreur') ? '#dc2626' : '#059669', fontSize: 13, fontWeight: 600, marginTop: 10 }}>
                {saveMsg}
              </p>
            )}

            <p style={{ textAlign: 'center', marginTop: 12 }}>
              <a
                href={'https://admin.shopify.com/products/' + (editProduct.shopify_product_id || editProduct.id)}
                target="_blank" rel="noopener noreferrer"
                style={{ color: '#2563eb', fontSize: 12, textDecoration: 'none' }}
              >
                Ouvrir dans Shopify Admin ↗
              </a>
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .productsPage { max-width: 1240px; margin: 0 auto; padding: 16px; }
        .headerRow { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .pageTitle { margin: 0 0 4px; color: #111827; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
        .pageSubtitle { margin: 0; color: #374151; font-size: 14px; }
        .headerActions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .searchRow { display: flex; gap: 10px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; }
        .searchInput {
          flex: 1; min-width: 200px;
          background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px;
          color: #111827; font-size: 14px; padding: 9px 14px; outline: none; box-sizing: border-box;
        }
        .searchInput:focus { border-color: #3b82f6; background: #ffffff; }

        /* Bulk bar */
        .bulkBar {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;
          padding: 10px 14px; margin-bottom: 14px;
        }
        .bulkCount { color: #1d4ed8; font-size: 14px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
        .bulkControls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; }

        /* Grid */
        .productGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(145px, 1fr));
          gap: 10px;
        }
        @media (min-width: 480px) { .productGrid { grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); } }
        @media (min-width: 700px) { .productsPage { padding: 20px; } .productGrid { grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); gap: 12px; } }
        @media (min-width: 1100px) { .productGrid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); } }

        /* Product card */
        .productCard {
          position: relative; background: #ffffff; border: 1px solid #e5e7eb;
          border-radius: 12px; overflow: hidden; cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: box-shadow 0.15s, border-color 0.15s;
          display: flex; flex-direction: column;
        }
        .productCard:hover { border-color: #93c5fd; box-shadow: 0 4px 14px rgba(37,99,235,0.1); }
        .productCard.selected { background: #eff6ff; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.18); }

        /* Checkbox */
        .cardCheck {
          position: absolute; top: 7px; left: 7px; z-index: 2;
          width: 22px; height: 22px; border-radius: 6px;
          border: 1.5px solid #d1d5db; background: rgba(255,255,255,0.92);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.12s;
        }
        .cardCheck:hover { border-color: #3b82f6; }
        .cardCheck.on { background: #2563eb; border-color: #2563eb; }

        /* Thumbnail */
        .thumbWrap { width: 100%; padding-top: 75%; position: relative; background: #f3f4f6; border-bottom: 1px solid #f0f0f0; }
        .thumb { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .thumbFallback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 26px; pointer-events: none; }

        /* Card info */
        .cardInfo { padding: 8px 10px 10px; flex: 1; display: flex; flex-direction: column; gap: 2px; }
        .prodTitle { margin: 0; color: #111827; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.4; }
        .prodVendor { margin: 0; color: #6b7280; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .prodPrice { margin: 0; color: #2563eb; font-size: 13px; font-weight: 700; margin-top: auto; padding-top: 4px; }

        /* Pagination */
        .pager { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 20px; }
        .pagerText { color: #374151; font-size: 13px; font-weight: 600; }

        /* Buttons */
        .primaryBtn {
          border: none; background: #2563eb; color: white;
          border-radius: 10px; font-size: 14px; font-weight: 600;
          padding: 10px 18px; cursor: pointer; transition: background 0.15s; white-space: nowrap;
        }
        .primaryBtn:hover { background: #1d4ed8; }
        .primaryBtn:disabled { opacity: 0.5; cursor: wait; }
        .ghostBtn {
          border: 1px solid #d1d5db; background: #ffffff; color: #374151;
          border-radius: 8px; font-size: 13px; font-weight: 500;
          padding: 7px 14px; cursor: pointer; transition: background 0.15s; white-space: nowrap;
        }
        .ghostBtn:hover { background: #f9fafb; border-color: #9ca3af; }
        .ghostBtn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Modal overlay */
        .overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.45);
          z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .modal {
          background: #ffffff; border-radius: 16px;
          width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto;
          padding: 20px 24px 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.2);
        }
        .modalHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6; }
        .modalTitle { margin: 0; color: #111827; font-size: 17px; font-weight: 700; }
        .closeBtn { border: 0; background: transparent; color: #9ca3af; font-size: 18px; cursor: pointer; padding: 2px 8px; border-radius: 6px; line-height: 1; }
        .closeBtn:hover { background: #f3f4f6; color: #374151; }
        .modalImgWrap { width: 100%; height: 170px; border-radius: 10px; overflow: hidden; background: #f3f4f6; margin-bottom: 16px; border: 1px solid #e5e7eb; }
        .modalImg { width: 100%; height: 100%; object-fit: contain; }
        .fieldGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .fieldFull { grid-column: 1 / -1; }
        .fieldLabel { display: block; color: #374151; font-size: 12px; font-weight: 600; margin-bottom: 5px; }
      `}</style>
    </div>
  )
}
