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
  width: '100%', background: "var(--surface-secondary)", border: "1px solid var(--apple-gray-200)",
  borderRadius: 8, color: "var(--text-primary)", fontSize: 14, fontWeight: 400,
  padding: '8px 12px', boxSizing: 'border-box', outline: 'none',
}

// ─── PreviewEntry type ────────────────────────────────────────────────────────
type PreviewEntry = {
  pid: string
  product: Product
  enabled: boolean
  title?: { old: string; new: string }
  description?: { old: string; new: string }
  tags?: { old: string; new: string }
  metaTitle?: { old: string; new: string }
  metaDesc?: { old: string; new: string }
}

// ─── BulkAIModal ─────────────────────────────────────────────────────────────
function BulkAIModal({
  products,
  selectedIds,
  onClose,
  onPublishDone,
}: {
  products: Product[]
  selectedIds: Set<string>
  onClose: () => void
  onPublishDone: () => void
}) {
  const selectedProds = products.filter(p => selectedIds.has(p.shopify_product_id || p.id))

  const [step, setStep] = useState<'config' | 'preview' | 'done'>('config')
  const [fields, setFields] = useState({ title: true, description: true, tags: true, metaTitle: true, metaDesc: true })
  const [lang, setLang] = useState('fr')
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genError, setGenError] = useState('')
  const [preview, setPreview] = useState<PreviewEntry[]>([])
  const [publishing, setPublishing] = useState(false)
  const [pubProgress, setPubProgress] = useState(0)
  const [pubResults, setPubResults] = useState<{ pid: string; ok: boolean; error?: string }[]>([])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const fieldsActive = Object.values(fields).some(Boolean)
  const enabledCount = preview.filter(e => e.enabled).length
  const LABELS: Record<string, string> = { title: 'Titre produit', description: 'Description', tags: 'Tags', metaTitle: 'Meta titre (SEO)', metaDesc: 'Meta description (SEO)' }
  const ICONS: Record<string, string> = { title: '✏️', description: '📝', tags: '🏷️', metaTitle: '🔍', metaDesc: '📋' }

  async function handleGenerate() {
    setGenerating(true); setGenProgress(0); setGenError('')
    const prods = selectedProds
    const apiPayload = prods.map(p => ({
      id: p.shopify_product_id || p.id,
      title: p.title,
      description: p.body_html || p.description || '',
      tags: p.tags || '',
    }))
    const entries: PreviewEntry[] = prods.map(p => ({
      pid: p.shopify_product_id || p.id,
      product: p,
      enabled: true,
    }))
    const activeCount = Object.values(fields).filter(Boolean).length
    let done = 0
    const tick = () => { done++; setGenProgress(Math.min(99, Math.round(done / activeCount * 100))) }
    const calls: Promise<void>[] = []

    if (fields.title) {
      calls.push(
        fetch('/api/ai/generate-titles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: apiPayload, language: lang }) })
          .then(r => r.json()).then((d: any) => {
            if (d.titles) d.titles.forEach((t: any) => { const e = entries.find(e => e.pid === t.id); if (e) e.title = { old: e.product.title, new: t.title } })
          }).catch(() => {}).finally(tick)
      )
    }
    if (fields.description) {
      const batches: typeof apiPayload[] = []
      for (let i = 0; i < apiPayload.length; i += 10) batches.push(apiPayload.slice(i, i + 10))
      calls.push(
        Promise.all(batches.map(b =>
          fetch('/api/ai/generate-descriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: b, language: lang }) }).then(r => r.json())
        )).then((rs: any[]) => {
          rs.forEach((d: any) => {
            if (d.descriptions) d.descriptions.forEach((x: any) => {
              const e = entries.find(e => e.pid === x.id)
              if (e) e.description = { old: e.product.body_html || e.product.description || '', new: x.description }
            })
          })
        }).catch(() => {}).finally(tick)
      )
    }
    if (fields.tags) {
      calls.push(
        fetch('/api/ai/generate-tags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: apiPayload, language: lang }) })
          .then(r => r.json()).then((d: any) => {
            if (d.tags) d.tags.forEach((t: any) => { const e = entries.find(e => e.pid === t.id); if (e) e.tags = { old: e.product.tags || '', new: t.tags } })
          }).catch(() => {}).finally(tick)
      )
    }
    if (fields.metaTitle) {
      calls.push(
        fetch('/api/ai/generate-meta-titles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: apiPayload }) })
          .then(r => r.json()).then((d: any) => {
            if (d.metaTitles) d.metaTitles.forEach((t: any) => { const e = entries.find(e => e.pid === t.id); if (e) e.metaTitle = { old: '', new: t.metaTitle } })
          }).catch(() => {}).finally(tick)
      )
    }
    if (fields.metaDesc) {
      calls.push(
        fetch('/api/ai/generate-meta-descriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: apiPayload }) })
          .then(r => r.json()).then((d: any) => {
            if (d.metaDescriptions) d.metaDescriptions.forEach((x: any) => { const e = entries.find(e => e.pid === x.id); if (e) e.metaDesc = { old: '', new: x.metaDescription } })
          }).catch(() => {}).finally(tick)
      )
    }

    try {
      await Promise.all(calls)
      setPreview(entries)
      setStep('preview')
      setGenProgress(100)
    } catch {
      setGenError('Erreur lors de la génération. Réessayez.')
    } finally {
      setGenerating(false)
    }
  }

  function updateField(pid: string, field: 'title' | 'description' | 'tags' | 'metaTitle' | 'metaDesc', val: string) {
    setPreview(prev => prev.map(e => {
      if (e.pid !== pid) return e
      const fd = e[field]
      return fd ? { ...e, [field]: { ...fd, new: val } } : e
    }))
  }

  function toggleEntry(pid: string) {
    setPreview(prev => prev.map(e => e.pid === pid ? { ...e, enabled: !e.enabled } : e))
  }

  function toggleAll() {
    const allOn = preview.every(e => e.enabled)
    setPreview(prev => prev.map(e => ({ ...e, enabled: !allOn })))
  }

  async function handlePublish() {
    setPublishing(true); setPubProgress(0)
    const toPublish = preview.filter(e => e.enabled)
    const results: { pid: string; ok: boolean; error?: string }[] = []
    for (let i = 0; i < toPublish.length; i++) {
      const entry = toPublish[i]
      const payload: any = {}
      if (entry.title) payload.title = entry.title.new
      if (entry.description) payload.body_html = entry.description.new
      if (entry.tags) payload.tags = entry.tags.new
      if (entry.metaTitle) payload.metafields_global_title_tag = entry.metaTitle.new
      if (entry.metaDesc) payload.metafields_global_description_tag = entry.metaDesc.new
      let ok = false
      let errMsg: string | undefined
      try {
        const res = await fetch('/api/shopify/products/' + entry.pid, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        })
        ok = res.ok
        if (!ok) {
          const errData = await res.json().catch(() => ({}))
          errMsg = errData.error || 'Erreur ' + res.status
        }
      } catch (e: any) {
        errMsg = e?.message || 'Erreur réseau'
      }
      results.push({ pid: entry.pid, ok, error: errMsg })
      setPubProgress(Math.round((i + 1) / toPublish.length * 100))
      await new Promise(r => setTimeout(r, 200))
    }
    setPubResults(results); setPublishing(false); setStep('done')
  }

  const successCount = pubResults.filter(r => r.ok).length
  const failCount = pubResults.filter(r => !r.ok).length

  return (
    <div className="aiOverlay" onClick={onClose}>
      <div className="aiModal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="aiModalHead">
          <div>
            <h2 className="aiModalTitle">✨ Génération IA en masse</h2>
            <p className="aiModalSub">
              {selectedProds.length} produit{selectedProds.length > 1 ? 's' : ''} sélectionné{selectedProds.length > 1 ? 's' : ''}
            </p>
          </div>
          <button className="aiClose" onClick={onClose}>✕</button>
        </div>

        {/* Steps */}
        <div className="aiStepBar">
          {(['config', 'preview', 'done'] as const).map((s, i) => {
            const isDone = (s === 'config' && (step === 'preview' || step === 'done')) || (s === 'preview' && step === 'done')
            const isActive = step === s
            return (
              <div key={s} className={'aiStep' + (isActive ? ' active' : isDone ? ' done' : '')}>
                <div className="aiStepNum">{isDone ? '✓' : i + 1}</div>
                <span className="aiStepLabel">{s === 'config' ? 'Configuration' : s === 'preview' ? 'Prévisualisation' : 'Terminé'}</span>
                {i < 2 && <div className="aiStepLine" />}
              </div>
            )
          })}
        </div>

        {/* ── Step 1: Config ── */}
        {step === 'config' && (
          <div className="aiBody">
            <p className="aiSectionLabel">Champs à générer</p>
            <div className="aiFieldGrid">
              {(['title', 'description', 'tags', 'metaTitle', 'metaDesc'] as const).map(f => (
                <div key={f} className={'aiFieldToggle' + (fields[f] ? ' active' : '')}
                  onClick={() => setFields(prev => ({ ...prev, [f]: !prev[f] }))}>
                  <span className="aiFieldIcon">{ICONS[f]}</span>
                  <span className="aiFieldName">{LABELS[f]}</span>
                  {fields[f] && <span className="aiFieldCheck">✓</span>}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <p className="aiSectionLabel">Langue du contenu</p>
              <select value={lang} onChange={e => setLang(e.target.value)} style={{ background: "var(--surface-secondary)", border: "1px solid var(--apple-gray-200)", borderRadius: 8, padding: '8px 14px', color: "var(--text-primary)", fontSize: 14, outline: 'none', cursor: 'pointer' }}>
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
                <option value="es">Espagnol</option>
                <option value="de">Allemand</option>
              </select>
            </div>

            {genError && (
              <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, marginTop: 14, padding: '10px 14px', background: "rgba(239,68,68,0.10)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.30)" }}>
                {genError}
              </p>
            )}

            {generating && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>Génération en cours...</span>
                  <span style={{ color: '#2563eb', fontSize: 13, fontWeight: 700 }}>{genProgress}%</span>
                </div>
                <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: genProgress + '%', background: 'linear-gradient(90deg, #2563eb, #7c3aed)', borderRadius: 4, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="aiPrimaryBtn" onClick={handleGenerate} disabled={generating || !fieldsActive} style={{ flex: 1 }}>
                {generating ? 'Génération en cours...' : '✨ Générer le contenu IA'}
              </button>
              <button className="aiGhostBtn" onClick={onClose}>Annuler</button>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ── */}
        {step === 'preview' && (
          <div className="aiBody">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <p style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 700, margin: 0 }}>Vérifiez et modifiez avant de publier</p>
                <p style={{ color: "var(--text-tertiary)", fontSize: 12, margin: '2px 0 0' }}>Cliquez sur un produit pour l&apos;inclure ou l&apos;ignorer</p>
              </div>
              <button className="aiGhostBtn" onClick={toggleAll} style={{ fontSize: 12, padding: '5px 10px' }}>
                {preview.every(e => e.enabled) ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            <div className="previewList">
              {preview.map(entry => {
                const img = asImageUrls(entry.product.images)[0]
                return (
                  <div key={entry.pid} className={'previewCard' + (entry.enabled ? '' : ' disabled')}>
                    <div className="previewCardHead" onClick={() => toggleEntry(entry.pid)}>
                      <div className={'previewCheck' + (entry.enabled ? ' on' : '')}>
                        {entry.enabled && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        )}
                      </div>
                      {img
                        ? <img src={img} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: "1px solid var(--apple-gray-200)", flexShrink: 0 }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 6, background: "var(--surface-secondary)", display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📦</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, color: "var(--text-primary)", fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.product.title}
                        </p>
                        {entry.product.vendor && <p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: 11 }}>{entry.product.vendor}</p>}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0, padding: '3px 8px', borderRadius: 20, background: entry.enabled ? '#dcfce7' : '#f3f4f6', color: entry.enabled ? '#059669' : '#9ca3af' }}>
                        {entry.enabled ? 'Inclus' : 'Ignoré'}
                      </span>
                    </div>

                    {entry.enabled && (
                      <div className="previewFields">
                        {entry.title && (
                          <div className="previewField">
                            <span className="previewFieldLabel">✏️ Titre</span>
                            <p className="previewOld">Avant : {entry.title.old || '—'}</p>
                            <input className="previewInput" value={entry.title.new} onChange={e => updateField(entry.pid, 'title', e.target.value)} />
                          </div>
                        )}
                        {entry.description && (
                          <div className="previewField">
                            <span className="previewFieldLabel">📝 Description</span>
                            <p className="previewOld">
                              Avant : {(entry.description.old || '').replace(/<[^>]*>/g, '').slice(0, 100) || '—'}
                              {(entry.description.old || '').replace(/<[^>]*>/g, '').length > 100 ? '...' : ''}
                            </p>
                            <textarea className="previewInput previewTextarea" value={entry.description.new} onChange={e => updateField(entry.pid, 'description', e.target.value)} />
                          </div>
                        )}
                        {entry.tags && (
                          <div className="previewField">
                            <span className="previewFieldLabel">🏷️ Tags</span>
                            <p className="previewOld">Avant : {entry.tags.old || '—'}</p>
                            <input className="previewInput" value={entry.tags.new} onChange={e => updateField(entry.pid, 'tags', e.target.value)} />
                          </div>
                        )}
                        {entry.metaTitle && (
                          <div className="previewField">
                            <span className="previewFieldLabel">🔍 Meta titre SEO</span>
                            <input className="previewInput" value={entry.metaTitle.new} onChange={e => updateField(entry.pid, 'metaTitle', e.target.value)} />
                          </div>
                        )}
                        {entry.metaDesc && (
                          <div className="previewField">
                            <span className="previewFieldLabel">📋 Meta description SEO</span>
                            <textarea className="previewInput previewTextareaSmall" value={entry.metaDesc.new} onChange={e => updateField(entry.pid, 'metaDesc', e.target.value)} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {publishing && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>Publication...</span>
                  <span style={{ color: '#059669', fontSize: 13, fontWeight: 700 }}>{pubProgress}%</span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pubProgress + '%', background: '#059669', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="aiPrimaryBtn" onClick={handlePublish} disabled={publishing || enabledCount === 0}
                style={{ flex: 1, minWidth: 200, background: '#059669' }}>
                {publishing ? 'Publication...' : '🚀 Publier ' + enabledCount + ' produit' + (enabledCount > 1 ? 's' : '') + ' sur Shopify'}
              </button>
              <button className="aiGhostBtn" onClick={() => { setStep('config'); setGenProgress(0) }} disabled={publishing}>
                ← Modifier
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && (
          <div className="aiBody" style={{ padding: '32px 24px 28px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>{successCount > 0 ? '🎉' : '⚠️'}</div>
              <h3 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>
                {successCount > 0
                  ? successCount + ' produit' + (successCount > 1 ? 's' : '') + ' publié' + (successCount > 1 ? 's' : '') + ' !'
                  : 'Publication échouée'}
              </h3>
              {successCount > 0 && (
                <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: '0 0 16px' }}>
                  Le contenu IA a été synchronisé sur votre boutique Shopify.
                </p>
              )}
            </div>
            {failCount > 0 && (
              <div style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)", borderRadius: 10, padding: '12px 14px', marginTop: 4 }}>
                <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 700, margin: '0 0 8px' }}>
                  {failCount} échec{failCount > 1 ? 's' : ''}
                </p>
                {pubResults.filter(r => !r.ok).map(r => {
                  const prod = preview.find(e => e.pid === r.pid)
                  return (
                    <p key={r.pid} style={{ color: '#b91c1c', fontSize: 12, margin: '3px 0 0' }}>
                      • {prod?.product.title || r.pid}: {r.error || 'Erreur inconnue'}
                    </p>
                  )
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
              {successCount > 0
                ? <button className="aiPrimaryBtn" onClick={() => { onPublishDone(); onClose() }}>Fermer et rafraîchir</button>
                : <>
                    <button className="aiPrimaryBtn" onClick={() => setStep('preview')} style={{ background: '#374151' }}>← Réessayer</button>
                    <button className="aiGhostBtn" onClick={onClose}>Fermer</button>
                  </>
              }
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .aiOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 300; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .aiModal { background: #fff; border-radius: 18px; width: 100%; max-width: 740px; max-height: 92vh; display: flex; flex-direction: column; box-shadow: 0 30px 80px rgba(0,0,0,0.28); overflow: hidden; }
        .aiModalHead { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 24px 16px; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; }
        .aiModalTitle { margin: 0; color: #111827; font-size: 19px; font-weight: 700; }
        .aiModalSub { margin: 4px 0 0; color: #6b7280; font-size: 13px; }
        .aiClose { border: 0; background: transparent; color: #9ca3af; font-size: 18px; cursor: pointer; padding: 2px 8px; border-radius: 6px; line-height: 1; }
        .aiClose:hover { background: #f3f4f6; color: #374151; }
        .aiStepBar { display: flex; align-items: center; padding: 12px 24px; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; }
        .aiStep { display: flex; align-items: center; gap: 7px; }
        .aiStepNum { width: 24px; height: 24px; border-radius: 50%; background: #e5e7eb; color: #9ca3af; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .aiStepLabel { color: #9ca3af; font-size: 12px; font-weight: 500; white-space: nowrap; }
        .aiStep.active .aiStepNum { background: #2563eb; color: white; }
        .aiStep.active .aiStepLabel { color: #111827; font-weight: 700; }
        .aiStep.done .aiStepNum { background: #059669; color: white; }
        .aiStep.done .aiStepLabel { color: #374151; font-weight: 600; }
        .aiStepLine { flex: 1; height: 1px; background: #e5e7eb; margin: 0 8px; min-width: 20px; }
        .aiBody { flex: 1; overflow-y: auto; padding: 20px 24px 24px; }
        .aiSectionLabel { color: #374151; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 10px; }
        .aiFieldGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (min-width: 480px) { .aiFieldGrid { grid-template-columns: repeat(3, 1fr); } }
        .aiFieldToggle { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border: 2px solid #e5e7eb; border-radius: 10px; cursor: pointer; transition: all 0.12s; }
        .aiFieldToggle:hover { border-color: #93c5fd; background: #f0f9ff; }
        .aiFieldToggle.active { border-color: #2563eb; background: #eff6ff; }
        .aiFieldIcon { font-size: 17px; flex-shrink: 0; }
        .aiFieldName { color: #374151; font-size: 12px; font-weight: 600; flex: 1; line-height: 1.3; }
        .aiFieldCheck { color: #2563eb; font-size: 14px; font-weight: 700; }
        .previewList { max-height: 50vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 2px; }
        .previewCard { border: 1.5px solid #e5e7eb; border-radius: 10px; overflow: hidden; transition: opacity 0.15s; }
        .previewCard.disabled { opacity: 0.45; }
        .previewCardHead { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; background: #f9fafb; }
        .previewCardHead:hover { background: #f3f4f6; }
        .previewCheck { width: 18px; height: 18px; border-radius: 4px; border: 1.5px solid #d1d5db; background: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .previewCheck.on { background: #2563eb; border-color: #2563eb; }
        .previewFields { padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; background: #fff; border-top: 1px solid #f3f4f6; }
        .previewField { display: flex; flex-direction: column; gap: 4px; }
        .previewFieldLabel { color: #374151; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .previewOld { margin: 0; color: #9ca3af; font-size: 11px; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .previewInput { width: 100%; background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; color: #111827; font-size: 13px; padding: 7px 10px; outline: none; box-sizing: border-box; font-family: inherit; }
        .previewInput:focus { border-color: #3b82f6; background: #fff; }
        .previewTextarea { min-height: 80px; resize: vertical; }
        .previewTextareaSmall { min-height: 60px; resize: vertical; }
        .aiPrimaryBtn { border: none; background: #2563eb; color: white; border-radius: 10px; font-size: 14px; font-weight: 600; padding: 11px 18px; cursor: pointer; transition: background 0.15s; white-space: nowrap; }
        .aiPrimaryBtn:hover:not(:disabled) { background: #1d4ed8; }
        .aiPrimaryBtn:disabled { opacity: 0.5; cursor: wait; }
        .aiGhostBtn { border: 1px solid #d1d5db; background: #fff; color: #374151; border-radius: 8px; font-size: 13px; font-weight: 500; padding: 8px 14px; cursor: pointer; white-space: nowrap; }
        .aiGhostBtn:hover:not(:disabled) { background: #f9fafb; }
        .aiGhostBtn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  )
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
  const [showAIModal, setShowAIModal] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

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
    if (!selectedIds.size) return
    if (action !== 'status' && !bulkValue.trim()) {
      setBulkMsg('Veuillez saisir une valeur'); setBulkMsgOk(false); return
    }

    // Map UI action + priceType to API action string
    let apiAction = action as string
    if (action === 'price') {
      if (priceType === 'set') apiAction = 'set_price'
      else if (priceType === 'increase_pct') apiAction = 'increase_price_percent'
      else if (priceType === 'decrease_pct') apiAction = 'decrease_price_percent'
    } else if (action === 'tags_add') {
      apiAction = 'add_tag'
    } else if (action === 'status') {
      apiAction = 'set_status'
    } else if (action === 'title_suffix') {
      apiAction = 'title_suffix'
    }

    // Resolve local DB ids from selectedIds (which hold shopify_product_id || id)
    const productIds = Array.from(selectedIds)
      .map(sid => products.find(p => (p.shopify_product_id || p.id) === sid)?.id)
      .filter((id): id is string => Boolean(id))

    if (productIds.length === 0) {
      setBulkMsg('Produits introuvables'); setBulkMsgOk(false); return
    }

    setApplying(true); setBulkMsg('')

    try {
      const res = await fetch('/api/shopify/products/bulk', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds, action: apiAction, value: bulkValue }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setBulkMsg(data.error || 'Erreur lors de l\'application'); setBulkMsgOk(false)
      } else {
        setBulkMsg(data.message || data.successCount + ' produit(s) mis à jour'); setBulkMsgOk(true)
        setSelectedIds(new Set())
        setBulkValue('')
        await fetchProducts(page, search)
      }
    } catch (e: any) {
      setBulkMsg('Erreur réseau: ' + e.message); setBulkMsgOk(false)
    } finally {
      setApplying(false)
      setTimeout(() => setBulkMsg(''), 8000)
    }
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
    background: "var(--surface-primary)", border: "1px solid var(--apple-gray-200)", borderRadius: 8,
    color: "var(--text-primary)", fontSize: 13, padding: '7px 10px', outline: 'none',
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
        <div style={{ background: "var(--surface-primary)", border: "1px solid var(--apple-gray-200)", borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔗</div>
          <p style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Aucune boutique connectée</p>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: '0 0 20px' }}>
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
            {/* View mode toggle */}
            <div style={{ display: 'flex', gap: '2px', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
              <button
                onClick={() => setViewMode('grid')}
                title="Vue grille"
                style={{ background: viewMode === 'grid' ? '#2563eb' : '#fff', color: viewMode === 'grid' ? '#fff' : '#6b7280', border: 'none', padding: '7px 10px', cursor: 'pointer', lineHeight: 1 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="0" y="0" width="6" height="6" rx="1"/><rect x="8" y="0" width="6" height="6" rx="1"/>
                  <rect x="0" y="8" width="6" height="6" rx="1"/><rect x="8" y="8" width="6" height="6" rx="1"/>
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Vue liste"
                style={{ background: viewMode === 'list' ? '#2563eb' : '#fff', color: viewMode === 'list' ? '#fff' : '#6b7280', border: 'none', padding: '7px 10px', cursor: 'pointer', lineHeight: 1 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="0" y="0" width="14" height="2.5" rx="1.25"/><rect x="0" y="5.75" width="14" height="2.5" rx="1.25"/>
                  <rect x="0" y="11.5" width="14" height="2.5" rx="1.25"/>
                </svg>
              </button>
            </div>
          </div>

          {/* ── Bulk action bar (appears when items selected) ── */}
          {selectedIds.size > 0 && (
            <div className="bulkBar">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, width: '100%' }}>
                <span className="bulkCount">
                  {selectedIds.size} produit{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                </span>
                <span className="aiBulkWrap">
                  <button className="aiBulkBtn" onClick={() => setShowAIModal(true)}>
                    ✨ Générer avec l&apos;IA
                  </button>
                  <span className="aiBulkTooltip">
                    <strong>Génère automatiquement :</strong>
                    <br />✏️ Titres produit optimisés
                    <br />📝 Descriptions persuasives
                    <br />🏷️ Tags pour le référencement
                    <br />🔍 Meta titres SEO
                    <br />📋 Meta descriptions SEO
                  </span>
                </span>
              </div>

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
              <p style={{ color: "var(--text-tertiary)", fontSize: 14 }}>Chargement des produits...</p>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && products.length === 0 && (
            <div style={{ background: "var(--surface-primary)", border: "1px solid var(--apple-gray-200)", borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📦</div>
              <p style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>Aucun produit trouvé</p>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, margin: '0 0 20px' }}>
                Cliquez sur Synchroniser Shopify pour importer vos produits.
              </p>
              <button className="primaryBtn" onClick={doSync} disabled={syncing}>
                {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
              </button>
            </div>
          )}

          {/* ── Products grid / list ── */}
          {!loading && products.length > 0 && viewMode === 'grid' && (
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

          {/* ── Products list view ── */}
          {!loading && products.length > 0 && viewMode === 'list' && (
            <div className="productList">
              {products.map(p => {
                const id = p.shopify_product_id || p.id
                const isSel = selectedIds.has(id)
                const image = asImageUrls(p.images)[0]
                const priceNum = typeof p.price === 'number' ? p.price : Number(p.price || 0)
                const statusLabel = p.status === 'active' ? 'Actif' : p.status === 'draft' ? 'Brouillon' : p.status === 'archived' ? 'Archivé' : p.status || '—'
                const statusColor = p.status === 'active' ? { bg: '#dcfce7', color: '#15803d' } : p.status === 'draft' ? { bg: '#f3f4f6', color: '#6b7280' } : { bg: '#fef3c7', color: '#b45309' }
                return (
                  <div key={id} className={'listRow' + (isSel ? ' selected' : '')} onClick={() => openEdit(p)}>
                    {/* Checkbox */}
                    <div
                      className={'cardCheck' + (isSel ? ' on' : '')}
                      style={{ position: 'relative', top: 'unset', left: 'unset', flexShrink: 0 }}
                      onClick={e => { e.stopPropagation(); toggleSelect(id) }}
                    >
                      {isSel && (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M1.5 5.5l2.5 2.5 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    {/* Image */}
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', background: '#f3f4f6', border: '1px solid #e5e7eb', flexShrink: 0 }}>
                      {image
                        ? <img src={image} alt={p.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                      }
                    </div>
                    {/* Title + vendor */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, color: '#111827', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                      {p.vendor && <p style={{ margin: 0, color: '#6b7280', fontSize: '12px' }}>{p.vendor}</p>}
                    </div>
                    {/* Price */}
                    <p style={{ margin: 0, color: '#2563eb', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                      {Number.isFinite(priceNum) && priceNum > 0 ? priceNum.toFixed(2) + ' €' : '—'}
                    </p>
                    {/* Status badge */}
                    {p.status && (
                      <span style={{ ...statusColor, fontSize: '11px', fontWeight: 700, padding: '2px 9px', borderRadius: '20px', flexShrink: 0 }}>
                        {statusLabel}
                      </span>
                    )}
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

      {/* ── AI bulk modal ── */}
      {showAIModal && (
        <BulkAIModal
          products={products}
          selectedIds={selectedIds}
          onClose={() => setShowAIModal(false)}
          onPublishDone={() => fetchProducts(page, search)}
        />
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
          display: flex; flex-direction: column; gap: 8px;
          background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;
          padding: 10px 14px; margin-bottom: 14px;
        }
        .bulkCount { color: #1d4ed8; font-size: 14px; font-weight: 700; white-space: nowrap; flex-shrink: 0; }
        .bulkControls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .aiBulkBtn { background: linear-gradient(135deg, #7c3aed, #2563eb); color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 700; padding: 8px 16px; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; }
        .aiBulkBtn:hover { opacity: 0.88; }

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

        /* List view */
        .productList { display: flex; flex-direction: column; gap: 6px; }
        .listRow {
          display: flex; align-items: center; gap: 12px;
          background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px;
          padding: 8px 12px; cursor: pointer; transition: all 0.12s;
        }
        .listRow:hover { border-color: #93c5fd; background: #f0f9ff; }
        .listRow.selected { background: #eff6ff; border-color: #3b82f6; }

        /* AI tooltip */
        .aiBulkWrap { position: relative; display: inline-block; }
        .aiBulkTooltip {
          display: none; position: absolute; bottom: calc(100% + 8px); left: 50%;
          transform: translateX(-50%);
          background: #1e293b; color: #f8fafc; font-size: 12px; line-height: 1.6;
          padding: 10px 14px; border-radius: 10px; white-space: nowrap;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 100; pointer-events: none;
        }
        .aiBulkTooltip::after {
          content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
          border: 6px solid transparent; border-top-color: #1e293b;
        }
        .aiBulkWrap:hover .aiBulkTooltip { display: block; }
      `}</style>
    </div>
  )
}
