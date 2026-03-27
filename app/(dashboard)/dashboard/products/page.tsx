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

const palette = {
  text: '#111827',
  sub: '#6b7280',
  accent: '#2563eb',
  ok: '#16a34a',
  err: '#dc2626',
  card: '#ffffff',
  cardAlt: '#f9fafb',
  border: '#e5e7eb',
  borderStrong: '#d1d5db',
}

function asImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((img) => {
        if (typeof img === 'string') return img
        if (img && typeof img === 'object' && 'src' in img) {
          const src = (img as { src?: unknown }).src
          return typeof src === 'string' ? src : ''
        }
        return ''
      })
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    try {
      return asImageUrls(JSON.parse(value))
    } catch {
      return []
    }
  }
  return []
}

function asVariants(value: unknown): any[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
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
  background: '#ffffff',
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  color: palette.text,
  fontSize: 14,
  fontWeight: 400,
  padding: '10px 12px',
  boxSizing: 'border-box',
  outline: 'none',
}

const cardStyle: CSSProperties = {
  background: palette.card,
  border: `1px solid ${palette.border}`,
  borderRadius: 12,
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

  const [selected, setSelected] = useState<Product | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [hasShop, setHasShop] = useState<boolean | null>(null)

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PER_PAGE)), [total])

  const fetchProducts = useCallback(async (nextPage = 1, nextSearch = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(PER_PAGE),
        page: String(nextPage),
      })
      if (nextSearch.trim()) params.set('search', nextSearch.trim())

      const res = await fetch(`/api/shopify/products?${params.toString()}`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        setProducts(Array.isArray(body.products) ? body.products : [])
        setTotal(typeof body.total === 'number' ? body.total : 0)
        setHasShop(true)
        return
      }

      if (res.status === 400) {
        setHasShop(false)
      }

      setProducts([])
      setTotal(0)
      setSyncMsg(body.error || `Erreur API ${res.status}`)
      setSyncOk(false)
    } catch {
      setProducts([])
      setTotal(0)
      setSyncMsg('Erreur reseau')
      setSyncOk(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = 'Produits - EcomPilot Elite'
    fetchProducts(1, '')
  }, [fetchProducts])

  async function doSync() {
    setSyncing(true)
    setSyncMsg('Synchronisation en cours...')
    setSyncOk(true)
    try {
      const res = await fetch('/api/shopify/sync', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setSyncMsg(`${data.synced || 0} produits synchronises depuis ${data.shop || 'la boutique'}`)
        setSyncOk(true)
        setPage(1)
        await fetchProducts(1, search)
      } else {
        setSyncMsg(data.error || 'Erreur de synchronisation')
        setSyncOk(false)
      }
    } catch {
      setSyncMsg('Erreur reseau')
      setSyncOk(false)
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 6000)
    }
  }

  function openEdit(p: Product) {
    setSelected(p)
    setSaveMsg('')
    const variants = asVariants(p.variants)
    const firstVariant = variants[0] || {}
    const pPrice = typeof p.price === 'number' ? p.price : Number(firstVariant.price || 0)

    setEdit({
      title: p.title || '',
      description: p.body_html || p.description || '',
      price: Number.isFinite(pPrice) ? String(pPrice) : '',
      compareAtPrice:
        p.compare_at_price === null || p.compare_at_price === undefined
          ? ''
          : String(p.compare_at_price),
      tags: p.tags || '',
      vendor: p.vendor || '',
    })
  }

  async function doSave() {
    if (!selected || !edit) return

    const pid = selected.shopify_product_id || selected.id
    if (!pid) return

    setSaving(true)
    setSaveMsg('')

    try {
      const variants = asVariants(selected.variants)
      const updatedVariants = variants.length
        ? variants.map((v, idx) =>
            idx === 0
              ? {
                  ...v,
                  price: edit.price,
                  compare_at_price: edit.compareAtPrice.trim() ? edit.compareAtPrice : null,
                }
              : v
          )
        : [
            {
              price: edit.price,
              compare_at_price: edit.compareAtPrice.trim() ? edit.compareAtPrice : null,
            },
          ]

      const res = await fetch(`/api/shopify/products/${pid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: edit.title,
          body_html: edit.description,
          vendor: edit.vendor,
          tags: edit.tags,
          variants: updatedVariants,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSaveMsg(data.error || 'Erreur de sauvegarde')
        return
      }

      setSaveMsg('Mis a jour sur Shopify')
      const nextPrice = parsePrice(edit.price)
      const nextCompareAt = parsePrice(edit.compareAtPrice)

      setProducts((prev) =>
        prev.map((p) => {
          const id = p.shopify_product_id || p.id
          if (id !== pid) return p
          return {
            ...p,
            title: edit.title,
            body_html: edit.description,
            vendor: edit.vendor,
            tags: edit.tags,
            price: nextPrice ?? p.price,
            compare_at_price: nextCompareAt,
          }
        })
      )
    } catch {
      setSaveMsg('Erreur reseau')
    } finally {
      setSaving(false)
    }
  }

  const onSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
    fetchProducts(1, value)
  }

  const onPageChange = (nextPage: number) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage))
    setPage(safePage)
    fetchProducts(safePage, search)
  }

  return (
    <div className="productsPage">
      <div className="headerRow">
        <div>
          <h1 className="title">Produits Shopify</h1>
          <p className="subtitle">
            {total > 0 ? `${total} produit${total > 1 ? 's' : ''}` : 'Synchronisez pour voir vos produits'}
          </p>
        </div>

        <div className="headerActions">
          {syncMsg && (
            <span style={{ color: syncOk ? palette.ok : palette.err, fontSize: 13, fontWeight: 500 }}>
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
          <p style={{ color: palette.text, fontSize: 18, fontWeight: 600, margin: '0 0 8px 0' }}>
            Aucune boutique connectee
          </p>
          <p style={{ color: palette.sub, fontSize: 14, fontWeight: 400, margin: '0 0 20px 0' }}>
            Connectez votre boutique Shopify pour voir et modifier vos produits.
          </p>
          <a className="primaryLink" href="/dashboard/shops">
            Connecter une boutique
          </a>
        </div>
      )}

      {hasShop !== false && (
        <div className={`mainGrid ${selected && edit ? 'withEditor' : ''}`}>
          <section>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                style={inputStyle}
              />
            </div>

            {loading && (
              <div style={{ ...cardStyle, padding: '42px 16px', textAlign: 'center' }}>
                <p style={{ color: palette.sub, fontSize: 14, fontWeight: 400, margin: 0 }}>Chargement...</p>
              </div>
            )}

            {!loading && products.length === 0 && (
              <div style={{ ...cardStyle, padding: '42px 16px', textAlign: 'center' }}>
                <p style={{ color: palette.text, fontSize: 16, fontWeight: 500, margin: '0 0 8px 0' }}>
                  Aucun produit
                </p>
                <p style={{ color: palette.sub, fontSize: 14, fontWeight: 400, margin: '0 0 14px 0' }}>
                  Cliquez sur Synchroniser Shopify pour importer vos produits.
                </p>
                <button className="primaryBtn" onClick={doSync} disabled={syncing}>
                  {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
                </button>
              </div>
            )}

            {!loading && products.length > 0 && (
              <div className="productGrid">
                {products.map((p) => {
                  const id = p.shopify_product_id || p.id
                  const isSelected = (selected?.shopify_product_id || selected?.id) === id
                  const image = asImageUrls(p.images)[0]
                  const priceNum = typeof p.price === 'number' ? p.price : Number(p.price || 0)

                  return (
                    <button
                      type="button"
                      key={id}
                      className={`productCard ${isSelected ? 'selected' : ''}`}
                      onClick={() => openEdit(p)}
                    >
                      <div className="thumbWrap">
                        {image ? <img src={image} alt={p.title} className="thumb" /> : <div className="thumbEmpty">Image indisponible</div>}
                      </div>
                      <div className="cardInfo">
                        <p className="prodTitle">{p.title}</p>
                        <p className="prodPrice">{Number.isFinite(priceNum) && priceNum > 0 ? `${priceNum.toFixed(2)} EUR` : '--'}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {totalPages > 1 && (
              <div className="pager">
                <button type="button" onClick={() => onPageChange(page - 1)} disabled={page === 1} className="ghostBtn">
                  Prev
                </button>
                <span className="pagerText">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(page + 1)}
                  disabled={page === totalPages}
                  className="ghostBtn"
                >
                  Next
                </button>
              </div>
            )}
          </section>

          {selected && edit && (
            <aside className="editorPanel">
              <div className="panelHeader">
                <p style={{ color: palette.text, margin: 0, fontSize: 15, fontWeight: 600 }}>Modifier le produit</p>
                <button type="button" className="closeBtn" onClick={() => { setSelected(null); setEdit(null) }}>
                  x
                </button>
              </div>

              {asImageUrls(selected.images)[0] && (
                <div className="editorImageWrap">
                  <img src={asImageUrls(selected.images)[0]} alt={selected.title} className="editorImage" />
                </div>
              )}

              <div className="fieldStack">
                <label className="fieldLabel">Titre</label>
                <input
                  style={inputStyle}
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />

                <label className="fieldLabel">Description</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }}
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                />

                <div className="twoCols">
                  <div>
                    <label className="fieldLabel">Prix</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={inputStyle}
                      value={edit.price}
                      onChange={(e) => setEdit({ ...edit, price: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="fieldLabel">Prix barre</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      style={inputStyle}
                      value={edit.compareAtPrice}
                      onChange={(e) => setEdit({ ...edit, compareAtPrice: e.target.value })}
                    />
                  </div>
                </div>

                <label className="fieldLabel">Fournisseur</label>
                <input
                  style={inputStyle}
                  value={edit.vendor}
                  onChange={(e) => setEdit({ ...edit, vendor: e.target.value })}
                />

                <label className="fieldLabel">Tags</label>
                <input
                  style={inputStyle}
                  value={edit.tags}
                  onChange={(e) => setEdit({ ...edit, tags: e.target.value })}
                  placeholder="tag1, tag2"
                />
              </div>

              <button className="primaryBtn fullWidth" onClick={doSave} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer sur Shopify'}
              </button>

              {saveMsg && (
                <p style={{ textAlign: 'center', color: saveMsg.toLowerCase().includes('erreur') ? palette.err : palette.ok, fontSize: 13, fontWeight: 500, marginTop: 10 }}>
                  {saveMsg}
                </p>
              )}

              <p style={{ textAlign: 'center', marginTop: 12 }}>
                <a
                  href={`https://admin.shopify.com/products/${selected.shopify_product_id || selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: palette.accent, textDecoration: 'none', fontSize: 12, fontWeight: 400 }}
                >
                  Ouvrir dans Shopify Admin
                </a>
              </p>
            </aside>
          )}
        </div>
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
          color: ${palette.text};
          font-size: 20px;
          line-height: 1.25;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .subtitle {
          margin: 4px 0 0 0;
          color: ${palette.sub};
          font-size: 14px;
          line-height: 1.4;
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

        .productGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 10px;
        }

        .productCard {
          width: 100%;
          text-align: left;
          background: ${palette.card};
          border: 1px solid ${palette.border};
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          padding: 0;
          transition: box-shadow 0.15s, border-color 0.15s;
        }

        .productCard:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }

        .productCard.selected {
          background: #eff6ff;
          border-color: #93c5fd;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
        }

        .thumbWrap {
          width: 100%;
          padding-top: 72%;
          position: relative;
          background: ${palette.cardAlt};
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
          color: ${palette.sub};
          font-size: 11px;
          font-weight: 400;
          padding: 6px;
          text-align: center;
        }

        .cardInfo {
          padding: 8px 10px 10px;
        }

        .prodTitle {
          margin: 0 0 3px 0;
          color: ${palette.text};
          font-size: 13px;
          line-height: 1.35;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .prodPrice {
          margin: 0;
          color: ${palette.accent};
          font-size: 14px;
          line-height: 1.3;
          font-weight: 600;
        }

        .editorPanel {
          background: ${palette.card};
          border: 1px solid ${palette.border};
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
          color: ${palette.sub};
          font-size: 18px;
          line-height: 1;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .closeBtn:hover {
          background: #f3f4f6;
        }

        .editorImageWrap {
          width: 100%;
          height: 140px;
          border-radius: 10px;
          overflow: hidden;
          background: ${palette.cardAlt};
          margin-bottom: 12px;
        }

        .editorImage {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .fieldStack {
          display: grid;
          gap: 8px;
        }

        .fieldLabel {
          color: ${palette.sub};
          font-size: 12px;
          font-weight: 500;
          margin-top: 2px;
        }

        .twoCols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .primaryBtn {
          border: none;
          background: ${palette.accent};
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          padding: 10px 16px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .primaryBtn:hover {
          background: #1d4ed8;
        }

        .primaryBtn:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .primaryLink {
          display: inline-block;
          border: none;
          background: ${palette.accent};
          color: white;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          padding: 10px 16px;
          text-decoration: none;
        }

        .fullWidth {
          width: 100%;
          margin-top: 14px;
        }

        .pager {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 14px;
        }

        .pagerText {
          color: ${palette.sub};
          font-size: 13px;
          font-weight: 500;
        }

        .ghostBtn {
          border: 1px solid ${palette.border};
          background: white;
          color: ${palette.text};
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          padding: 7px 14px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .ghostBtn:hover {
          background: #f9fafb;
        }

        .ghostBtn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        @media (min-width: 480px) {
          .productGrid {
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          }
        }

        @media (min-width: 700px) {
          .productsPage {
            padding: 20px;
          }
          .productGrid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 12px;
          }
        }

        @media (min-width: 1100px) {
          .mainGrid.withEditor {
            grid-template-columns: minmax(0, 1fr) 360px;
          }

          .editorPanel {
            position: sticky;
            top: 20px;
            max-height: calc(100vh - 64px);
            overflow: auto;
          }
        }
      `}</style>
    </div>
  )
}
