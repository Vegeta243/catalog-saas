'use client'
import { useState, useEffect } from 'react'

function proxyImg(src: string): string {
  if (!src) return ''
  return '/api/import/image-proxy?url=' + encodeURIComponent(src)
}

function detectPlatform(url: string) {
  const u = url.toLowerCase()
  if (u.includes('aliexpress'))      return { name: 'AliExpress',      color: '#fca5a5', dot: '#ef4444' }
  if (u.includes('cjdropshipping')) return { name: 'CJDropshipping', color: '#93c5fd', dot: '#3b82f6' }
  if (u.includes('dhgate'))          return { name: 'DHgate',          color: '#86efac', dot: '#10b981' }
  if (u.includes('alibaba'))         return { name: 'Alibaba',         color: '#fcd34d', dot: '#f59e0b' }
  if (u.includes('banggood'))        return { name: 'Banggood',        color: '#c4b5fd', dot: '#8b5cf6' }
  if (url.startsWith('http'))        return { name: 'Site web',        color: '#8a95b0', dot: '#6b7a99' }
  return null
}

type Res = {
  url: string; success: boolean; title?: string
  price?: number; image?: string; platform?: string
  shopify_id?: string; error?: string
}

export default function ImportPage() {
  const [text, setText] = useState('')
  const [urls, setUrls] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<Res[]>([])
  const [shopifyOk, setShopifyOk] = useState(false)
  const [pushShopify, setPushShopify] = useState(false)
  const [history, setHistory] = useState<Array<{
    id: string; status: string; platform: string;
    imported_count: number; total_products: number; created_at: string
  }>>([])
  const [tab, setTab] = useState<'import' | 'history'>('import')

  useEffect(() => {
    document.title = 'Import — EcomPilot Elite'
    fetch('/api/shopify/products?limit=1')
      .then(r => { setShopifyOk(r.ok); setPushShopify(r.ok) })
      .catch(() => {})
    fetch('/api/import/history')
      .then(r => r.json()).then(d => setHistory(d.jobs || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const detected = text.split(/[\n,;]+/)
      .map(l => l.trim())
      .filter(l => l.startsWith('http'))
      .slice(0, 50)
    setUrls(detected)
  }, [text])

  async function doImport() {
    if (!urls.length) return
    setImporting(true); setResults([]); setProgress(5)
    const iv = setInterval(() => setProgress(p => Math.min(p + 3, 88)), 700)
    try {
      const r = await fetch('/api/import/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, push_to_shopify: pushShopify && shopifyOk }),
      })
      const data = await r.json()
      clearInterval(iv); setProgress(100)
      setResults(data.results || [])
      fetch('/api/import/history').then(r2 => r2.json())
        .then(d => setHistory(d.jobs || [])).catch(() => {})
    } catch {
      clearInterval(iv)
      setResults([{ url: '', success: false, error: 'Erreur réseau' }])
    }
    setTimeout(() => { setImporting(false); setProgress(0) }, 600)
  }

  async function doPreview() {
    const url = urls[0]
    if (!url) return
    setPreviewing(true)
    try {
      const r = await fetch('/api/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await r.json()
      if (data.product) {
        setResults([{
          url, success: data.success,
          title: data.product.title,
          price: data.product.price,
          image: data.product.images?.[0],
          platform: data.platform,
        }])
      }
    } catch { /* ignore */ }
    setPreviewing(false)
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: 20, marginBottom: 16,
  }
  const lbl: React.CSSProperties = { color: '#8a95b0', fontSize: 12, fontWeight: 500 }
  const btnPri: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: '13px 20px', background: '#4f8ef7',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 14, fontWeight: 500, cursor: 'pointer', width: '100%',
  }
  const btnSec: React.CSSProperties = {
    padding: '12px 18px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e8ecf4', borderRadius: 10,
    fontSize: 14, fontWeight: 400, cursor: 'pointer',
  }

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <h1 style={{ color: '#e8ecf4', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        Import de produits
      </h1>
      <p style={{ color: '#8a95b0', fontSize: 14, margin: '0 0 20px', fontWeight: 400 }}>
        AliExpress, CJDropshipping, DHgate, Alibaba, Banggood
      </p>

      {/* Platform badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {[
          { name: 'AliExpress',      color: '#fca5a5', dot: '#ef4444' },
          { name: 'CJDropshipping',  color: '#93c5fd', dot: '#3b82f6' },
          { name: 'DHgate',          color: '#86efac', dot: '#10b981' },
          { name: 'Alibaba',         color: '#fcd34d', dot: '#f59e0b' },
          { name: 'Banggood',        color: '#c4b5fd', dot: '#8b5cf6' },
        ].map(p => (
          <div key={p.name} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 20,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
            <span style={{ color: p.color, fontSize: 12, fontWeight: 500 }}>{p.name}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
        {([['import', 'Importer'], ['history', 'Historique']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '9px 18px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: 14, fontWeight: 500,
            color: tab === id ? '#e8ecf4' : '#555f7a',
            borderBottom: '2px solid ' + (tab === id ? '#4f8ef7' : 'transparent'),
          }}>{label}</button>
        ))}
      </div>

      {tab === 'import' && (
        <>
          {/* Textarea */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ color: '#e8ecf4', fontWeight: 500, fontSize: 14, margin: 0 }}>URLs à importer</p>
              {urls.length > 0 && (
                <span style={{
                  background: 'rgba(79,142,247,0.12)',
                  border: '1px solid rgba(79,142,247,0.25)',
                  color: '#4f8ef7', fontSize: 12, fontWeight: 500,
                  padding: '3px 10px', borderRadius: 20,
                }}>
                  {urls.length} URL{urls.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10,
                color: '#e8ecf4',
                fontSize: 14,
                padding: '12px 14px',
                boxSizing: 'border-box',
                resize: 'vertical',
                minHeight: 140,
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                fontWeight: 400,
              }}
              placeholder={'Collez une ou plusieurs URLs (une par ligne) :\n\nhttps://www.aliexpress.com/item/...\nhttps://cjdropshipping.com/product/...'}
            />
            <p style={{ ...lbl, marginTop: 8 }}>Max 50 URLs à la fois</p>
          </div>

          {/* Detected URLs */}
          {urls.length > 0 && (
            <div style={card}>
              <p style={{ color: '#e8ecf4', fontWeight: 500, fontSize: 14, margin: '0 0 10px' }}>Produits détectés</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {urls.map((url, i) => {
                  const p = detectPlatform(url)
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {p && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '2px 8px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          flexShrink: 0,
                        }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: p.dot }} />
                          <span style={{ color: p.color, fontSize: 11, fontWeight: 500 }}>{p.name}</span>
                        </div>
                      )}
                      <span style={{ color: '#8a95b0', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {url.length > 65 ? url.slice(0, 65) + '...' : url}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Shopify toggle */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              onClick={() => shopifyOk && setPushShopify(prev => !prev)}
              style={{
                width: 40, height: 22, borderRadius: 11, flexShrink: 0,
                background: pushShopify && shopifyOk ? '#4f8ef7' : 'rgba(255,255,255,0.08)',
                border: '1px solid ' + (pushShopify && shopifyOk ? '#4f8ef7' : 'rgba(255,255,255,0.12)'),
                position: 'relative',
                cursor: shopifyOk ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}>
              <div style={{
                width: 14, height: 14, background: '#fff',
                borderRadius: '50%', position: 'absolute', top: 3,
                transition: 'transform 0.2s',
                transform: pushShopify && shopifyOk ? 'translateX(21px)' : 'translateX(3px)',
              }} />
            </div>
            <div>
              <p style={{ color: '#e8ecf4', fontSize: 14, fontWeight: 500, margin: '0 0 2px' }}>
                Synchroniser avec Shopify
              </p>
              {shopifyOk ? (
                <p style={{ ...lbl, margin: 0, color: '#10b981' }}>Boutique connectée</p>
              ) : (
                <p style={{ ...lbl, margin: 0, color: '#f87171' }}>
                  Aucune boutique —{' '}
                  <a href="/dashboard/shops" style={{ color: '#4f8ef7', textDecoration: 'none' }}>Connecter</a>
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 20 }}>
            <button onClick={doPreview} disabled={previewing || !urls.length}
              style={{ ...btnSec, opacity: !urls.length ? 0.4 : 1 }}>
              {previewing ? 'Aperçu...' : 'Aperçu'}
            </button>
            <button onClick={doImport} disabled={importing || !urls.length}
              style={{ ...btnPri, opacity: !urls.length ? 0.4 : 1 }}>
              {importing ? 'Importation...' : 'Importer ' + (urls.length > 0 ? urls.length + ' produit(s)' : '')}
            </button>
          </div>

          {/* Progress */}
          {importing && progress > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={lbl}>Importation...</span>
                <span style={lbl}>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', borderRadius: 2, background: '#4f8ef7', width: progress + '%', transition: 'width 0.4s' }} />
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div style={card}>
              <p style={{ color: '#e8ecf4', fontWeight: 500, fontSize: 14, margin: '0 0 14px' }}>
                {results.filter(r => r.success).length}/{results.length} produit(s) importé(s)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 12, borderRadius: 10,
                    background: r.success ? 'rgba(16,185,129,0.06)' : 'rgba(248,113,113,0.06)',
                    border: '1px solid ' + (r.success ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)'),
                  }}>
                    {r.success && r.image ? (
                      <img src={proxyImg(r.image)} alt={r.title || ''}
                        style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { (e.currentTarget as HTMLImageElement).src = r.image! }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: r.success ? '#e8ecf4' : '#f87171', fontSize: 13, fontWeight: 500, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.success ? r.title : "Échec de l'import"}
                      </p>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {r.success && r.price != null && (
                          <span style={{ color: '#4f8ef7', fontWeight: 600, fontSize: 13 }}>{r.price.toFixed(2)}€</span>
                        )}
                        <span style={{ ...lbl }}>{r.success ? r.platform : r.error?.slice(0, 60)}</span>
                      </div>
                    </div>
                    {r.shopify_id && (
                      <span style={{
                        background: 'rgba(16,185,129,0.1)', color: '#10b981',
                        fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 6, flexShrink: 0,
                      }}>Shopify</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!urls.length && !results.length && (
            <div style={{ ...card, textAlign: 'center', padding: '40px 24px' }}>
              <p style={{ color: '#e8ecf4', fontSize: 15, fontWeight: 500, margin: '0 0 6px' }}>Comment importer ?</p>
              <p style={{ color: '#8a95b0', fontSize: 14, fontWeight: 400, margin: '0 0 20px', lineHeight: 1.5 }}>
                Copiez l&apos;URL d&apos;un produit sur AliExpress, CJDropshipping ou DHgate et collez-la ci-dessus
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 480, margin: '0 auto' }}>
                {[
                  { name: 'AliExpress',     desc: 'aliexpress.com/item/...', color: '#fca5a5' },
                  { name: 'CJDropshipping', desc: 'cjdropshipping.com/...',  color: '#93c5fd' },
                  { name: 'DHgate',         desc: 'dhgate.com/product/...',  color: '#86efac' },
                ].map(p => (
                  <div key={p.name} style={{
                    padding: 12, borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <p style={{ color: p.color, fontSize: 12, fontWeight: 500, margin: '0 0 3px' }}>{p.name}</p>
                    <p style={{ color: '#555f7a', fontSize: 11, fontWeight: 400, margin: 0 }}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {history.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '60px 24px' }}>
              <p style={{ color: '#e8ecf4', fontSize: 15, fontWeight: 500, margin: '0 0 6px' }}>Aucun import</p>
              <p style={{ color: '#8a95b0', fontSize: 14, fontWeight: 400, margin: 0 }}>Votre historique apparaît ici</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map(job => (
                <div key={job.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                        background: job.status === 'completed' ? 'rgba(16,185,129,0.12)' : 'rgba(248,113,113,0.12)',
                        color: job.status === 'completed' ? '#10b981' : '#f87171',
                      }}>
                        {job.status === 'completed' ? 'Terminé' : 'Échoué'}
                      </span>
                      <span style={{ ...lbl, textTransform: 'capitalize' }}>{job.platform}</span>
                    </div>
                    <p style={{ color: '#e8ecf4', fontSize: 14, fontWeight: 500, margin: 0 }}>
                      {job.imported_count}/{job.total_products} produits
                    </p>
                  </div>
                  <p style={lbl}>{new Date(job.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
