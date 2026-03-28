const fs = require('fs')
const path = require('path')

const content = `'use client'
// REWRITE v3 — bulletproof layout, no overflow
import { useState, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Auto = {
  id: string
  name: string
  type: string
  config: Record<string, unknown>
  is_active: boolean
  last_run_at?: string
  run_count?: number
  created_at: string
}
type RunResult = { success: boolean; message: string; count?: number }

// ─── Automation catalog ───────────────────────────────────────────────────────
const CAT = [
  {
    id: 'seo',
    emoji: '🔍',
    color: '#2563eb',
    bg: '#eff6ff',
    border: '#bfdbfe',
    name: 'Optimisation SEO des titres',
    pitch: 'Vos titres sont souvent copiés-collés des fournisseurs, mal écrits, sans mots-clés. Cette automatisation les reformate pour Google et Shopify.',
    impact: 'En moyenne +34% de clics organiques',
    before: 'ref-2345 robe femme noir polyester XL',
    after: 'Robe Femme Noire Longue — Coupe Slim, Taille XL',
    fields: [
      { key: 'max_per_run', label: 'Produits à traiter par exécution', type: 'number', default: 5, min: 1, max: 50, hint: 'Commencez par 5 pour tester' },
    ],
  },
  {
    id: 'price',
    emoji: '💰',
    color: '#059669',
    bg: '#f0fdf4',
    border: '#6ee7b7',
    name: 'Ajustement automatique des prix',
    pitch: 'Adaptez vos marges en un coup. Augmentez les prix pendant les périodes fortes, baissez-les pour liquider les stocks.',
    impact: 'Modifie jusqu\'à 200 prix en moins de 30 secondes',
    before: 'Produit à 12,50€ avec marge de 15%',
    after: 'Prix augmenté à 14,38€ — marge à 29%',
    fields: [
      { key: 'action', label: 'Que faire ?', type: 'select', options: [{ v: 'increase', l: '📈 Augmenter les prix' }, { v: 'decrease', l: '📉 Baisser les prix' }], default: 'increase' },
      { key: 'percent', label: 'De combien ? (%)', type: 'number', default: 10, min: 1, max: 80, hint: '10% = multiplier par 1.10' },
      { key: 'max_products', label: 'Nombre max de produits', type: 'number', default: 50, min: 1, max: 200 },
    ],
  },
  {
    id: 'title_template',
    emoji: '✏️',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#c4b5fd',
    name: 'Gabarit de titre uniforme',
    pitch: 'Donnez un style cohérent à toute votre boutique. Un titre bien structuré rassure les acheteurs et améliore votre image de marque.',
    impact: 'Uniformise 100% de vos produits en 1 clic',
    before: 'Lunettes soleil + Montre homme offerte',
    after: 'Lunettes Soleil Homme | Boutique ModeXL',
    fields: [
      { key: 'template', label: 'Modèle de titre', type: 'text', default: '{title} | {vendor}', hint: 'Variables disponibles: {title} {vendor} {type}' },
      { key: 'max_per_run', label: 'Produits max', type: 'number', default: 20, min: 1, max: 100 },
    ],
  },
  {
    id: 'tag_add',
    emoji: '🏷️',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fcd34d',
    name: 'Ajouter des tags en masse',
    pitch: 'Les tags permettent aux collections automatiques Shopify de trouver vos produits. Sans bons tags, vos produits sont invisibles dans vos collections.',
    impact: 'Ajoute des tags à 100+ produits instantanément',
    before: 'Produit sans tag — absent de 3 collections',
    after: 'Tags "promo, été, bestseller" ajoutés — visible partout',
    fields: [
      { key: 'tags', label: 'Tags à ajouter (séparés par virgule)', type: 'text', default: '', hint: 'Ex: promo, bestseller, été-2024' },
    ],
  },
  {
    id: 'tag_remove',
    emoji: '🗑️',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    name: 'Supprimer des tags obsolètes',
    pitch: 'Après une promo ou une saison, certains tags deviennent incorrects. Nettoyez-les en masse plutôt que produit par produit.',
    impact: 'Nettoie 100+ produits en quelques secondes',
    before: 'Tag "soldes-été-2023" encore sur 87 produits',
    after: 'Tag supprimé — catalogues propres et à jour',
    fields: [
      { key: 'tags', label: 'Tags à supprimer (séparés par virgule)', type: 'text', default: '', hint: 'Ex: soldes-2023, rupture-stock' },
    ],
  },
  {
    id: 'status_change',
    emoji: '🔄',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#7dd3fc',
    name: 'Publier / Dépublier en masse',
    pitch: 'Gérez la visibilité de vos produits selon les stocks ou les saisons. Publiez une nouvelle collection ou archivez les anciens.',
    impact: 'Change le statut de 50 produits en 1 clic',
    before: '34 produits en brouillon depuis 2 semaines',
    after: 'Tous publiés et visibles en boutique',
    fields: [
      { key: 'from_status', label: 'Modifier les produits actuellement...', type: 'select', options: [{ v: 'draft', l: 'En brouillon → Publier' }, { v: 'active', l: 'Publiés → Archiver' }, { v: 'archived', l: 'Archivés → Republier' }], default: 'draft' },
    ],
  },
  {
    id: 'description_add',
    emoji: '📝',
    color: '#db2777',
    bg: '#fdf2f8',
    border: '#f9a8d4',
    name: 'Compléter les descriptions vides',
    pitch: 'Les produits sans description convertissent 3x moins. Cette automatisation ajoute un texte d\'accroche aux produits qui en sont dépourvus.',
    impact: 'Améliore le taux de conversion des produits sans description',
    before: 'Produit sans description — taux de conversion: 0.8%',
    after: 'Description ajoutée — taux de conversion: 2.4%',
    fields: [
      { key: 'prefix', label: 'Texte d\'introduction (avant)', type: 'text', default: '', hint: 'Ex: Produit premium sélectionné avec soin.' },
      { key: 'suffix', label: 'Texte de fin (après)', type: 'text', default: '', hint: 'Ex: Livraison rapide sous 7-15 jours.' },
      { key: 'max_per_run', label: 'Produits max par exécution', type: 'number', default: 10, min: 1, max: 50 },
    ],
  },
  {
    id: 'sync_shopify',
    emoji: '🔗',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#93c5fd',
    name: 'Synchronisation Shopify',
    pitch: 'Importez automatiquement tous vos produits Shopify dans EcomPilot pour avoir vos données à jour avant une optimisation.',
    impact: 'Synchronise 250+ produits en moins d\'une minute',
    before: 'EcomPilot désynchronisé — 12 nouveaux produits manquants',
    after: 'Tous les produits synchronisés — prêts à optimiser',
    fields: [],
  },
]

type CatItem = typeof CAT[number]
type CatField = CatItem['fields'][number]

// ─── Styles ───────────────────────────────────────────────────────────────────
const PAGE: React.CSSProperties = { background: '#f8fafc', minHeight: '100vh', padding: 'clamp(16px,4vw,32px)', boxSizing: 'border-box' }
const INNER: React.CSSProperties = { maxWidth: '1000px', margin: '0 auto' }
const CARD: React.CSSProperties = { background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const INP: React.CSSProperties = { width: '100%', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '9px', color: '#111827', fontSize: '14px', padding: '9px 13px', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }
const LBL: React.CSSProperties = { color: '#374151', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '6px' }
const BTN_PRI = (color = '#2563eb'): React.CSSProperties => ({ padding: '10px 20px', background: color, color: '#fff', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' })
const BTN_SEC: React.CSSProperties = { padding: '9px 16px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '9px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }

// ─── Component ────────────────────────────────────────────────────────────────
export default function AutomationPage() {
  const [automations, setAutomations] = useState<Auto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'list' | 'create'>('list')
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedCat, setSelectedCat] = useState<CatItem | null>(null)
  const [form, setForm] = useState<{ name: string; config: Record<string, unknown> }>({ name: '', config: {} })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [runningId, setRunningId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, RunResult>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Automatisations — EcomPilot Elite'
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/automations', { credentials: 'include', cache: 'no-store' })
      const text = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(text) } catch { setError('Erreur serveur'); return }
      if (res.status === 401) { setError('Session expirée — rechargez la page'); return }
      if (!res.ok) { setError((data.error as string) || 'Erreur ' + res.status); return }
      setAutomations((data.automations as Auto[]) || [])
    } catch (e: unknown) { setError('Erreur réseau: ' + (e as Error).message) }
    finally { setLoading(false) }
  }

  function pickCat(cat: CatItem) {
    setSelectedCat(cat)
    const defaults: Record<string, unknown> = {}
    ;(cat.fields as readonly CatField[]).forEach(f => { defaults[f.key] = 'default' in f ? f.default : '' })
    setForm({ name: cat.name, config: defaults })
    setStep(2)
    setTab('create')
  }

  async function create() {
    if (!form.name.trim() || !selectedCat) { setSaveError('Nom requis'); return }
    setSaving(true); setSaveError('')
    try {
      const res = await fetch('/api/automations', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), type: selectedCat.id, config: form.config }),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) { setSaveError((data.error as string) || 'Erreur'); return }
      setAutomations(p => [(data.automation as Auto), ...p])
      setTab('list'); setStep(1); setSelectedCat(null)
    } catch (e: unknown) { setSaveError((e as Error).message) }
    finally { setSaving(false) }
  }

  async function toggle(id: string, cur: boolean) {
    setAutomations(p => p.map(a => a.id === id ? { ...a, is_active: !cur } : a))
    const res = await fetch('/api/automations', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !cur }),
    })
    if (!res.ok) setAutomations(p => p.map(a => a.id === id ? { ...a, is_active: cur } : a))
  }

  async function del(id: string) {
    if (!confirm('Supprimer cette automatisation ?')) return
    setAutomations(p => p.filter(a => a.id !== id))
    await fetch('/api/automations', {
      method: 'DELETE', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  async function run(id: string) {
    setRunningId(id)
    setResults(p => ({ ...p, [id]: { success: true, message: 'En cours...' } }))
    try {
      const res = await fetch('/api/automations/run', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json() as Record<string, unknown>
      const details = data.details as Record<string, unknown> | undefined
      setResults(p => ({
        ...p,
        [id]: {
          success: res.ok && data.success !== false,
          message: (data.message as string) || (data.error as string) || 'Terminé',
          count: (details?.productsUpdated as number) || (details?.updated as number) || undefined,
        },
      }))
      if (res.ok) await load()
    } catch (e: unknown) {
      setResults(p => ({ ...p, [id]: { success: false, message: 'Erreur: ' + (e as Error).message } }))
    }
    setRunningId(null)
  }

  const getCat = (type: string) => CAT.find(c => c.id === type)
  const activeCount = automations.filter(a => a.is_active).length
  const totalRuns = automations.reduce((s, a) => s + (a.run_count || 0), 0)

  // ── CREATE TAB ──────────────────────────────────────────────────────────────
  if (tab === 'create') {
    return (
      <div style={PAGE}>
        <div style={INNER}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
            <button onClick={() => { setTab('list'); setStep(1); setSelectedCat(null) }} style={BTN_SEC}>
              ← Retour
            </button>
            <div>
              <h1 style={{ color: '#111827', fontSize: '20px', fontWeight: 700, margin: '0 0 2px 0' }}>
                {step === 1 ? 'Quelle automatisation voulez-vous créer ?' : 'Configurer : ' + selectedCat?.name}
              </h1>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                Étape {step}/2 — {step === 1 ? 'Choisissez le type' : 'Personnalisez les réglages'}
              </p>
            </div>
          </div>

          {/* Step 1: Type picker */}
          {step === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: '14px' }}>
              {CAT.map(cat => (
                <button key={cat.id} onClick={() => pickCat(cat)}
                  style={{ ...CARD, padding: 0, cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s,transform 0.1s', border: '1px solid #e5e7eb' }}
                  onMouseOver={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'; el.style.transform = 'translateY(-1px)' }}
                  onMouseOut={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; el.style.transform = 'none' }}>
                  <div style={{ height: '4px', borderRadius: '14px 14px 0 0', background: cat.color }} />
                  <div style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: cat.bg, border: '1px solid ' + cat.border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        {cat.emoji}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#111827', fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0', lineHeight: 1.3 }}>{cat.name}</p>
                        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{cat.pitch}</p>
                      </div>
                    </div>
                    {/* Before / After */}
                    <div style={{ background: cat.bg, border: '1px solid ' + cat.border, borderRadius: '9px', padding: '10px 12px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, minWidth: '36px', paddingTop: '1px', textTransform: 'uppercase' }}>Avant</span>
                        <span style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.4, fontStyle: 'italic' }}>{cat.before}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ color: cat.color, fontSize: '10px', fontWeight: 700, minWidth: '36px', paddingTop: '1px', textTransform: 'uppercase' }}>Après</span>
                        <span style={{ color: '#111827', fontSize: '12px', lineHeight: 1.4, fontWeight: 600 }}>{cat.after}</span>
                      </div>
                    </div>
                    <p style={{ color: cat.color, fontSize: '12px', fontWeight: 600, margin: 0 }}>↗ {cat.impact}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Config + Preview */}
          {step === 2 && selectedCat && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: '20px', alignItems: 'start' }}>
              {/* Form */}
              <div style={{ ...CARD, padding: '24px' }}>
                <h2 style={{ color: '#111827', fontSize: '16px', fontWeight: 700, margin: '0 0 20px 0' }}>Réglages de l&apos;automatisation</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={LBL}>Nom de l&apos;automatisation *</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={'Ex: ' + selectedCat.name} style={INP} autoFocus />
                  </div>
                  {(selectedCat.fields as readonly CatField[]).map(field => (
                    <div key={field.key}>
                      <label style={LBL}>{field.label}</label>
                      {'options' in field ? (
                        <select value={String(form.config[field.key] ?? field.default)}
                          onChange={e => setForm(f => ({ ...f, config: { ...f.config, [field.key]: e.target.value } }))}
                          style={{ ...INP, cursor: 'pointer' }}>
                          {(field.options as { v: string; l: string }[]).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                      ) : field.type === 'number' ? (
                        <div>
                          <input type="number" min={'min' in field ? field.min : undefined} max={'max' in field ? field.max : undefined}
                            value={String(form.config[field.key] ?? field.default)}
                            onChange={e => setForm(f => ({ ...f, config: { ...f.config, [field.key]: parseInt(e.target.value) || ('default' in field ? field.default : 0) } }))}
                            style={{ ...INP, maxWidth: '160px' }} />
                          {'hint' in field && field.hint && <p style={{ color: '#9ca3af', fontSize: '12px', margin: '4px 0 0', fontStyle: 'italic' }}>{field.hint as string}</p>}
                        </div>
                      ) : (
                        <div>
                          <input type="text" placeholder={'hint' in field ? (field.hint as string) : ''}
                            value={String(form.config[field.key] ?? ('default' in field ? field.default : ''))}
                            onChange={e => setForm(f => ({ ...f, config: { ...f.config, [field.key]: e.target.value } }))}
                            style={INP} />
                          {'hint' in field && field.hint && <p style={{ color: '#9ca3af', fontSize: '12px', margin: '4px 0 0', fontStyle: 'italic' }}>{field.hint as string}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {saveError && <p style={{ color: '#dc2626', fontSize: '13px', margin: '16px 0 0', fontWeight: 500 }}>{saveError}</p>}
                <div style={{ display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button onClick={() => setStep(1)} style={BTN_SEC}>← Changer de type</button>
                  <button onClick={create} disabled={saving || !form.name.trim()}
                    style={{ ...BTN_PRI(selectedCat.color), opacity: saving || !form.name.trim() ? 0.6 : 1 }}>
                    {saving ? 'Création...' : "Créer l'automatisation"}
                  </button>
                </div>
              </div>

              {/* Preview side panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ ...CARD, padding: '20px', background: selectedCat.bg, border: '1px solid ' + selectedCat.border }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{selectedCat.emoji}</div>
                  <p style={{ color: '#111827', fontSize: '15px', fontWeight: 700, margin: '0 0 8px 0' }}>{selectedCat.name}</p>
                  <p style={{ color: '#374151', fontSize: '13px', margin: '0 0 14px 0', lineHeight: 1.6 }}>{selectedCat.pitch}</p>
                  <div style={{ padding: '10px 14px', background: '#ffffff', borderRadius: '9px', border: '1px solid ' + selectedCat.border }}>
                    <p style={{ color: selectedCat.color, fontSize: '13px', fontWeight: 700, margin: '0 0 3px 0' }}>↗ {selectedCat.impact}</p>
                    <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>Résultat moyen observé</p>
                  </div>
                </div>
                <div style={{ ...CARD, padding: '16px' }}>
                  <p style={{ color: '#6b7280', fontSize: '11px', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Exemple concret</p>
                  <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', marginBottom: '6px' }}>
                    <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, margin: '0 0 3px 0', textTransform: 'uppercase' }}>Avant</p>
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>{selectedCat.before}</p>
                  </div>
                  <div style={{ textAlign: 'center', color: selectedCat.color, fontSize: '16px', margin: '4px 0' }}>↓</div>
                  <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px' }}>
                    <p style={{ color: '#059669', fontSize: '10px', fontWeight: 700, margin: '0 0 3px 0', textTransform: 'uppercase' }}>Après</p>
                    <p style={{ color: '#111827', fontSize: '12px', margin: 0, fontWeight: 600 }}>{selectedCat.after}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── LIST TAB ────────────────────────────────────────────────────────────────
  return (
    <div style={PAGE}>
      <div style={INNER}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h1 style={{ color: '#111827', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
              Automatisations
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Exécutez des actions en masse sur vos produits en 1 clic
            </p>
          </div>
          <button onClick={() => { setStep(1); setSelectedCat(null); setTab('create') }}
            style={{ ...BTN_PRI('#2563eb'), fontSize: '15px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>+</span> Créer une automatisation
          </button>
        </div>

        {/* Stats row */}
        {!loading && automations.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(160px,100%),1fr))', gap: '12px', marginBottom: '24px' }}>
            {([
              { label: 'Automatisations', value: automations.length, color: '#2563eb' },
              { label: 'Actives', value: activeCount, color: '#059669' },
              { label: 'Exécutions totales', value: totalRuns, color: '#7c3aed' },
              { label: 'Types disponibles', value: CAT.length, color: '#d97706' },
            ] as const).map(stat => (
              <div key={stat.label} style={{ ...CARD, padding: '16px 20px', textAlign: 'center' }}>
                <p style={{ color: stat.color, fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0', lineHeight: 1 }}>{stat.value}</p>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, fontWeight: 500 }}>{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, fontWeight: 500 }}>{error}</p>
            <button onClick={load} style={{ ...BTN_SEC, color: '#dc2626', borderColor: '#fecaca', flexShrink: 0 }}>Réessayer</button>
          </div>
        )}

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af', fontSize: '15px' }}>Chargement...</div>}

        {/* Empty state */}
        {!loading && !error && automations.length === 0 && (
          <div>
            <div style={{ ...CARD, padding: '40px 32px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>⚡</div>
              <h2 style={{ color: '#111827', fontSize: '20px', fontWeight: 700, margin: '0 0 10px 0' }}>
                Gagnez des heures chaque semaine
              </h2>
              <p style={{ color: '#6b7280', fontSize: '15px', margin: '0 0 28px 0', maxWidth: '460px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
                Les automatisations exécutent des actions sur <strong style={{ color: '#374151' }}>tous vos produits en 1 clic</strong>.
                Plus besoin de modifier vos produits un par un.
              </p>
              <button onClick={() => { setStep(1); setSelectedCat(null); setTab('create') }}
                style={{ ...BTN_PRI('#2563eb'), fontSize: '15px', padding: '12px 28px' }}>
                Créer ma première automatisation
              </button>
            </div>
            <p style={{ color: '#374151', fontSize: '14px', fontWeight: 600, margin: '0 0 14px 0' }}>Les plus populaires :</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(220px,100%),1fr))', gap: '10px' }}>
              {CAT.slice(0, 4).map(cat => (
                <button key={cat.id} onClick={() => pickCat(cat)}
                  style={{ ...CARD, padding: '16px', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s', background: cat.bg, border: '1px solid ' + cat.border }}
                  onMouseOver={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)' }}
                  onMouseOut={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>{cat.emoji}</div>
                  <p style={{ color: '#111827', fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0' }}>{cat.name}</p>
                  <p style={{ color: cat.color, fontSize: '12px', margin: 0, fontWeight: 600 }}>↗ {cat.impact}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Automations list */}
        {!loading && automations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {automations.map(a => {
              const cat = getCat(a.type)
              const res = results[a.id]
              const isExp = expandedId === a.id
              return (
                <div key={a.id} style={{ ...CARD, overflow: 'hidden', border: '1px solid ' + (a.is_active ? (cat?.border || '#e5e7eb') : '#e5e7eb') }}>
                  {a.is_active && <div style={{ height: '3px', background: cat?.color || '#2563eb' }} />}
                  <div style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
                      {/* Icon */}
                      <div style={{ width: '46px', height: '46px', minWidth: '46px', borderRadius: '12px', background: cat?.bg || '#f3f4f6', border: '1px solid ' + (cat?.border || '#e5e7eb'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                        {cat?.emoji || '⚙️'}
                      </div>
                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px', flexWrap: 'wrap' }}>
                          <p style={{ color: '#111827', fontSize: '15px', fontWeight: 700, margin: 0 }}>{a.name}</p>
                          <span style={{ fontSize: '11px', padding: '2px 9px', borderRadius: '20px', fontWeight: 600, background: a.is_active ? (cat?.bg || '#eff6ff') : '#f3f4f6', color: a.is_active ? (cat?.color || '#2563eb') : '#9ca3af', border: '1px solid ' + (a.is_active ? (cat?.border || '#bfdbfe') : '#e5e7eb') }}>
                            {a.is_active ? '● Actif' : '○ En pause'}
                          </span>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                          {cat?.pitch ? cat.pitch.slice(0, 90) + '...' : a.type}
                        </p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          {(a.run_count != null) && (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>
                              <span style={{ color: cat?.color || '#2563eb', fontWeight: 700 }}>{a.run_count}</span> exécution{(a.run_count || 0) > 1 ? 's' : ''}
                            </span>
                          )}
                          {a.last_run_at ? (
                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>Dernière: {new Date(a.last_run_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          ) : (
                            <span style={{ color: '#d1d5db', fontSize: '12px', fontStyle: 'italic' }}>Jamais exécutée</span>
                          )}
                        </div>
                      </div>
                      {/* Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 500 }}>{a.is_active ? 'Actif' : 'Pause'}</span>
                          <button onClick={() => toggle(a.id, a.is_active)} title={a.is_active ? 'Mettre en pause' : 'Activer'}
                            style={{ width: '42px', height: '24px', borderRadius: '12px', background: a.is_active ? (cat?.color || '#2563eb') : '#d1d5db', border: 'none', position: 'relative', cursor: 'pointer', padding: 0, transition: 'background 0.2s', flexShrink: 0 }}>
                            <div style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', transition: 'transform 0.2s', transform: a.is_active ? 'translateX(21px)' : 'translateX(3px)', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                          </button>
                        </div>
                        <button onClick={() => setExpandedId(isExp ? null : a.id)}
                          style={{ ...BTN_SEC, fontSize: '12px', padding: '7px 12px' }}>
                          {isExp ? '▲' : '▼'} Détails
                        </button>
                        <button onClick={() => run(a.id)} disabled={runningId === a.id || !a.is_active}
                          style={{ ...BTN_PRI(a.is_active ? (cat?.color || '#2563eb') : '#9ca3af'), padding: '9px 18px', opacity: (!a.is_active || runningId === a.id) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{runningId === a.id ? '⟳' : '▶'}</span>
                          {runningId === a.id ? 'En cours...' : 'Exécuter'}
                        </button>
                        <button onClick={() => del(a.id)}
                          style={{ width: '34px', height: '34px', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0, padding: 0 }}>
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Run result */}
                    {res && (
                      <div style={{ marginTop: '14px', padding: '12px 16px', background: res.success ? '#f0fdf4' : '#fef2f2', border: '1px solid ' + (res.success ? '#86efac' : '#fca5a5'), borderRadius: '9px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{res.success ? '✅' : '❌'}</span>
                        <div>
                          <p style={{ color: res.success ? '#14532d' : '#7f1d1d', fontSize: '14px', fontWeight: 600, margin: res.count != null ? '0 0 2px 0' : 0 }}>{res.message}</p>
                          {res.count != null && <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>{res.count} produit{(res.count || 0) > 1 ? 's' : ''} modifié{(res.count || 0) > 1 ? 's' : ''}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExp && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px', background: '#fafafa' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(180px,100%),1fr))', gap: '16px', marginBottom: '14px' }}>
                        <div>
                          <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, margin: '0 0 3px 0', textTransform: 'uppercase' }}>Type</p>
                          <p style={{ color: '#374151', fontSize: '13px', fontWeight: 500, margin: 0 }}>{cat?.name || a.type}</p>
                        </div>
                        <div>
                          <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, margin: '0 0 3px 0', textTransform: 'uppercase' }}>Créée le</p>
                          <p style={{ color: '#374151', fontSize: '13px', fontWeight: 500, margin: 0 }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {Object.entries(a.config || {}).filter(([, v]) => v !== '' && v !== null).map(([k, v]) => (
                          <div key={k}>
                            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 600, margin: '0 0 3px 0', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</p>
                            <p style={{ color: '#374151', fontSize: '13px', fontWeight: 500, margin: 0, wordBreak: 'break-all' }}>{String(v)}</p>
                          </div>
                        ))}
                      </div>
                      {cat && (
                        <div style={{ padding: '10px 14px', background: cat.bg, border: '1px solid ' + cat.border, borderRadius: '9px' }}>
                          <p style={{ color: '#374151', fontSize: '12px', margin: '0 0 6px 0', lineHeight: 1.6 }}>{cat.pitch}</p>
                          <p style={{ color: cat.color, fontSize: '12px', fontWeight: 600, margin: 0 }}>↗ {cat.impact}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
`

const outPath = path.join(__dirname, '..', 'app', '(dashboard)', 'dashboard', 'automation', 'page.tsx')
fs.writeFileSync(outPath, content.trimStart())
const written = fs.readFileSync(outPath, 'utf8')
const lines = written.split('\n').length
const bytes = fs.statSync(outPath).size
console.log('Written:', lines, 'lines,', bytes, 'bytes')
console.log('Has #111827:', written.includes('#111827'))
console.log('Has white bg:', written.includes('#ffffff'))
console.log('Has credentials:', written.includes("credentials: 'include'"))
console.log('Has before/after:', written.includes('before') && written.includes('after'))
