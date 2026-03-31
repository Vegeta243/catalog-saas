'use client'
import { useState, useEffect, useRef } from 'react'

type Product = {
  id: string
  shopify_product_id: string
  title: string
  price: number
  images: unknown
  vendor?: string
}

function getImages(product: Product): string[] {
  let imgs = product.images
  if (typeof imgs === 'string') {
    try { imgs = JSON.parse(imgs) } catch { return [] }
  }
  if (!Array.isArray(imgs)) return []
  return (imgs as unknown[]).map((img: unknown) => {
    if (typeof img === 'string') return img
    if (img && typeof img === 'object') {
      const o = img as Record<string, unknown>
      return (typeof o.src === 'string' ? o.src : typeof o.url === 'string' ? o.url : '')
    }
    return ''
  }).filter(Boolean) as string[]
}

function getFirstImage(product: Product): string {
  return getImages(product)[0] || ''
}

export default function ImagesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [selectedImgIdx, setSelectedImgIdx] = useState(0)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [width, setWidth] = useState('800')
  const [height, setHeight] = useState('800')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [massMode, setMassMode] = useState(false)
  const [massSelected, setMassSelected] = useState<Set<string>>(new Set())
  const [massSaving, setMassSaving] = useState(false)
  const [massMsg, setMassMsg] = useState('')
  const [resizeMode, setResizeMode] = useState<string>('contain')
  const [isApplying, setIsApplying] = useState(false)
  const [isApplyingSingle, setIsApplyingSingle] = useState(false)

  // Crop
  const [cropEnabled, setCropEnabled] = useState(false)
  const [cropTop, setCropTop] = useState('')
  const [cropLeft, setCropLeft] = useState('')
  const [cropW, setCropW] = useState('')
  const [cropH, setCropH] = useState('')

  // Resize handle container ref
  const resizeContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = "Éditeur d'images | EcomPilot Elite"
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify/products?limit=50', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  async function syncProducts() {
    setSyncing(true)
    try {
      await fetch('/api/shopify/sync', { method: 'POST', credentials: 'include' })
      await loadProducts()
    } catch { /* silent */ }
    setSyncing(false)
  }

  function selectProduct(p: Product) {
    setSelected(p)
    setSelectedImgIdx(0)
    setCropEnabled(false)
    setCropTop('')
    setCropLeft('')
    setCropW('')
    setCropH('')
    setSaveMsg('')
  }

  function toggleMassSelect(id: string) {
    const next = new Set(massSelected)
    next.has(id) ? next.delete(id) : next.add(id)
    setMassSelected(next)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    setUploading(true)
    setSaveMsg('')
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => { resolve((reader.result as string).split(',')[1]) }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const pid = selected.shopify_product_id || selected.id
      const res = await fetch(`/api/shopify/products/${pid}/image`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, filename: file.name })
      })
      const data = await res.json()
      if (res.ok && data.image?.src) {
        await loadProducts()
        setSaveMsg('Image téléchargée avec succès')
      } else {
        setSaveMsg('Erreur: ' + (data.error || 'Upload échoué'))
      }
    } catch (err: unknown) {
      setSaveMsg('Erreur: ' + (err instanceof Error ? err.message : 'Inconnue'))
    }
    setUploading(false)
    e.target.value = ''
  }

  // Process an image URL through Canvas and return base64 JPEG
  async function processImageToBase64(imgUrl: string): Promise<string> {
    const proxyUrl = '/api/image-proxy?url=' + encodeURIComponent(imgUrl)
    const imgResp = await fetch(proxyUrl, { credentials: 'include' })
    if (!imgResp.ok) throw new Error('Impossible de charger l\'image (proxy)')
    const blob = await imgResp.blob()
    const objectUrl = URL.createObjectURL(blob)
    return new Promise<string>((resolve, reject) => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let srcX = 0, srcY = 0
        let srcW = img.naturalWidth, srcH = img.naturalHeight
        if (cropEnabled && (cropTop || cropLeft || cropW || cropH)) {
          srcX = Math.max(0, parseInt(cropLeft || '0'))
          srcY = Math.max(0, parseInt(cropTop || '0'))
          srcW = cropW ? Math.min(parseInt(cropW), img.naturalWidth - srcX) : (img.naturalWidth - srcX)
          srcH = cropH ? Math.min(parseInt(cropH), img.naturalHeight - srcY) : (img.naturalHeight - srcY)
        }
        canvas.width = width ? parseInt(width) : srcW
        canvas.height = height ? parseInt(height) : srcH
        const ctx = canvas.getContext('2d')!
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(objectUrl)
        resolve(canvas.toDataURL('image/jpeg', 0.92).split(',')[1])
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Chargement échoué')) }
      img.src = objectUrl
    })
  }

  async function applyChanges() {
    if (!selected) { setSaveMsg('Sélectionnez un produit'); return }
    if (!currentImgUrl) { setSaveMsg('Erreur : ce produit n\'a pas d\'image à modifier'); return }
    setSaving(true)
    setSaveMsg('Traitement de l\'image en cours...')
    try {
      const base64Data = await processImageToBase64(currentImgUrl)
      const pid = selected.shopify_product_id || selected.id
      const res = await fetch(`/api/shopify/products/${pid}/image`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data, filename: 'image-editee.jpg' })
      })
      const d = await res.json()
      if (res.ok) {
        setSaveMsg('✓ Image modifiée et ajoutée à Shopify')
        await loadProducts()
      } else {
        setSaveMsg('Erreur: ' + ((d as { error?: string }).error || 'Inconnue'))
      }
    } catch (err: unknown) {
      setSaveMsg('Erreur: ' + (err instanceof Error ? err.message : 'Inconnue'))
    }
    setSaving(false)
  }

  async function handleBulkApply() {
    const ids = [...massSelected]
    if (ids.length === 0) {
      alert('Sélectionnez au moins un produit')
      return
    }

    const w = Number(width)
    const h = Number(height)
    if (!w || !h || w < 50 || h < 50) {
      alert('Entrez des dimensions valides (minimum 50px)')
      return
    }

    setIsApplying(true)
    let successCount = 0
    try {
      for (const productId of ids) {
        const res = await fetch(`/api/shopify/products/${productId}/resize-images`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            width: w,
            height: h,
            mode: resizeMode,
            brightness,
            contrast,
          }),
        })
        if (res.ok) successCount++
        else {
          const err = await res.text()
          console.error('Failed for', productId, err)
        }
      }
      alert(`✅ ${successCount}/${ids.length} produit(s) traité(s) — ${w}×${h}px`)
      setMassSelected(new Set())
      setMassMode(false)
    } catch (e: unknown) {
      alert('Erreur : ' + (e instanceof Error ? e.message : 'Inconnue'))
    } finally {
      setIsApplying(false)
    }
  }

  async function handleSingleApply(productId: string) {
    const w = Number(width)
    const h = Number(height)
    if (!w || !h || w < 50 || h < 50) {
      alert('Entrez des dimensions valides (minimum 50px)')
      return
    }

    setIsApplyingSingle(true)
    try {
      const res = await fetch(`/api/shopify/products/${productId}/resize-images`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          width: w,
          height: h,
          mode: resizeMode,
          brightness,
          contrast,
        }),
      })
      if (res.ok) {
        alert(`✅ Image redimensionnée en ${w}×${h}px`)
      } else {
        const err = await res.text()
        alert('Erreur : ' + err)
      }
    } catch (e: unknown) {
      alert('Erreur : ' + (e instanceof Error ? e.message : 'Inconnue'))
    } finally {
      setIsApplyingSingle(false)
    }
  }

  // Sync resize container size → width/height inputs
  function handleResizeEnd() {
    const el = resizeContainerRef.current
    if (!el) return
    setWidth(String(el.offsetWidth))
    setHeight(String(el.offsetHeight))
  }

  // Sync manual inputs → container size
  useEffect(() => {
    const el = resizeContainerRef.current
    if (!el) return
    if (width) el.style.width = width + 'px'
    if (height) el.style.height = height + 'px'
  }, [width, height])

  const S = {
    page: { background: '#f8fafc', minHeight: '100vh', padding: 'clamp(16px,4vw,28px)', boxSizing: 'border-box' as const },
    inner: { maxWidth: '1100px', margin: '0 auto', boxSizing: 'border-box' as const },
    card: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxSizing: 'border-box' as const },
    h1: { color: '#0f172a', fontSize: 'clamp(18px,3.5vw,22px)' as string, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.01em' },
    sub: { color: '#64748b', fontSize: '13px', margin: 0, fontWeight: 400 },
    lbl: { display: 'block', color: '#334155', fontSize: '12px', fontWeight: 600, marginBottom: '5px' } as React.CSSProperties,
    inp: { width: '100%', boxSizing: 'border-box' as const, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '7px', color: '#0f172a', fontSize: '13px', padding: '7px 10px', outline: 'none', fontFamily: 'inherit' },
    btn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const },
    btnSec: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 13px', background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '7px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  }

  const selectedImages = selected ? getImages(selected) : []
  const currentImgUrl = selectedImages[selectedImgIdx] || ''

  return (
    <div style={S.page}>
      <div style={S.inner}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={S.h1}>Éditeur d&apos;images</h1>
            <p style={S.sub}>Sélectionnez un produit pour modifier ses images</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Mass mode toggle */}
            <button
              onClick={() => { setMassMode(!massMode); setMassSelected(new Set()) }}
              style={{ ...S.btnSec, background: massMode ? '#eff6ff' : '#f8fafc', color: massMode ? '#2563eb' : '#334155', borderColor: massMode ? '#bfdbfe' : '#e2e8f0' }}>
              {massMode ? '✕ Quitter le mode masse' : '⊞ Mode masse'}
            </button>
            <button onClick={syncProducts} disabled={syncing} style={{ ...S.btnSec, opacity: syncing ? 0.6 : 1 }}>
              {syncing ? 'Synchronisation...' : 'Synchroniser'}
            </button>
          </div>
        </div>

        {/* Mass mode bar */}
        {massMode && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ color: '#1d4ed8', fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>
              {massSelected.size} produit{massSelected.size !== 1 ? 's' : ''} sélectionné{massSelected.size !== 1 ? 's' : ''} — Appliquer les mêmes modifications
            </div>

            {/* Dimension inputs */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  Largeur (px)
                </label>
                <input
                  type="number"
                  value={width}
                  onChange={e => setWidth(e.target.value)}
                  min={50}
                  max={4000}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                  Hauteur (px)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  min={50}
                  max={4000}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: '#0f172a',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Mode selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Mode de redimensionnement
              </label>
              <select
                value={resizeMode}
                onChange={e => setResizeMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#0f172a',
                  background: '#fff',
                }}
              >
                <option value="contain">Contenir (garde les proportions)</option>
                <option value="cover">Remplir (recadre si nécessaire)</option>
                <option value="stretch">Étirer (ignore les proportions)</option>
              </select>
            </div>

            {/* Sliders */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Luminosité : {brightness}%
              </label>
              <input
                type="range"
                min={0} max={200} value={brightness}
                onChange={e => setBrightness(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
                Contraste : {contrast}%
              </label>
              <input
                type="range"
                min={0} max={200} value={contrast}
                onChange={e => setContrast(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => setMassSelected(new Set(products.map(p => p.shopify_product_id || p.id)))}
                style={{ ...S.btnSec, fontSize: '12px', padding: '5px 10px' }}>
                Tout sélectionner
              </button>
              <button onClick={handleBulkApply} disabled={isApplying || massSelected.size === 0}
                style={{ ...S.btn, fontSize: '12px', padding: '6px 14px', opacity: (isApplying || massSelected.size === 0) ? 0.5 : 1 }}>
                {isApplying ? 'Application...' : massSelected.size > 0 ? `Appliquer à ${massSelected.size} produit${massSelected.size !== 1 ? 's' : ''}` : 'Appliquer (0 sélectionné)'}
              </button>
            </div>

            {massMsg && (
              <span style={{ display: 'block', marginTop: '10px', color: massMsg.includes('échec') ? '#dc2626' : '#15803d', fontSize: '13px', fontWeight: 600 }}>
                {massMsg}
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) 360px' : '1fr', gap: '16px', alignItems: 'start' }}>

          {/* Product grid */}
          <div>
            {loading && <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Chargement...</div>}
            {!loading && products.length === 0 && (
              <div style={{ ...S.card, padding: '48px', textAlign: 'center' }}>
                <p style={{ color: '#0f172a', fontSize: '15px', fontWeight: 600, margin: '0 0 8px' }}>Aucun produit</p>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 20px' }}>Synchronisez votre boutique pour voir vos produits</p>
                <button onClick={syncProducts} style={S.btn}>Synchroniser</button>
              </div>
            )}
            {!loading && products.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px,100%), 1fr))', gap: '12px' }}>
                {products.map(p => {
                  const img = getFirstImage(p)
                  const isSel = selected?.id === p.id
                  const pid = p.shopify_product_id || p.id
                  const isMassSel = massSelected.has(pid)
                  return (
                    <div key={p.id} onClick={() => massMode ? toggleMassSelect(pid) : selectProduct(p)}
                      style={{ ...S.card, cursor: 'pointer', overflow: 'hidden', position: 'relative',
                        borderColor: massMode ? (isMassSel ? '#2563eb' : '#e2e8f0') : (isSel ? '#2563eb' : '#e2e8f0'),
                        borderWidth: (isSel || isMassSel) ? '2px' : '1px',
                        boxShadow: (isSel || isMassSel) ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
                        background: (massMode && isMassSel) ? '#eff6ff' : '#fff',
                        transition: 'all 0.15s' }}>
                      {/* Mass mode checkbox */}
                      {massMode && (
                        <div style={{
                          position: 'absolute', top: '6px', left: '6px', zIndex: 3,
                          width: '20px', height: '20px', borderRadius: '5px',
                          background: isMassSel ? '#2563eb' : 'rgba(255,255,255,0.9)',
                          border: `2px solid ${isMassSel ? '#2563eb' : '#cbd5e1'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isMassSel && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5l2.5 2.5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                        </div>
                      )}
                      <div style={{ width: '100%', paddingTop: '75%', position: 'relative', background: '#f1f5f9' }}>
                        {img ? (
                          <img src={img} alt={p.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                              <rect x="2" y="2" width="20" height="20" rx="3"/><circle cx="8.5" cy="8.5" r="2"/>
                              <path d="M2 16l5-5 4 4 2-2 5 5"/>
                            </svg>
                          </div>
                        )}
                        {isSel && !massMode && (
                          <div style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                      <div style={{ padding: '10px' }}>
                        <p style={{ color: '#0f172a', fontSize: '12px', fontWeight: 600, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.3' }}>
                          {p.title}
                        </p>
                        <p style={{ color: '#16a34a', fontSize: '13px', fontWeight: 700, margin: 0 }}>
                          {p.price > 0 ? p.price.toFixed(2) + '€' : '—'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Edit panel */}
          {selected && (
            <div style={{ ...S.card, padding: '20px', position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700, margin: 0 }}>Modifier les images</p>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', padding: 0, lineHeight: 1 }}>✕</button>
              </div>
              <p style={{ color: '#64748b', fontSize: '12px', margin: '0 0 14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected.title}
              </p>

              {/* Preview with resize handles */}
              {currentImgUrl && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={S.lbl}>Aperçu (glissez le coin pour redimensionner)</label>
                  <div
                    ref={resizeContainerRef}
                    onMouseUp={handleResizeEnd}
                    onTouchEnd={handleResizeEnd}
                    style={{
                      position: 'relative', display: 'block',
                      resize: 'both', overflow: 'hidden',
                      minWidth: '80px', minHeight: '80px',
                      width: width ? width + 'px' : '100%',
                      height: height ? height + 'px' : '200px',
                      border: '2px dashed #2563eb',
                      borderRadius: '8px',
                      cursor: 'se-resize',
                    }}
                  >
                    <img src={currentImgUrl} alt="selected"
                      style={{ width: '100%', height: '100%', objectFit: 'contain',
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                        display: 'block' }} />
                    {/* Corner handles */}
                    {(['nw', 'ne', 'sw', 'se'] as const).map(pos => (
                      <div key={pos} style={{
                        position: 'absolute',
                        ...(pos.includes('n') ? { top: 0 } : { bottom: 0 }),
                        ...(pos.includes('w') ? { left: 0 } : { right: 0 }),
                        width: '10px', height: '10px',
                        background: '#2563eb', borderRadius: '50%',
                        cursor: pos + '-resize', zIndex: 2,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Image thumbnails */}
              {selectedImages.length > 1 && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={S.lbl}>Images ({selectedImages.length})</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {selectedImages.map((img, i) => (
                      <div key={i} onClick={() => setSelectedImgIdx(i)}
                        style={{ width: '44px', height: '44px', borderRadius: '6px', overflow: 'hidden', cursor: 'pointer',
                          border: `2px solid ${i === selectedImgIdx ? '#2563eb' : '#e2e8f0'}`, flexShrink: 0 }}>
                        <img src={img} alt={'img ' + i} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={S.lbl}>Ajouter une image</label>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ ...S.btnSec, width: '100%', justifyContent: 'center', opacity: uploading ? 0.6 : 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  {uploading ? 'Téléchargement...' : 'Importer une image'}
                </button>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={S.lbl}>Luminosité — {brightness}%</label>
                  <input type="range" min="0" max="200" value={brightness}
                    onChange={e => setBrightness(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Sombre</span>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Lumineux</span>
                  </div>
                </div>

                <div>
                  <label style={S.lbl}>Contraste — {contrast}%</label>
                  <input type="range" min="0" max="200" value={contrast}
                    onChange={e => setContrast(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: '#2563eb', cursor: 'pointer' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Faible</span>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>Fort</span>
                  </div>
                </div>

                {(brightness !== 100 || contrast !== 100) && (
                  <button onClick={() => { setBrightness(100); setContrast(100) }}
                    style={{ ...S.btnSec, fontSize: '12px', padding: '5px 10px', alignSelf: 'flex-start' }}>
                    Réinitialiser
                  </button>
                )}

                <div>
                  <label style={S.lbl}>Format prédéfini</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: 'Carré', w: '1000', h: '1000' },
                      { label: 'Portrait', w: '800', h: '1000' },
                      { label: 'Paysage', w: '1600', h: '900' },
                      { label: 'Libre', w: '', h: '' },
                    ].map(preset => {
                      const active = preset.label === 'Libre'
                        ? width === '' && height === ''
                        : width === preset.w && height === preset.h;
                      return (
                        <button key={preset.label}
                          onClick={() => { setWidth(preset.w); setHeight(preset.h) }}
                          style={{ ...S.btnSec, fontSize: '12px', padding: '4px 10px',
                            background: active ? '#eff6ff' : '#f8fafc',
                            color: active ? '#2563eb' : '#334155',
                            borderColor: active ? '#bfdbfe' : '#e2e8f0' }}>
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={S.lbl}>Dimensions (px) — sync avec l&apos;aperçu</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Largeur</label>
                      <input type="number" min="1" placeholder="auto" value={width}
                        onChange={e => setWidth(e.target.value)} style={S.inp} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>Hauteur</label>
                      <input type="number" min="1" placeholder="auto" value={height}
                        onChange={e => setHeight(e.target.value)} style={S.inp} />
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ ...S.lbl, marginBottom: 0 }}>Mode de redimensionnement</label>
                  </div>
                  <select
                    value={resizeMode}
                    onChange={e => setResizeMode(e.target.value)}
                    style={{ ...S.inp }}
                  >
                    <option value="contain">Contenir (garde les proportions)</option>
                    <option value="cover">Remplir (recadre si nécessaire)</option>
                    <option value="stretch">Étirer (ignore les proportions)</option>
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ ...S.lbl, marginBottom: 0 }}>Recadrage (crop)</label>
                    <button onClick={() => setCropEnabled(!cropEnabled)}
                      style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        background: cropEnabled ? '#2563eb' : '#e2e8f0',
                        color: cropEnabled ? '#fff' : '#64748b', fontWeight: 600 }}>
                      {cropEnabled ? 'Activé' : 'Désactivé'}
                    </button>
                  </div>
                  {cropEnabled && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { label: 'Top (px)', val: cropTop, set: setCropTop },
                        { label: 'Left (px)', val: cropLeft, set: setCropLeft },
                        { label: 'Largeur', val: cropW, set: setCropW },
                        { label: 'Hauteur', val: cropH, set: setCropH },
                      ].map(f => (
                        <div key={f.label}>
                          <label style={{ color: '#94a3b8', fontSize: '11px', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                          <input type="number" min="0" placeholder="0" value={f.val}
                            onChange={e => f.set(e.target.value)} style={S.inp} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {saveMsg && (
                <div style={{ padding: '9px 12px', borderRadius: '7px', marginBottom: '12px',
                  background: saveMsg.includes('Erreur') ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${saveMsg.includes('Erreur') ? '#fecaca' : '#bbf7d0'}` }}>
                  <p style={{ color: saveMsg.includes('Erreur') ? '#dc2626' : '#15803d', fontSize: '13px', margin: 0, fontWeight: 500 }}>
                    {saveMsg}
                  </p>
                </div>
              )}

              <button onClick={() => handleSingleApply(selected.shopify_product_id || selected.id)} disabled={isApplyingSingle}
                style={{ ...S.btn, width: '100%', justifyContent: 'center', opacity: isApplyingSingle ? 0.6 : 1 }}>
                {isApplyingSingle ? 'Application...' : 'Appliquer à ce produit'}
              </button>

              <p style={{ textAlign: 'center', marginTop: '12px' }}>
                <a href={'https://admin.shopify.com/products/' + (selected.shopify_product_id || selected.id)}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#2563eb', fontSize: '12px', textDecoration: 'none', fontWeight: 400 }}>
                  Voir sur Shopify Admin ↗
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
