'use client'
import { useState, useEffect } from 'react'

function proxyImg(src: string): string {
  if (!src) return ''
  return '/api/import/image-proxy?url=' + encodeURIComponent(src)
}

const PLATFORMS = [
  { id: 'aliexpress', name: 'AliExpress', emoji: '🛒',
    bg: '#2d0a0a', border: '#7f1d1d', text: '#fca5a5' },
  { id: 'cjdropshipping', name: 'CJDropshipping', emoji: '📦',
    bg: '#0a122d', border: '#1d3a7f', text: '#93c5fd' },
  { id: 'dhgate', name: 'DHgate', emoji: '🏭',
    bg: '#0a1f0d', border: '#166534', text: '#86efac' },
  { id: 'alibaba', name: 'Alibaba', emoji: '🌐',
    bg: '#1f1500', border: '#854d0e', text: '#fcd34d' },
  { id: 'banggood', name: 'Banggood', emoji: '⚡',
    bg: '#150a2d', border: '#6b21a8', text: '#c4b5fd' },
  { id: 'other', name: 'Autre site', emoji: '🔗',
    bg: '#111827', border: '#334155', text: '#94a3b8' },
]

type Res = {
  url: string; success: boolean; title?: string
  price?: number; image?: string; platform?: string
  shopify_id?: string; error?: string
}
type Preview = {
  platform: string; success: boolean
  product?: { title: string; price: number; images: string[]; description: string }
  error?: string
}
type HistoryJob = {
  id: string; platform: string; status: string
  imported_count: number; total_products: number
  failed_count: number; created_at: string
}

export default function ImportPage() {
  const [tab, setTab] = useState<'import' | 'history'>('import')
  const [urls, setUrls] = useState([''])
  const [pushShopify, setPushShopify] = useState(false)
  const [shopifyOk, setShopifyOk] = useState(false)
  const [importing, setImporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [results, setResults] = useState<Res[]>([])
  const [history, setHistory] = useState<HistoryJob[]>([])
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')

  useEffect(() => {
    document.title = 'Import \u2014 EcomPilot Elite'
    fetch('/api/shopify/products?limit=1')
      .then(r => { setShopifyOk(r.ok); setPushShopify(r.ok) })
      .catch(() => {})
    fetch('/api/import/history')
      .then(r => r.json()).then(d => setHistory(d.jobs || []))
      .catch(() => {})
  }, [])

  const validUrls = () => urls.filter(u => u.trim().startsWith('http'))

  async function doPreview() {
    const url = validUrls()[0]
    if (!url) return
    setPreviewing(true); setPreview(null)
    try {
      const r = await fetch('/api/import/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      setPreview(await r.json())
    } catch { setPreview({ platform: 'unknown', success: false, error: 'Erreur r\u00e9seau' }) }
    setPreviewing(false)
  }

  async function doImport() {
    const valid = validUrls()
    if (!valid.length) return
    setImporting(true); setResults([]); setProgress(5)
    const iv = setInterval(() => setProgress(p => Math.min(p + 4, 90)), 700)
    try {
      const r = await fetch('/api/import/bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: valid, push_to_shopify: pushShopify && shopifyOk }),
      })
      const data = await r.json()
      clearInterval(iv); setProgress(100)
      setResults(data.results || [])
      fetch('/api/import/history').then(r2 => r2.json())
        .then(d => setHistory(d.jobs || [])).catch(() => {})
    } catch {
      clearInterval(iv)
      setResults([{ url: '', success: false, error: 'Erreur r\u00e9seau' }])
    }
    setTimeout(() => { setImporting(false); setProgress(0) }, 800)
  }

  function applyPaste() {
    const lines = pasteText.split(/[\n,;]+/)
      .map(l => l.trim()).filter(l => l.startsWith('http')).slice(0, 50)
    if (lines.length) { setUrls(lines); setShowPaste(false); setPasteText('') }
  }

  const vCount = validUrls().length
  const card: React.CSSProperties = { background: '#111827', border: '1px solid #1e2d45', borderRadius: '20px', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', background: '#0a0f1e', border: '1px solid #1e2d45', borderRadius: '12px', color: '#f0f4ff', fontSize: '16px', padding: '12px 16px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
  const btnPri: React.CSSProperties = { width: '100%', background: '#4f8ef7', color: '#f0f4ff', border: 'none', borderRadius: '12px', padding: '14px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
  const btnSec: React.CSSProperties = { background: '#1a2234', border: '1px solid #1e2d45', color: '#8b9fc4', borderRadius: '12px', padding: '10px 16px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }
  const lbl: React.CSSProperties = { color: '#8b9fc4', fontSize: '12px', fontWeight: 600 }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {showPaste && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div style={{ ...card, width: '100%', maxWidth: '500px', zIndex: 9001 }}>
            <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '16px', margin: '0 0 6px' }}>Coller des URLs en masse</p>
            <p style={{ ...lbl, marginBottom: '12px' }}>Une URL par ligne - max 50</p>
            <textarea style={{ ...inp, height: '180px', resize: 'vertical', marginBottom: '12px' } as React.CSSProperties} placeholder={'https://www.aliexpress.com/item/...\nhttps://cjdropshipping.com/product/...'} value={pasteText} onChange={e => setPasteText(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPaste(false)} style={{ ...btnSec, flex: 1 }}>Annuler</button>
              <button onClick={applyPaste} style={{ ...btnPri, flex: 2 }}>Ajouter {pasteText.split('\n').filter(l => l.trim().startsWith('http')).length} URL(s)</button>
            </div>
          </div>
        </div>
      )}

      <h1 style={{ color: '#f0f4ff', fontSize: '26px', fontWeight: 900, margin: '0 0 6px' }}>Import de produits</h1>
      <p style={{ color: '#8b9fc4', fontSize: '14px', margin: '0 0 24px' }}>AliExpress, CJDropshipping, DHgate, Alibaba, Banggood et tout site e-commerce</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
        {PLATFORMS.map(p => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', background: p.bg, border: '1px solid ' + p.border }}>
            <span style={{ fontSize: '14px' }}>{p.emoji}</span>
            <span style={{ color: p.text, fontSize: '12px', fontWeight: 700 }}>{p.name}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #1e2d45', marginBottom: '24px' }}>
        {(['import', 'history'] as const).map(id => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', background: 'transparent', fontWeight: 700, fontSize: '14px', color: tab === id ? '#f0f4ff' : '#4a5878', borderBottom: tab === id ? '2px solid #4f8ef7' : '2px solid transparent' }}>
            {id === 'import' ? 'Nouvel import' : 'Historique'}
          </button>
        ))}
      </div>

      {tab === 'import' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '15px', margin: 0 }}>URLs \u00e0 importer</p>
                <span style={{ ...lbl, background: '#1a2234', padding: '4px 10px', borderRadius: '8px', border: '1px solid #1e2d45' }}>{vCount}/50</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '240px', overflowY: 'auto' }}>
                {urls.map((url, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px' }}>
                    <input type="url" value={url} style={inp} placeholder={i === 0 ? 'https://www.aliexpress.com/item/...' : 'URL produit...'} onChange={e => { const next = [...urls]; next[i] = e.target.value; setUrls(next) }} />
                    {urls.length > 1 && (
                      <button onClick={() => setUrls(urls.filter((_, j) => j !== i))} style={{ ...btnSec, padding: '10px 14px', color: '#ef4444', borderColor: '#7f1d1d' }}>{String.fromCharCode(10005)}</button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setUrls([...urls, ''])} disabled={urls.length >= 50} style={btnSec}>+ Ajouter</button>
                <button onClick={() => setShowPaste(true)} style={btnSec}>Coller en masse</button>
              </div>
            </div>

            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div onClick={() => shopifyOk && setPushShopify(!pushShopify)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: pushShopify && shopifyOk ? '#4f8ef7' : '#1a2234', border: '1px solid ' + (pushShopify && shopifyOk ? '#4f8ef7' : '#334155'), position: 'relative', cursor: shopifyOk ? 'pointer' : 'not-allowed', transition: 'all 0.2s', flexShrink: 0 }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#f0f4ff', position: 'absolute', top: '3px', transition: 'transform 0.2s', transform: pushShopify && shopifyOk ? 'translateX(23px)' : 'translateX(3px)' }} />
                </div>
                <div>
                  <p style={{ color: '#f0f4ff', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>Synchroniser avec Shopify</p>
                  <p style={{ ...lbl, margin: 0, color: shopifyOk ? '#86efac' : '#ef4444' }}>
                    {shopifyOk ? '\u2713 Boutique connect\u00e9e' : 'Aucune boutique \u2014 '}
                    {!shopifyOk && <a href="/dashboard/shops" style={{ color: '#4f8ef7', textDecoration: 'none' }}>Connecter</a>}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={doPreview} disabled={previewing || vCount === 0} style={{ ...btnSec, flex: 1, fontSize: '14px', padding: '14px', opacity: vCount === 0 ? 0.4 : 1 }}>
                {previewing ? '\u23F3 ...' : '\uD83D\uDC41 Pr\u00e9visualiser'}
              </button>
              <button onClick={doImport} disabled={importing || vCount === 0} style={{ ...btnPri, flex: 2, opacity: vCount === 0 ? 0.4 : 1 }}>
                {importing ? '\u23F3 Importation...' : `\u2B06 Importer${vCount > 0 ? ` (${vCount})` : ''}`}
              </button>
            </div>

            {importing && progress > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...lbl, marginBottom: '6px' }}>
                  <span>Importation...</span><span>{Math.round(progress)}%</span>
                </div>
                <div style={{ height: '6px', background: '#1a2234', borderRadius: '3px' }}>
                  <div style={{ height: '100%', background: '#4f8ef7', borderRadius: '3px', width: progress + '%', transition: 'width 0.4s' }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {preview && (
              <div style={card}>
                <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>
                  {preview.success ? '\u2705 Pr\u00e9visualisation' : '\u274C Erreur'}
                </p>
                {preview.success && preview.product ? (
                  <>
                    <div style={{ width: '100%', height: '180px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #1e2d45', marginBottom: '12px', background: '#0a0f1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {preview.product.images?.[0] ? (
                        <img src={proxyImg(preview.product.images[0])} alt={preview.product.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <p style={{ color: '#4a5878', fontSize: '13px', margin: 0 }}>Aucune image</p>
                      )}
                    </div>
                    <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '14px', margin: '0 0 8px', lineHeight: 1.4 }}>{preview.product.title}</p>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ color: '#4f8ef7', fontWeight: 900, fontSize: '22px' }}>{preview.product.price > 0 ? preview.product.price.toFixed(2) + ' EUR' : 'Prix N/A'}</span>
                      <span style={{ ...lbl, textTransform: 'capitalize' }}>via {preview.platform}</span>
                    </div>
                  </>
                ) : (
                  <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0 }}>{preview.error || 'Produit introuvable'}</p>
                )}
              </div>
            )}

            {results.length > 0 && (
              <div style={card}>
                <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>
                  R\u00e9sultats ({results.filter(r => r.success).length}/{results.length} r\u00e9ussis)
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
                  {results.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '12px', background: r.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: '1px solid ' + (r.success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)') }}>
                      {r.success && r.image ? (
                        <img src={proxyImg(r.image)} alt={r.title || ''} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid #1e2d45' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: '#1a2234', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          {r.success ? '\uD83D\uDCE6' : '\u274C'}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: r.success ? '#f0f4ff' : '#fca5a5', fontSize: '13px', fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.success ? r.title : '\u00c9chec'}
                        </p>
                        <p style={{ ...lbl, margin: 0 }}>
                          {r.success ? `${r.price?.toFixed(2)} EUR \u00b7 ${r.platform}` : r.error?.slice(0, 60)}
                        </p>
                      </div>
                      {r.shopify_id && (
                        <span style={{ background: 'rgba(34,197,94,0.15)', color: '#86efac', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', flexShrink: 0 }}>\u2713 Shopify</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!preview && results.length === 0 && (
              <div style={card}>
                <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>Plateformes support\u00e9es</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {PLATFORMS.slice(0, 5).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{p.emoji}</span>
                      <div>
                        <p style={{ color: p.text, fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{p.name}</p>
                        <p style={{ ...lbl, margin: 0 }}>Collez l&apos;URL du produit</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <p style={{ fontSize: '40px', margin: '0 0 12px' }}>\uD83D\uDCCB</p>
              <p style={{ color: '#f0f4ff', fontWeight: 700, margin: '0 0 6px' }}>Aucun import</p>
              <p style={{ ...lbl }}>Votre historique apparaitra ici</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map(job => (
                <div key={job.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: job.status === 'completed' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: job.status === 'completed' ? '#86efac' : '#fca5a5' }}>
                          {job.status === 'completed' ? 'Termin\u00e9' : '\u00c9chou\u00e9'}
                        </span>
                        <span style={{ ...lbl, textTransform: 'capitalize' }}>{job.platform}</span>
                      </div>
                      <p style={{ color: '#f0f4ff', fontSize: '14px', fontWeight: 700, margin: 0 }}>
                        {job.imported_count}/{job.total_products} produits import\u00e9s
                      </p>
                    </div>
                    <p style={{ ...lbl }}>{new Date(job.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
