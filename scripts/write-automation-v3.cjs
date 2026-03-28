const fs = require('fs')
const path = require('path')

const content = `'use client'
import { useState, useEffect } from 'react'

type Auto = {
  id: string; name: string; type: string; config: Record<string,unknown>
  is_active: boolean; last_run_at?: string
  run_count?: number; created_at: string
}

const TYPES = [
  {
    id: 'seo', icon: '🔍', color: '#2563eb', bg: '#eff6ff',
    name: 'Optimisation SEO des titres',
    why: 'Vos titres copiés des fournisseurs nuisent à votre référencement. Cette automatisation les reformate pour Google.',
    result: '+34% de clics en moyenne',
    before: 'ref-2345 robe femme polyester xl',
    after: 'Robe Femme Noire — Coupe Slim, Taille XL',
    fields: [
      { k: 'max_per_run', label: 'Produits par exécution', type: 'number', def: 5, min: 1, max: 50 },
    ],
  },
  {
    id: 'price', icon: '💰', color: '#059669', bg: '#f0fdf4',
    name: 'Ajustement des prix',
    why: 'Adaptez vos marges en masse. Augmentez les prix pendant les périodes fortes, baissez-les pour liquider.',
    result: 'Modifie 200 prix en 30 secondes',
    before: 'Prix: 12,50€ — marge 15%',
    after: 'Prix: 14,38€ — marge 29%',
    fields: [
      { k: 'action', label: 'Action', type: 'select', def: 'increase', options: [{ v: 'increase', l: '↑ Augmenter' }, { v: 'decrease', l: '↓ Baisser' }] },
      { k: 'percent', label: 'Pourcentage (%)', type: 'number', def: 10, min: 1, max: 80 },
    ],
  },
  {
    id: 'title_template', icon: '✏️', color: '#7c3aed', bg: '#f5f3ff',
    name: 'Gabarit de titre uniforme',
    why: 'Donnez un style cohérent à toute votre boutique avec un modèle de titre standardisé.',
    result: 'Uniformise 100% des produits en 1 clic',
    before: 'Lunettes soleil + Montre homme offerte',
    after: 'Lunettes Soleil Homme | MaMarque',
    fields: [
      { k: 'template', label: 'Modèle (variables: {title} {vendor})', type: 'text', def: '{title} | {vendor}' },
      { k: 'max_per_run', label: 'Produits max', type: 'number', def: 20, min: 1, max: 100 },
    ],
  },
  {
    id: 'tag_add', icon: '🏷️', color: '#d97706', bg: '#fffbeb',
    name: 'Ajouter des tags en masse',
    why: 'Les tags permettent aux collections Shopify de trouver vos produits. Sans eux, ils sont invisibles.',
    result: 'Ajoute des tags à 100+ produits instantanément',
    before: 'Produit sans tag — absent de 3 collections',
    after: 'Tags ajoutés — visible dans toutes vos collections',
    fields: [
      { k: 'tags', label: 'Tags à ajouter (séparés par virgule)', type: 'text', def: '' },
    ],
  },
  {
    id: 'tag_remove', icon: '🗑️', color: '#dc2626', bg: '#fef2f2',
    name: 'Supprimer des tags obsolètes',
    why: 'Après une promo, certains tags sont incorrects. Nettoyez-les tous en une seule opération.',
    result: 'Nettoie 100+ produits en quelques secondes',
    before: 'Tag "soldes-2023" encore sur 87 produits',
    after: 'Tag supprimé — catalogue propre et à jour',
    fields: [
      { k: 'tags', label: 'Tags à supprimer (séparés par virgule)', type: 'text', def: '' },
    ],
  },
  {
    id: 'status_change', icon: '🔄', color: '#0284c7', bg: '#f0f9ff',
    name: 'Publier / Dépublier en masse',
    why: 'Gérez la visibilité de vos produits. Publiez une nouvelle collection ou archivez les anciens.',
    result: 'Change le statut de 50 produits en 1 clic',
    before: '34 produits en brouillon depuis 2 semaines',
    after: 'Tous publiés et visibles en boutique',
    fields: [
      { k: 'from_status', label: 'Action', type: 'select', def: 'draft', options: [{ v: 'draft', l: 'Brouillons → Publier' }, { v: 'active', l: 'Publiés → Archiver' }, { v: 'archived', l: 'Archivés → Republier' }] },
    ],
  },
  {
    id: 'description_add', icon: '📝', color: '#db2777', bg: '#fdf2f8',
    name: 'Compléter les descriptions vides',
    why: 'Les produits sans description convertissent 3x moins. Ajoutez un texte aux produits qui en manquent.',
    result: '+200% de taux de conversion en moyenne',
    before: 'Produit sans description — conversion 0.8%',
    after: 'Description ajoutée — conversion 2.4%',
    fields: [
      { k: 'prefix', label: 'Texte au début (optionnel)', type: 'text', def: '' },
      { k: 'suffix', label: 'Texte à la fin (optionnel)', type: 'text', def: '' },
      { k: 'max_per_run', label: 'Produits max par exécution', type: 'number', def: 10, min: 1, max: 50 },
    ],
  },
  {
    id: 'sync_shopify', icon: '🔗', color: '#1d4ed8', bg: '#eff6ff',
    name: 'Synchronisation Shopify',
    why: "Mettez à jour toutes vos données produits depuis Shopify pour avoir les infos à jour dans EcomPilot.",
    result: "Synchronise 250+ produits en moins d'une minute",
    before: '12 nouveaux produits Shopify non importés',
    after: 'Tous les produits synchronisés et prêts',
    fields: [],
  },
] as const

type TypeItem = typeof TYPES[number]
type TypeField = TypeItem['fields'][number]

export default function AutomationPage() {
  const [autos, setAutos] = useState<Auto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [screen, setScreen] = useState<'list' | 'pick' | 'config'>('list')
  const [picked, setPicked] = useState<TypeItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formConfig, setFormConfig] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResults, setRunResults] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Automatisations — EcomPilot Elite'
    loadAutos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAutos() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/automations', { credentials: 'include', cache: 'no-store' })
      const txt = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(txt) } catch { setError('Erreur serveur'); return }
      if (res.status === 401) { setError('Session expirée — rechargez la page'); return }
      if (!res.ok) { setError((data.error as string) || 'Erreur'); return }
      setAutos((data.automations as Auto[]) || [])
    } catch { setError('Erreur réseau') }
    finally { setLoading(false) }
  }

  function pickType(t: TypeItem) {
    setPicked(t)
    setFormName(t.name)
    const cfg: Record<string, unknown> = {}
    ;(t.fields as readonly TypeField[]).forEach(f => { cfg[f.k] = f.def })
    setFormConfig(cfg)
    setSaveErr('')
    setScreen('config')
  }

  async function saveAuto() {
    if (!formName.trim() || !picked) { setSaveErr('Nom requis'); return }
    setSaving(true); setSaveErr('')
    try {
      const res = await fetch('/api/automations', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), type: picked.id, config: formConfig }),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) { setSaveErr((data.error as string) || 'Erreur'); return }
      setAutos(p => [(data.automation as Auto), ...p])
      setScreen('list')
    } catch (e: unknown) { setSaveErr('Erreur: ' + (e as Error).message) }
    finally { setSaving(false) }
  }

  async function toggleAuto(id: string, cur: boolean) {
    setAutos(p => p.map(a => a.id === id ? { ...a, is_active: !cur } : a))
    const res = await fetch('/api/automations', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !cur }),
    })
    if (!res.ok) setAutos(p => p.map(a => a.id === id ? { ...a, is_active: cur } : a))
  }

  async function deleteAuto(id: string) {
    if (!confirm('Supprimer ?')) return
    setAutos(p => p.filter(a => a.id !== id))
    await fetch('/api/automations', {
      method: 'DELETE', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  async function runAuto(id: string) {
    setRunningId(id)
    setRunResults(p => ({ ...p, [id]: { ok: true, msg: 'Exécution...' } }))
    try {
      const res = await fetch('/api/automations/run', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json() as Record<string, unknown>
      setRunResults(p => ({ ...p, [id]: { ok: res.ok && data.success !== false, msg: (data.message as string) || (data.error as string) || 'Terminé' } }))
      if (res.ok) loadAutos()
    } catch { setRunResults(p => ({ ...p, [id]: { ok: false, msg: 'Erreur réseau' } })) }
    setRunningId(null)
  }

  const getType = (id: string) => TYPES.find(t => t.id === id)

  // ── Shared styles ────────────────────────────────────────────────────────────
  const wrap: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 'clamp(14px,4vw,28px)', background: '#f8fafc', minHeight: '100vh' }
  const inner: React.CSSProperties = { maxWidth: '920px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }
  const card: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }
  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', color: '#111827', fontSize: '14px', padding: '9px 12px', outline: 'none', fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { display: 'block', marginBottom: '5px', color: '#374151', fontSize: '13px', fontWeight: 600 }
  const btnPri = (c = '#2563eb'): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: c, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxSizing: 'border-box' })
  const btnSec: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', boxSizing: 'border-box' }

  // ── PICK SCREEN ──────────────────────────────────────────────────────────────
  if (screen === 'pick') return (
    <div style={wrap}>
      <div style={inner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setScreen('list')} style={btnSec}>← Retour</button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ color: '#111827', fontSize: 'clamp(16px,3.5vw,20px)', fontWeight: 700, margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>
              Choisir un type d&apos;automatisation
            </h1>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '2px 0 0' }}>8 types disponibles — cliquez pour configurer</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(270px,100%),1fr))', gap: '12px' }}>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => pickType(t)}
              style={{ ...card, padding: 0, cursor: 'pointer', textAlign: 'left', display: 'block' }}>
              <div style={{ height: '4px', background: t.color }} />
              <div style={{ padding: '16px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '10px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {t.icon}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ color: '#111827', fontSize: '14px', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3, wordBreak: 'break-word' }}>{t.name}</p>
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{t.why}</p>
                  </div>
                </div>
                <div style={{ background: t.bg, border: '1px solid ' + t.color + '33', borderRadius: '8px', padding: '10px 12px', boxSizing: 'border-box', width: '100%' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', minWidth: '36px', flexShrink: 0, paddingTop: '1px' }}>Avant</span>
                    <span style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.4, wordBreak: 'break-word', minWidth: 0 }}>{t.before}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: t.color, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', minWidth: '36px', flexShrink: 0, paddingTop: '1px' }}>Après</span>
                    <span style={{ color: '#111827', fontSize: '12px', fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word', minWidth: 0 }}>{t.after}</span>
                  </div>
                </div>
                <p style={{ color: t.color, fontSize: '12px', fontWeight: 600, margin: '10px 0 0', wordBreak: 'break-word' }}>↗ {t.result}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // ── CONFIG SCREEN ────────────────────────────────────────────────────────────
  if (screen === 'config' && picked) return (
    <div style={wrap}>
      <div style={inner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setScreen('pick')} style={btnSec}>← Changer</button>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ color: '#111827', fontSize: 'clamp(16px,3.5vw,20px)', fontWeight: 700, margin: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>
              Configurer : {picked.name}
            </h1>
            <p style={{ color: '#6b7280', fontSize: '13px', margin: '2px 0 0' }}>Étape 2/2</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: '16px', alignItems: 'start' }}>
          {/* Form */}
          <div style={{ ...card, padding: '20px', boxSizing: 'border-box' }}>
            <p style={{ color: '#111827', fontSize: '15px', fontWeight: 700, margin: '0 0 18px' }}>Réglages</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <div style={{ width: '100%' }}>
                <label style={lbl}>Nom de l&apos;automatisation *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ex: SEO quotidien" style={inp} autoFocus />
              </div>
              {(picked.fields as readonly TypeField[]).map(f => (
                <div key={f.k} style={{ width: '100%' }}>
                  <label style={lbl}>{f.label}</label>
                  {'options' in f ? (
                    <select value={String(formConfig[f.k] ?? f.def)}
                      onChange={e => setFormConfig(c => ({ ...c, [f.k]: e.target.value }))}
                      style={{ ...inp, cursor: 'pointer' }}>
                      {(f.options as readonly { v: string; l: string }[]).map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                  ) : f.type === 'number' ? (
                    <input type="number" min={'min' in f ? f.min : undefined} max={'max' in f ? f.max : undefined}
                      value={String(formConfig[f.k] ?? f.def)}
                      onChange={e => setFormConfig(c => ({ ...c, [f.k]: parseInt(e.target.value) || f.def }))}
                      style={{ ...inp, maxWidth: '160px' }} />
                  ) : (
                    <input type="text" placeholder={String(f.def) || ''}
                      value={String(formConfig[f.k] ?? f.def)}
                      onChange={e => setFormConfig(c => ({ ...c, [f.k]: e.target.value }))}
                      style={inp} />
                  )}
                </div>
              ))}
            </div>
            {saveErr && <p style={{ color: '#dc2626', fontSize: '13px', margin: '14px 0 0', fontWeight: 500 }}>{saveErr}</p>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => setScreen('pick')} style={btnSec}>← Retour</button>
              <button onClick={saveAuto} disabled={saving || !formName.trim()}
                style={{ ...btnPri(picked.color), opacity: saving || !formName.trim() ? 0.6 : 1 }}>
                {saving ? 'Création...' : "Créer l'automatisation"}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ ...card, padding: '18px', background: picked.bg, border: '1px solid ' + picked.color + '44', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>{picked.icon}</div>
              <p style={{ color: '#111827', fontSize: '14px', fontWeight: 700, margin: '0 0 8px', wordBreak: 'break-word' }}>{picked.name}</p>
              <p style={{ color: '#374151', fontSize: '13px', margin: '0 0 12px', lineHeight: 1.6, wordBreak: 'break-word' }}>{picked.why}</p>
              <div style={{ padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid ' + picked.color + '33', boxSizing: 'border-box', width: '100%' }}>
                <p style={{ color: picked.color, fontSize: '13px', fontWeight: 700, margin: '0 0 2px', wordBreak: 'break-word' }}>↗ {picked.result}</p>
                <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>Résultat moyen observé</p>
              </div>
            </div>
            <div style={{ ...card, padding: '16px', boxSizing: 'border-box' }}>
              <p style={{ color: '#374151', fontSize: '12px', fontWeight: 700, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exemple</p>
              <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', marginBottom: '8px', boxSizing: 'border-box', width: '100%' }}>
                <p style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase' }}>Avant</p>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, wordBreak: 'break-word' }}>{picked.before}</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', color: picked.color, fontSize: '16px', marginBottom: '8px' }}>↓</div>
              <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px', boxSizing: 'border-box', width: '100%' }}>
                <p style={{ color: '#059669', fontSize: '10px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase' }}>Après</p>
                <p style={{ color: '#111827', fontSize: '12px', fontWeight: 600, margin: 0, wordBreak: 'break-word' }}>{picked.after}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── LIST SCREEN ──────────────────────────────────────────────────────────────
  return (
    <div style={wrap}>
      <div style={inner}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ color: '#111827', fontSize: 'clamp(18px,4vw,24px)', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em', lineHeight: 1.2, wordBreak: 'break-word' }}>
              Automatisations
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Exécutez des actions en masse sur vos produits en 1 clic
            </p>
          </div>
          <button onClick={() => setScreen('pick')} style={{ ...btnPri('#2563eb'), fontSize: '14px', padding: '10px 20px', flexShrink: 0 }}>
            + Nouvelle automatisation
          </button>
        </div>

        {/* Stats */}
        {autos.length > 0 && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(140px,100%),1fr))', gap: '10px', marginBottom: '20px' }}>
            {([
              { v: autos.length, l: 'Créées', c: '#2563eb' },
              { v: autos.filter(a => a.is_active).length, l: 'Actives', c: '#059669' },
              { v: autos.reduce((s, a) => s + (a.run_count || 0), 0), l: 'Exécutions', c: '#7c3aed' },
              { v: TYPES.length, l: 'Types disponibles', c: '#d97706' },
            ] as const).map(s => (
              <div key={s.l} style={{ ...card, padding: '14px 16px', textAlign: 'center', boxSizing: 'border-box' }}>
                <p style={{ color: s.c, fontSize: '26px', fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{s.v}</p>
                <p style={{ color: '#6b7280', fontSize: '12px', margin: 0, fontWeight: 500, wordBreak: 'break-word' }}>{s.l}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', boxSizing: 'border-box', width: '100%' }}>
            <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, flex: 1, fontWeight: 500, minWidth: 0, wordBreak: 'break-word' }}>{error}</p>
            <button onClick={loadAutos} style={{ ...btnSec, flexShrink: 0 }}>Réessayer</button>
          </div>
        )}

        {/* Loading */}
        {loading && <div style={{ textAlign: 'center', padding: '80px', color: '#9ca3af', fontSize: '14px' }}>Chargement...</div>}

        {/* Empty */}
        {!loading && !error && autos.length === 0 && (
          <div style={{ ...card, padding: '48px 24px', textAlign: 'center', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
            <p style={{ color: '#111827', fontSize: '18px', fontWeight: 700, margin: '0 0 10px', wordBreak: 'break-word' }}>
              Gagnez des heures chaque semaine
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 28px', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7, wordBreak: 'break-word' }}>
              Modifiez les titres, prix, tags et descriptions de <strong style={{ color: '#374151' }}>tous vos produits</strong> en 1 clic.
            </p>
            <button onClick={() => setScreen('pick')} style={{ ...btnPri('#2563eb'), fontSize: '15px', padding: '12px 28px' }}>
              Créer ma première automatisation
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(200px,100%),1fr))', gap: '10px', marginTop: '28px', width: '100%', boxSizing: 'border-box' }}>
              {TYPES.slice(0, 4).map(t => (
                <button key={t.id} onClick={() => pickType(t)}
                  style={{ ...card, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', background: t.bg, border: '1px solid ' + t.color + '33', boxSizing: 'border-box', display: 'block' }}>
                  <p style={{ color: '#111827', fontSize: '13px', fontWeight: 700, margin: '0 0 4px', wordBreak: 'break-word' }}>{t.icon} {t.name}</p>
                  <p style={{ color: t.color, fontSize: '12px', margin: 0, fontWeight: 500, wordBreak: 'break-word' }}>{t.result}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {!loading && autos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {autos.map(a => {
              const t = getType(a.type)
              const r = runResults[a.id]
              const isOpen = openId === a.id
              return (
                <div key={a.id} style={{ ...card, boxSizing: 'border-box', width: '100%' }}>
                  {a.is_active && <div style={{ height: '3px', background: t?.color || '#2563eb' }} />}
                  <div style={{ padding: '16px 18px', boxSizing: 'border-box', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%' }}>
                      {/* Icon */}
                      <div style={{ width: '42px', height: '42px', minWidth: '42px', borderRadius: '10px', background: t?.bg || '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {t?.icon || '⚙️'}
                      </div>
                      {/* Text */}
                      <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <p style={{ color: '#111827', fontSize: '14px', fontWeight: 700, margin: 0, wordBreak: 'break-word', minWidth: 0 }}>{a.name}</p>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: a.is_active ? (t?.bg || '#eff6ff') : '#f3f4f6', color: a.is_active ? (t?.color || '#2563eb') : '#9ca3af', border: '1px solid ' + (a.is_active ? (t?.color || '#2563eb') + '44' : '#e5e7eb'), fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {a.is_active ? '● Actif' : '○ Pause'}
                          </span>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 6px', wordBreak: 'break-word' }}>{t?.name || a.type}</p>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {(a.run_count || 0) > 0 && (
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>
                              <span style={{ color: t?.color || '#2563eb', fontWeight: 700 }}>{a.run_count}</span> exécution{(a.run_count || 0) > 1 ? 's' : ''}
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
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
                        <button onClick={() => toggleAuto(a.id, a.is_active)} title={a.is_active ? 'Mettre en pause' : 'Activer'}
                          style={{ width: '40px', height: '22px', borderRadius: '11px', background: a.is_active ? (t?.color || '#2563eb') : '#d1d5db', border: 'none', position: 'relative', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                          <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', transition: 'transform 0.2s', transform: a.is_active ? 'translateX(21px)' : 'translateX(3px)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </button>
                        <button onClick={() => setOpenId(isOpen ? null : a.id)} style={{ ...btnSec, padding: '7px 12px', fontSize: '12px' }}>
                          {isOpen ? '▲' : '▼'}
                        </button>
                        <button onClick={() => runAuto(a.id)} disabled={runningId === a.id || !a.is_active}
                          style={{ ...btnPri(a.is_active ? (t?.color || '#2563eb') : '#9ca3af'), padding: '8px 16px', opacity: (!a.is_active || runningId === a.id) ? 0.6 : 1, fontSize: '13px' }}>
                          {runningId === a.id ? '⟳ En cours' : '▶ Exécuter'}
                        </button>
                        <button onClick={() => deleteAuto(a.id)}
                          style={{ width: '32px', height: '32px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0, padding: 0 }}>
                          ×
                        </button>
                      </div>
                    </div>

                    {/* Run result */}
                    {r && (
                      <div style={{ marginTop: '12px', padding: '10px 14px', background: r.ok ? '#f0fdf4' : '#fef2f2', border: '1px solid ' + (r.ok ? '#86efac' : '#fca5a5'), borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start', boxSizing: 'border-box', width: '100%' }}>
                        <span style={{ fontSize: '16px', flexShrink: 0, paddingTop: '1px' }}>{r.ok ? '✅' : '❌'}</span>
                        <p style={{ color: r.ok ? '#14532d' : '#7f1d1d', fontSize: '13px', fontWeight: 600, margin: 0, wordBreak: 'break-word', minWidth: 0 }}>{r.msg}</p>
                      </div>
                    )}
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 18px', background: '#fafafa', boxSizing: 'border-box', width: '100%' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(150px,100%),1fr))', gap: '12px', marginBottom: '12px' }}>
                        <div>
                          <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase' }}>Type</p>
                          <p style={{ color: '#374151', fontSize: '13px', fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>{t?.name || a.type}</p>
                        </div>
                        <div>
                          <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase' }}>Créée le</p>
                          <p style={{ color: '#374151', fontSize: '13px', fontWeight: 500, margin: 0 }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                        </div>
                        {Object.entries(a.config || {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => (
                          <div key={k}>
                            <p style={{ color: '#9ca3af', fontSize: '11px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</p>
                            <p style={{ color: '#374151', fontSize: '13px', fontWeight: 500, margin: 0, wordBreak: 'break-all' }}>{String(v)}</p>
                          </div>
                        ))}
                      </div>
                      {t && (
                        <div style={{ padding: '10px 14px', background: t.bg, border: '1px solid ' + t.color + '33', borderRadius: '8px', boxSizing: 'border-box', width: '100%' }}>
                          <p style={{ color: '#374151', fontSize: '12px', margin: '0 0 4px', wordBreak: 'break-word', lineHeight: 1.6 }}>{t.why}</p>
                          <p style={{ color: t.color, fontSize: '12px', fontWeight: 600, margin: 0, wordBreak: 'break-word' }}>↗ {t.result}</p>
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
console.log('Has wordBreak:', written.includes('wordBreak'))
console.log('Has boxSizing:', written.includes('boxSizing'))
console.log('Has minWidth:0:', written.includes("minWidth: 0"))
console.log('Has white bg:', written.includes('#ffffff'))
console.log('Has credentials:', written.includes("credentials: 'include'"))
