'use client'
import { useState, useEffect } from 'react'

function proxyImg(src: string): string {
  if (!src) return ''
  return '/api/import/image-proxy?url=' + encodeURIComponent(src)
}

function detectPlatform(url: string) {
  const u = url.toLowerCase()
  if (u.includes('aliexpress')) return { name: 'AliExpress', emoji: '', color: '#fca5a5', bg: '#2d0a0a', border: '#7f1d1d' }
  if (u.includes('cjdropshipping')) return { name: 'CJDropshipping', emoji: '', color: '#93c5fd', bg: '#0a122d', border: '#1d3a7f' }
  if (u.includes('dhgate')) return { name: 'DHgate', emoji: '', color: '#86efac', bg: '#0a1f0d', border: '#166534' }
  if (u.includes('alibaba')) return { name: 'Alibaba', emoji: '', color: '#fcd34d', bg: '#1f1500', border: '#854d0e' }
  if (u.includes('banggood')) return { name: 'Banggood', emoji: '', color: '#c4b5fd', bg: '#150a2d', border: '#6b21a8' }
  if (url.startsWith('http')) return { name: 'Site web', emoji: '', color: '#94a3b8', bg: '#111827', border: '#334155' }
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
    const iv = setInterval(() =>
      setProgress(p => Math.min(p + 3, 88)), 700)
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
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '20px', padding: '20px', marginBottom: '16px',
  }
  const lbl: React.CSSProperties = {
    color: '#8b9fc4', fontSize: '12px', fontWeight: 600,
  }
  const btnPri: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '8px', padding: '16px', background: '#4f8ef7',
    color: '#f0f4ff', border: 'none', borderRadius: '14px',
    fontSize: '16px', fontWeight: 900, cursor: 'pointer',
    width: '100%',
  }
  const btnSec: React.CSSProperties = {
    padding: '14px 20px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)', color: '#8b9fc4',
    borderRadius: '12px', fontSize: '14px',
    fontWeight: 700, cursor: 'pointer',
  }

  return (
    <div style={{ padding: '24px', maxWidth: '860px', margin: '0 auto' }}>
      <h1 style={{ color: '#f0f4ff', fontSize: '26px', fontWeight: 900, margin: '0 0 6px' }}>
        Import de produits
      </h1>
      <p style={{ color: '#8b9fc4', fontSize: '14px', margin: '0 0 24px' }}>
        Collez une ou plusieurs URLs — AliExpress, CJDropshipping, DHgate, Alibaba, Banggood
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '20px' }}>
        {([['import', ' Importer'], ['history', ' Historique']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '10px 20px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontWeight: 700, fontSize: '14px',
            color: tab === id ? '#f0f4ff' : '#4a5878',
            borderBottom: `2px solid ${tab === id ? '#4f8ef7' : 'transparent'}`,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'import' && (
        <>
          {/* Big textarea */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '15px', margin: 0 }}>
                URLs à importer
              </p>
              {urls.length > 0 && (
                <span style={{
                  background: 'rgba(79,142,247,0.15)',
                  border: '1px solid rgba(79,142,247,0.3)',
                  color: '#4f8ef7', fontSize: '12px', fontWeight: 700,
                  padding: '4px 12px', borderRadius: '20px',
                }}>
                  {urls.length} URL{urls.length > 1 ? 's' : ''} détectée{urls.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              style={{
                width: '100%', background: '#0a0f1e',
                border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px',
                color: '#f0f4ff', fontSize: '15px', padding: '16px',
                boxSizing: 'border-box', resize: 'vertical',
                minHeight: '150px', outline: 'none',
                fontFamily: 'inherit', lineHeight: '1.7',
              }}
              placeholder={'Collez une ou plusieurs URLs ici (une par ligne) :\n\nhttps://www.aliexpress.com/item/...\nhttps://cjdropshipping.com/product/...\nhttps://www.dhgate.com/product/...'}
            />
            <p style={{ ...lbl, marginTop: '8px' }}>
              Astuce : collez jusqu&apos;à 50 URLs en une seule fois
            </p>
          </div>

          {/* Detected URLs list */}
          {urls.length > 0 && (
            <div style={card}>
              <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '14px', margin: '0 0 12px' }}>
                Produits détectés
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {urls.map((url, i) => {
                  const p = detectPlatform(url)
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: '10px',
                      background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)',
                    }}>
                      {p && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          padding: '3px 8px', borderRadius: '6px',
                          background: p.bg, border: '1px solid ' + p.border,
                          flexShrink: 0,
                        }}>
                          <span style={{ fontSize: '12px' }}>{p.emoji}</span>
                          <span style={{ color: p.color, fontSize: '11px', fontWeight: 700 }}>{p.name}</span>
                        </div>
                      )}
                      <span style={{
                        color: '#8b9fc4', fontSize: '12px', flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {url.length > 65 ? url.slice(0, 65) + '...' : url}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Shopify toggle */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div onClick={() => shopifyOk && setPushShopify(prev => !prev)} style={{
              width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0,
              background: pushShopify && shopifyOk ? '#4f8ef7' : '#1a2234',
              border: '1px solid ' + (pushShopify && shopifyOk ? '#4f8ef7' : '#334155'),
              position: 'relative', cursor: shopifyOk ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}>
              <div style={{
                width: '16px', height: '16px', background: '#f0f4ff',
                borderRadius: '50%', position: 'absolute', top: '3px',
                transition: 'transform 0.2s',
                transform: pushShopify && shopifyOk ? 'translateX(23px)' : 'translateX(3px)',
              }} />
            </div>
            <div>
              <p style={{ color: '#f0f4ff', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>
                Synchroniser avec Shopify
              </p>
              {shopifyOk ? (
                <p style={{ ...lbl, margin: 0, color: '#86efac' }}> Boutique connectée</p>
              ) : (
                <p style={{ ...lbl, margin: 0, color: '#ef4444' }}>
                   Aucune boutique —{' '}
                  <a href="/dashboard/shops" style={{ color: '#4f8ef7', textDecoration: 'none' }}>Connecter</a>
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '20px' }}>
            <button onClick={doPreview} disabled={previewing || urls.length === 0}
              style={{ ...btnSec, opacity: urls.length === 0 ? 0.4 : 1 }}>
              {previewing ? '⏳ ...' : ' Aperçu'}
            </button>
            <button onClick={doImport} disabled={importing || urls.length === 0}
              style={{ ...btnPri, opacity: urls.length === 0 ? 0.4 : 1 }}>
              {importing ? '⏳ Importation...'
                : `⬆ Importer ${urls.length > 0 ? urls.length + ' produit(s)' : ''}`}
            </button>
          </div>

          {/* Progress */}
          {importing && progress > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', ...lbl, marginBottom: '6px' }}>
                <span>Importation en cours...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px' }}>
                <div style={{
                  height: '100%', borderRadius: '4px',
                  background: 'linear-gradient(90deg, #4f8ef7, #06b6d4)',
                  width: progress + '%', transition: 'width 0.4s',
                }} />
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div style={card}>
              <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '15px', margin: '0 0 14px' }}>
                {results.filter(r => r.success).length}/{results.length} produit(s) réussi(s)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', borderRadius: '12px',
                    background: r.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: '1px solid ' + (r.success ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'),
                  }}>
                    {r.success && r.image ? (
                      <img src={proxyImg(r.image)} alt={r.title || ''}
                        style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                        onError={e => { (e.currentTarget as HTMLImageElement).src = r.image! }} />
                    ) : (
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.04)', flexShrink: 0,
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '24px',
                      }}>
                        {r.success ? '' : ''}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: r.success ? '#f0f4ff' : '#fca5a5',
                        fontSize: '14px', fontWeight: 700, margin: '0 0 4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {r.success ? r.title : "Échec de l'import"}
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {r.success && r.price != null && (
                          <span style={{ color: '#4f8ef7', fontWeight: 900, fontSize: '15px' }}>
                            {r.price.toFixed(2)}€
                          </span>
                        )}
                        <span style={{ ...lbl, textTransform: 'capitalize' }}>
                          {r.success ? r.platform : r.error?.slice(0, 70)}
                        </span>
                      </div>
                    </div>
                    {r.shopify_id && (
                      <span style={{
                        background: 'rgba(34,197,94,0.15)', color: '#86efac',
                        fontSize: '12px', fontWeight: 700,
                        padding: '4px 10px', borderRadius: '8px', flexShrink: 0,
                      }}> Shopify</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state guide */}
          {urls.length === 0 && results.length === 0 && (
            <div style={card}>
              <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '14px', margin: '0 0 16px' }}>
                Plateformes supportées
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {([
                  ['', 'AliExpress', 'aliexpress.com/item/...', '#fca5a5'],
                  ['', 'CJDropshipping', 'cjdropshipping.com/...', '#93c5fd'],
                  ['', 'DHgate', 'dhgate.com/product/...', '#86efac'],
                  ['', 'Alibaba', 'alibaba.com/...', '#fcd34d'],
                  ['', 'Banggood', 'banggood.com/...', '#c4b5fd'],
                  ['', 'Tout site', "N'importe quelle URL", '#94a3b8'],
                ] as const).map(([emoji, name, url, color]) => (
                  <div key={name} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 12px', borderRadius: '12px',
                    background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color, fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{name}</p>
                      <p style={{ ...lbl, margin: 0, fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: '40px', margin: '0 0 12px' }}></p>
              <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '16px', margin: '0 0 6px' }}>
                Aucun import pour l&apos;instant
              </p>
              <p style={{ ...lbl }}>Votre historique apparaîtra ici</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((job) => (
                <div key={job.id} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '8px',
                          fontSize: '12px', fontWeight: 700,
                          background: job.status === 'completed'
                            ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                          color: job.status === 'completed' ? '#86efac' : '#fca5a5',
                        }}>
                          {job.status === 'completed' ? ' Terminé' : ' Échoué'}
                        </span>
                        <span style={{ ...lbl, textTransform: 'capitalize' }}>{job.platform}</span>
                      </div>
                      <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '14px', margin: 0 }}>
                        {job.imported_count}/{job.total_products} produits importés
                      </p>
                    </div>
                    <p style={{ ...lbl }}>
                      {new Date(job.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
