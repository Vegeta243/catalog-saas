'use client'
import { useState, useEffect } from 'react'
import GuideBanner from '@/components/GuideBanner'

// ─── Filter definitions ────────────────────────────────────────
const FILTERS = [
  { id: 'all', label: 'Tous les produits', icon: '📦' },
  { id: 'no_image', label: 'Sans image', icon: '🖼️' },
  { id: 'no_description', label: 'Sans description', icon: '📝' },
  { id: 'no_tag', label: 'Sans aucun tag', icon: '🏷️' },
  { id: 'price_under', label: 'Prix inférieur à X€', icon: '💰', param: { key: 'price_under_val', label: 'Montant (€)', type: 'number', def: 20 } },
  { id: 'price_over', label: 'Prix supérieur à X€', icon: '💶', param: { key: 'price_over_val', label: 'Montant (€)', type: 'number', def: 50 } },
  { id: 'title_contains', label: 'Titre contient le mot...', icon: '🔤', param: { key: 'title_word', label: 'Mot-clé', type: 'text', def: '' } },
  { id: 'title_short', label: 'Titre trop court (< 20 car.)', icon: '✂️' },
  { id: 'title_long', label: 'Titre trop long (> 100 car.)', icon: '📏' },
  { id: 'vendor_is', label: 'Fournisseur spécifique', icon: '🏭', param: { key: 'vendor_name', label: 'Nom du fournisseur', type: 'text', def: '' } },
  { id: 'status_draft', label: 'En brouillon', icon: '📋' },
  { id: 'status_active', label: 'Publiés', icon: '✅' },
  { id: 'status_archived', label: 'Archivés', icon: '📂' },
  { id: 'desc_short', label: 'Description courte (< 100 car.)', icon: '📄', param: { key: 'desc_min_chars', label: 'Longueur min', type: 'number', def: 100 } },
  { id: 'added_recently', label: 'Ajoutés récemment (< X jours)', icon: '🆕', param: { key: 'days_recent', label: 'Nombre de jours', type: 'number', def: 7 } },
] as const

type FilterId = typeof FILTERS[number]['id']

// ─── Automation types ─────────────────────────────────────────
const TYPES = [
  {
    id: 'seo_title',
    icon: '🔍',
    color: '#2563eb',
    bg: '#eff6ff',
    name: 'Optimiser les titres SEO',
    pitch: "Les titres copiés des fournisseurs contiennent des codes et des mots inutiles qui nuisent à votre référencement. Cette automatisation les nettoie et les reformate.",
    result: '+34% de clics organiques en moyenne',
    before: 'ref-GH2345_ROBE femme polyester (XL) lot2',
    after: 'Robe Femme Polyester — Taille XL | Livraison Rapide',
    actions: [
      { id: 'capitalize', label: 'Mettre les mots en majuscule', type: 'toggle', def: true },
      { id: 'remove_sku', label: 'Supprimer les codes SKU/ref', type: 'toggle', def: true },
      { id: 'remove_parentheses', label: 'Supprimer les parenthèses', type: 'toggle', def: false },
      { id: 'add_suffix', label: 'Ajouter un suffixe au titre', type: 'text', def: '', placeholder: 'Ex: | Livraison Rapide' },
      { id: 'max_length', label: 'Longueur max du titre (0 = illimité)', type: 'number', def: 70, min: 0, max: 255 },
      { id: 'max_per_run', label: 'Produits max par exécution', type: 'number', def: 10, min: 1, max: 100 },
    ],
    filters: ['all', 'title_short', 'title_long', 'title_contains', 'vendor_is', 'status_active', 'status_draft'] as FilterId[],
  },
  {
    id: 'price_rules',
    icon: '💰',
    color: '#059669',
    bg: '#f0fdf4',
    name: 'Règles de prix intelligentes',
    pitch: "Ajustez vos prix selon des règles précises. Augmentez vos marges, préparez des soldes, appliquez des coefficients multiplicateurs ou arrondissez au .99 pour maximiser les conversions.",
    result: 'Modifie 200 prix en 30 secondes',
    before: 'Prix: 12,37€ — marge 8% — non rentable',
    after: 'Prix: 14,99€ — marge 27% — rentable',
    actions: [
      { id: 'action_type', label: "Type d'ajustement", type: 'select', def: 'percent_increase', options: [
        { v: 'percent_increase', l: '↑ Augmenter de X%' },
        { v: 'percent_decrease', l: '↓ Baisser de X%' },
        { v: 'multiply', l: '× Multiplier par X (coefficient)' },
        { v: 'set_fixed', l: '= Fixer à X€ exact' },
        { v: 'round_99', l: '⌀ Arrondir au .99 (14.37 → 13.99)' },
        { v: 'round_95', l: '⌀ Arrondir au .95 (14.37 → 13.95)' },
      ]},
      { id: 'value', label: 'Valeur (%, coefficient ou montant)', type: 'number', def: 15, min: 0, max: 1000, step: 0.1 },
      { id: 'price_floor', label: 'Prix minimum (ne jamais descendre sous)', type: 'number', def: 0, min: 0 },
      { id: 'price_ceiling', label: 'Prix maximum (ne jamais dépasser)', type: 'number', def: 0, min: 0 },
      { id: 'max_products', label: 'Produits max par exécution', type: 'number', def: 50, min: 1, max: 200 },
    ],
    filters: ['all', 'price_under', 'price_over', 'vendor_is', 'status_active', 'no_image', 'title_contains'] as FilterId[],
  },
  {
    id: 'bulk_tags',
    icon: '🏷️',
    color: '#d97706',
    bg: '#fffbeb',
    name: 'Gestion avancée des tags',
    pitch: "Les collections Shopify fonctionnent grâce aux tags. Sans bons tags, vos produits sont invisibles dans vos collections. Ajoutez, supprimez, remplacez ou normalisez en masse.",
    result: 'Ajoute/modifie des tags sur 500 produits en 1 clic',
    before: 'Produit sans tag — absent de 5 collections auto',
    after: 'Tags corrects — présent dans toutes les collections',
    actions: [
      { id: 'tag_action', label: "Action sur les tags", type: 'select', def: 'add', options: [
        { v: 'add', l: '+ Ajouter des tags' },
        { v: 'remove', l: '− Supprimer des tags' },
        { v: 'replace', l: '↔ Remplacer un tag par un autre' },
        { v: 'normalize', l: '✓ Normaliser (tout en minuscules)' },
        { v: 'clear_all', l: '🗑 Vider tous les tags' },
      ]},
      { id: 'tags_to_add', label: 'Tags à ajouter (virgule)', type: 'text', def: '', placeholder: 'promo, été-2024, bestseller' },
      { id: 'tags_to_remove', label: 'Tags à supprimer (virgule)', type: 'text', def: '', placeholder: 'ancien-tag, rupture' },
      { id: 'tag_replace_from', label: 'Remplacer ce tag...', type: 'text', def: '', placeholder: 'soldes-2023' },
      { id: 'tag_replace_to', label: '...par ce tag', type: 'text', def: '', placeholder: 'soldes-2024' },
    ],
    filters: ['all', 'no_tag', 'vendor_is', 'title_contains', 'status_active', 'status_draft', 'added_recently'] as FilterId[],
  },
  {
    id: 'description_rules',
    icon: '📝',
    color: '#7c3aed',
    bg: '#f5f3ff',
    name: 'Améliorer les descriptions',
    pitch: "Un produit sans description perd 70% de ses conversions. Ajoutez automatiquement une intro, vos garanties, délais de livraison et un appel à l'action à tous les produits qui en manquent.",
    result: '+200% de conversion sur produits sans description',
    before: 'Produit sans description — conversion: 0.8%',
    after: 'Description complète — conversion: 2.4%',
    actions: [
      { id: 'desc_action', label: "Action", type: 'select', def: 'add_prefix_suffix', options: [
        { v: 'add_prefix_suffix', l: '+ Ajouter intro et/ou conclusion' },
        { v: 'add_guarantee', l: '✓ Ajouter bloc garanties' },
        { v: 'add_shipping', l: '🚚 Ajouter infos livraison' },
        { v: 'clean_html', l: '🧹 Nettoyer le HTML sale' },
        { v: 'add_cta', l: "→ Ajouter appel à l'action" },
      ]},
      { id: 'prefix', label: "Texte d'introduction (avant la description)", type: 'textarea', def: '', placeholder: 'Produit sélectionné avec soin par notre équipe.' },
      { id: 'suffix', label: 'Texte de conclusion (après la description)', type: 'textarea', def: '', placeholder: 'Livraison sous 7 à 15 jours. Satisfait ou remboursé 30 jours.' },
      { id: 'guarantee_text', label: 'Texte de garantie', type: 'text', def: '✓ Satisfait ou remboursé 30 jours  ✓ Paiement sécurisé  ✓ Livraison suivie', placeholder: '' },
      { id: 'max_per_run', label: 'Produits max par exécution', type: 'number', def: 20, min: 1, max: 100 },
    ],
    filters: ['all', 'no_description', 'desc_short', 'no_image', 'status_draft', 'added_recently'] as FilterId[],
  },
  {
    id: 'publish_rules',
    icon: '🔄',
    color: '#0284c7',
    bg: '#f0f9ff',
    name: 'Règles de publication automatique',
    pitch: "Publiez ou dépubliez des produits selon des critères précis. Publiez seulement les produits prêts (avec image + description), archivez les ruptures de stock.",
    result: 'Gère la visibilité de 100 produits en 1 clic',
    before: '47 brouillons dont 30 sont complets et prêts',
    after: '30 produits publiés automatiquement',
    actions: [
      { id: 'pub_action', label: "Action de publication", type: 'select', def: 'publish_ready', options: [
        { v: 'publish_ready', l: '✅ Publier si image + description présentes' },
        { v: 'publish_all_filter', l: '✅ Publier tous ceux du filtre' },
        { v: 'unpublish_filter', l: '⏸ Dépublier (passer en brouillon)' },
        { v: 'archive_filter', l: '📂 Archiver' },
        { v: 'unarchive_filter', l: '📤 Désarchiver (republier)' },
      ]},
      { id: 'require_image', label: 'Exiger une image pour publier', type: 'toggle', def: true },
      { id: 'require_description', label: 'Exiger une description pour publier', type: 'toggle', def: true },
      { id: 'require_price', label: 'Exiger un prix > 0', type: 'toggle', def: true },
    ],
    filters: ['all', 'status_draft', 'status_active', 'status_archived', 'no_image', 'no_description', 'vendor_is', 'added_recently'] as FilterId[],
  },
  {
    id: 'vendor_normalize',
    icon: '🏭',
    color: '#0891b2',
    bg: '#ecfeff',
    name: 'Normaliser les fournisseurs',
    pitch: "Les imports AliExpress créent des noms de fournisseurs en chinois, en majuscules ou avec des codes. Normalisez tout pour une boutique professionnelle.",
    result: 'Uniformise 100% de vos noms fournisseurs',
    before: 'Vendeur: "GUANGZHOU FACTORY STORE LTD"',
    after: 'Vendeur: "Ma Marque" ou champ vide',
    actions: [
      { id: 'vendor_action', label: "Action", type: 'select', def: 'capitalize', options: [
        { v: 'capitalize', l: 'Aa Mettre en format titre (Capitalize)' },
        { v: 'set_value', l: '✏️ Définir un vendeur pour tous' },
        { v: 'replace_value', l: '↔ Remplacer un vendeur par un autre' },
        { v: 'clear', l: '✕ Vider le champ vendeur' },
      ]},
      { id: 'new_vendor', label: 'Nouveau nom de vendeur', type: 'text', def: '', placeholder: 'Ex: Ma Boutique' },
      { id: 'replace_from', label: 'Remplacer ce vendeur...', type: 'text', def: '', placeholder: 'Ex: GUANGZHOU STORE' },
      { id: 'replace_to', label: '...par ce vendeur', type: 'text', def: '', placeholder: 'Ex: Import Direct' },
    ],
    filters: ['all', 'vendor_is', 'status_active', 'status_draft', 'title_contains'] as FilterId[],
  },
  {
    id: 'image_audit',
    icon: '🖼️',
    color: '#e11d48',
    bg: '#fff1f2',
    name: 'Audit et gestion des images',
    pitch: "Les produits sans image ne se vendent jamais. Détectez-les, marquez-les et gérez leur visibilité automatiquement pour maintenir une boutique professionnelle.",
    result: 'Identifie et gère tous les produits sans image',
    before: '23 produits sans image publiés et visibles',
    after: '23 produits passés en brouillon + tag "sans-image"',
    actions: [
      { id: 'img_action', label: "Action", type: 'select', def: 'tag_no_image', options: [
        { v: 'tag_no_image', l: '🏷 Ajouter tag "sans-image" aux concernés' },
        { v: 'draft_no_image', l: "⏸ Passer en brouillon si pas d'image" },
        { v: 'tag_low_images', l: "📷 Tagger les produits avec peu d'images" },
      ]},
      { id: 'min_images', label: "Nombre minimum d'images souhaité", type: 'number', def: 1, min: 1, max: 10 },
      { id: 'low_image_tag', label: 'Tag à ajouter', type: 'text', def: 'sans-image', placeholder: 'sans-image' },
    ],
    filters: ['all', 'no_image', 'status_active', 'vendor_is', 'added_recently'] as FilterId[],
  },
  {
    id: 'profit_alert',
    icon: '📊',
    color: '#7c3aed',
    bg: '#f5f3ff',
    name: 'Alertes et analyse de rentabilité',
    pitch: "Identifiez automatiquement les produits peu rentables, marquez-les pour les retravailler et gardez un catalogue sain avec de bonnes marges.",
    result: 'Analyse 500 produits et classe leur rentabilité',
    before: 'Produits non rentables mélangés aux bons sans distinction',
    after: 'Produits classés par tag: "marge-faible", "rentable"',
    actions: [
      { id: 'profit_action', label: "Action", type: 'select', def: 'tag_low_margin', options: [
        { v: 'tag_low_margin', l: '⚠️ Tagger les produits à faible marge' },
        { v: 'tag_high_margin', l: '✅ Tagger les produits rentables' },
        { v: 'draft_low_margin', l: '⏸ Dépublier les produits non rentables' },
      ]},
      { id: 'low_margin_threshold', label: 'Seuil marge faible (%)', type: 'number', def: 20, min: 0, max: 100 },
      { id: 'high_margin_threshold', label: 'Seuil marge bonne (%)', type: 'number', def: 40, min: 0, max: 100 },
      { id: 'low_tag', label: 'Tag marge faible', type: 'text', def: 'marge-faible', placeholder: 'marge-faible' },
      { id: 'high_tag', label: 'Tag marge bonne', type: 'text', def: 'rentable', placeholder: 'rentable' },
    ],
    filters: ['all', 'price_under', 'price_over', 'vendor_is', 'status_active'] as FilterId[],
  },
  {
    id: 'collection_sync',
    icon: '📁',
    color: '#0284c7',
    bg: '#f0f9ff',
    name: 'Synchroniser les collections',
    pitch: "Assurez-vous que vos produits rejoignent les bonnes collections en ajoutant ou retirant les tags qui les y incluent automatiquement.",
    result: 'Assigne correctement 100+ produits à leurs collections',
    before: '50 nouveaux produits non présents dans les collections',
    after: 'Tous les produits dans les bonnes collections',
    actions: [
      { id: 'col_action', label: "Action", type: 'select', def: 'add_collection_tag', options: [
        { v: 'add_collection_tag', l: '+ Ajouter tag pour rejoindre une collection' },
        { v: 'remove_collection_tag', l: "− Retirer d'une collection via tag" },
        { v: 'sync_type_to_tag', l: '🔄 Synchroniser "Type produit" → tag' },
      ]},
      { id: 'collection_tag', label: 'Tag de collection à ajouter/retirer', type: 'text', def: '', placeholder: 'Ex: collection-femme' },
      { id: 'product_type_prefix', label: 'Préfixe pour les tags de type', type: 'text', def: 'type-', placeholder: 'type-' },
    ],
    filters: ['all', 'no_tag', 'vendor_is', 'title_contains', 'status_active', 'status_draft'] as FilterId[],
  },
  {
    id: 'duplicate_detect',
    icon: '🔎',
    color: '#64748b',
    bg: '#f8fafc',
    name: 'Détecter les doublons',
    pitch: "Les imports répétés créent des doublons qui nuisent au SEO et confondent les clients. Détectez et gérez-les automatiquement.",
    result: 'Identifie tous les doublons potentiels en 1 scan',
    before: 'Import x3 — 3 versions du même produit actives',
    after: '2 doublons archivés — 1 produit propre conservé',
    actions: [
      { id: 'dup_action', label: "Action", type: 'select', def: 'tag_duplicates', options: [
        { v: 'tag_duplicates', l: '🏷 Tagger les doublons "doublon-potentiel"' },
        { v: 'archive_oldest', l: '📂 Archiver les doublons les plus anciens' },
        { v: 'archive_newest', l: '📂 Archiver les doublons les plus récents' },
      ]},
      { id: 'similarity', label: 'Méthode de détection', type: 'select', def: 'exact_title', options: [
        { v: 'exact_title', l: 'Titre exactement identique' },
        { v: 'similar_title', l: 'Titre similaire (ignore casse et espaces)' },
      ]},
      { id: 'dup_tag', label: 'Tag à appliquer', type: 'text', def: 'doublon-potentiel', placeholder: 'doublon-potentiel' },
    ],
    filters: ['all', 'status_active', 'status_draft', 'vendor_is', 'added_recently'] as FilterId[],
  },
] as const

type TypeItem = typeof TYPES[number]
type ActionItem = TypeItem['actions'][number]

type Auto = {
  id: string; name: string; type: string; config: Record<string, unknown>
  is_active: boolean; last_run_at?: string
  run_count?: number; created_at: string
}
type RunRes = { ok: boolean; msg: string; count?: number }

export default function AutomationPage() {
  const [autos, setAutos] = useState<Auto[]>([])
  const [guideVisible, setGuideVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [screen, setScreen] = useState<'list' | 'pick' | 'config'>('list')
  const [picked, setPicked] = useState<TypeItem | null>(null)
  const [fname, setFname] = useState('')
  const [fconfig, setFconfig] = useState<Record<string, unknown>>({})
  const [ffilter, setFfilter] = useState<FilterId>('all')
  const [ffilterParams, setFfilterParams] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [saveErr, setSaveErr] = useState('')
  const [runId, setRunId] = useState<string | null>(null)
  const [runRes, setRunRes] = useState<Record<string, RunRes>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Automatisations — EcomPilot Elite'
    load()
  }, [])

  async function load() {
    setLoading(true); setErr('')
    try {
      const res = await fetch('/api/automations', { credentials: 'include', cache: 'no-store' })
      const txt = await res.text()
      let data: Record<string, unknown> = {}
      try { data = JSON.parse(txt) } catch { setErr('Erreur serveur'); return }
      if (res.status === 401) { setErr('Session expirée'); return }
      if (!res.ok) { setErr((data.error as string) || 'Erreur'); return }
      setAutos((data.automations as Auto[]) || [])
    } catch { setErr('Erreur réseau') }
    finally { setLoading(false) }
  }

  function pick(t: TypeItem) {
    setGuideVisible(false)
    setPicked(t)
    setFname(t.name)
    const cfg: Record<string, unknown> = {}
    ;(t.actions as readonly ActionItem[]).forEach((a: ActionItem) => { cfg[a.id] = 'def' in a ? a.def : '' })
    setFconfig(cfg)
    setFfilter('all')
    setFfilterParams({})
    setSaveErr('')
    setScreen('config')
  }

  async function save() {
    setGuideVisible(false)
    if (!fname.trim() || !picked) { setSaveErr('Nom requis'); return }
    setSaving(true); setSaveErr('')
    try {
      const res = await fetch('/api/automations', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fname.trim(), type: picked.id,
          config: { ...fconfig, filter: ffilter, filter_params: ffilterParams }
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveErr((data.error as string) || 'Erreur'); return }
      setAutos(p => [data.automation as Auto, ...p])
      setScreen('list')
    } catch (e: unknown) { setSaveErr(e instanceof Error ? e.message : 'Erreur') }
    finally { setSaving(false) }
  }

  async function toggle(id: string, cur: boolean) {
    setGuideVisible(false)
    setAutos(p => p.map(a => a.id === id ? { ...a, is_active: !cur } : a))
    const res = await fetch('/api/automations', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !cur }),
    })
    if (!res.ok) setAutos(p => p.map(a => a.id === id ? { ...a, is_active: cur } : a))
  }

  async function del(id: string) {
    setGuideVisible(false)
    if (!confirm('Supprimer cette automatisation ?')) return
    setAutos(p => p.filter(a => a.id !== id))
    await fetch('/api/automations', {
      method: 'DELETE', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }

  async function run(id: string) {
    setGuideVisible(false)
    setRunId(id)
    setRunRes(p => ({ ...p, [id]: { ok: true, msg: 'Exécution en cours...' } }))
    try {
      const res = await fetch('/api/automations/run', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      setRunRes(p => ({
        ...p,
        [id]: {
          ok: res.ok && data.success !== false,
          msg: (data.message || data.error || 'Terminé') as string,
          count: data.details?.count as number | undefined,
        }
      }))
      if (res.ok) load()
    } catch { setRunRes(p => ({ ...p, [id]: { ok: false, msg: 'Erreur réseau' } })) }
    setRunId(null)
  }

  const getType = (id: string) => TYPES.find(t => t.id === id)
  const getFilter = (fid: string) => FILTERS.find(f => f.id === fid)

  const S = {
    wrap: { background: '#f1f5f9', minHeight: '100vh', padding: 'clamp(14px,4vw,28px)', boxSizing: 'border-box' as const },
    inner: { maxWidth: '960px', margin: '0 auto', width: '100%', boxSizing: 'border-box' as const },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', width: '100%', boxSizing: 'border-box' as const },
    h1: { color: '#0f172a', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800 as const, margin: '0 0 4px', letterSpacing: '-0.02em' },
    h2: { color: '#0f172a', fontSize: '16px', fontWeight: 700 as const, margin: '0 0 16px' },
    lbl: { display: 'block' as const, color: '#334155', fontSize: '13px', fontWeight: 600 as const, marginBottom: '6px' },
    inp: { width: '100%', boxSizing: 'border-box' as const, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '14px', padding: '9px 12px', outline: 'none', fontFamily: 'inherit' },
    sec: { display: 'inline-flex' as const, alignItems: 'center' as const, gap: '6px', padding: '8px 14px', background: '#f1f5f9', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontWeight: 500 as const, cursor: 'pointer', whiteSpace: 'nowrap' as const, boxSizing: 'border-box' as const },
  }
  const pri = (c = '#2563eb'): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: c, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', boxSizing: 'border-box' })

  function FieldInput({ a, cfg, setCfg }: { a: ActionItem; cfg: Record<string, unknown>; setCfg: (c: Record<string, unknown>) => void }) {
    const val = cfg[a.id] ?? ('def' in a ? a.def : '')
    const update = (v: unknown) => setCfg({ ...cfg, [a.id]: v })
    if (a.type === 'select') return (
      <select value={val as string} onChange={e => update(e.target.value)} style={{ ...S.inp, cursor: 'pointer' }}>
        {'options' in a && a.options?.map((o: { v: string; l: string }) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    )
    if (a.type === 'number') return (
      <input type="number"
        min={'min' in a ? a.min as number : 0}
        max={'max' in a ? a.max as number : undefined}
        step={'step' in a ? a.step as number : 1}
        value={val as number}
        onChange={e => update(parseFloat(e.target.value) || ('def' in a ? a.def : 0))}
        style={{ ...S.inp, maxWidth: '180px' }} />
    )
    if (a.type === 'toggle') return (
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!val} onChange={e => update(e.target.checked)}
          style={{ accentColor: picked?.color || '#2563eb', width: '16px', height: '16px', cursor: 'pointer' }} />
        <span style={{ color: '#334155', fontSize: '14px' }}>Activé</span>
      </label>
    )
    if (a.type === 'textarea') return (
      <textarea value={val as string} onChange={e => update(e.target.value)}
        placeholder={'placeholder' in a ? a.placeholder as string : ''}
        rows={3} style={{ ...S.inp, resize: 'vertical', minHeight: '70px' }} />
    )
    return (
      <input type="text" value={val as string} onChange={e => update(e.target.value)}
        placeholder={'placeholder' in a ? a.placeholder as string : ''} style={S.inp} />
    )
  }

  // ── PICK SCREEN ───────────────────────────────────────────────
  if (screen === 'pick') return (
    <div style={S.wrap}>
      <div style={S.inner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => setScreen('list')} style={S.sec}>← Retour</button>
          <div style={{ minWidth: 0 }}>
            <h1 style={S.h1}>Choisir un type d&apos;automatisation</h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>{TYPES.length} automatisations disponibles</p>
          </div>
        </div>
        <GuideBanner
          visible={guideVisible}
          icon="i"
          title="Automatisations"
          text="Créez des règles automatiques qui s'appliquent à votre catalogue — modification de prix en lot, nettoyage de tags, audit d'images. Chaque automatisation peut être planifiée ou déclenchée manuellement."
          onClose={() => setGuideVisible(false)}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(280px,100%),1fr))', gap: '12px' }}>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => pick(t)}
              style={{ ...S.card, padding: 0, cursor: 'pointer', textAlign: 'left', border: '1px solid #e2e8f0' }}>
              <div style={{ height: '4px', background: t.color, borderRadius: '12px 12px 0 0' }} />
              <div style={{ padding: '16px', boxSizing: 'border-box', width: '100%' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ width: '40px', minWidth: '40px', height: '40px', borderRadius: '10px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {t.icon}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700, margin: '0 0 4px', lineHeight: '1.3', wordBreak: 'break-word' }}>{t.name}</p>
                    <p style={{ color: '#64748b', fontSize: '12px', margin: 0, lineHeight: '1.5', wordBreak: 'break-word' }}>{t.pitch}</p>
                  </div>
                </div>
                <div style={{ background: t.bg, border: '1px solid ' + t.color + '33', borderRadius: '8px', padding: '10px 12px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', minWidth: '36px', flexShrink: 0 }}>Avant</span>
                    <span style={{ color: '#64748b', fontSize: '12px', lineHeight: '1.4', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{t.before}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: t.color, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', minWidth: '36px', flexShrink: 0 }}>Après</span>
                    <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: 600, lineHeight: '1.4', wordBreak: 'break-word', flex: 1, minWidth: 0 }}>{t.after}</span>
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

  // ── CONFIG SCREEN ─────────────────────────────────────────────
  if (screen === 'config' && picked) {
    const availableFilters = FILTERS.filter(f => (picked.filters as readonly string[]).includes(f.id))
    const selectedFilter = availableFilters.find(f => f.id === ffilter) || availableFilters[0]
    return (
      <div style={S.wrap}>
        <div style={S.inner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button onClick={() => setScreen('pick')} style={S.sec}>← Changer de type</button>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '22px' }}>{picked.icon}</span>
                <h1 style={{ ...S.h1, fontSize: 'clamp(16px,3vw,20px)' }}>{picked.name}</h1>
              </div>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '2px 0 0' }}>Étape 2/2 — Configuration</p>
            </div>
          </div>

          <GuideBanner
            visible={guideVisible}
            icon="i"
            title="Automatisations"
            text="Créez des règles automatiques qui s'appliquent à votre catalogue — modification de prix en lot, nettoyage de tags, audit d'images. Chaque automatisation peut être planifiée ou déclenchée manuellement."
            onClose={() => setGuideVisible(false)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: '16px', alignItems: 'start' }}>
            {/* Left: form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name */}
              <div style={{ ...S.card, padding: '20px' }}>
                <label style={S.lbl}>Nom de l&apos;automatisation</label>
                <input value={fname} onChange={e => setFname(e.target.value)}
                  placeholder="Ex: SEO titres — tous les produits" style={S.inp} />
              </div>

              {/* Filter */}
              <div style={{ ...S.card, padding: '20px' }}>
                <h2 style={S.h2}>🎯 Ciblage — Quels produits ?</h2>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 14px', lineHeight: '1.5' }}>
                  Définissez précisément quels produits cette automatisation doit traiter.
                </p>
                <label style={S.lbl}>Filtre de sélection</label>
                <select value={ffilter} onChange={e => { setFfilter(e.target.value as FilterId); setFfilterParams({}) }}
                  style={{ ...S.inp, cursor: 'pointer', marginBottom: '12px' }}>
                  {availableFilters.map(f => (
                    <option key={f.id} value={f.id}>{f.icon} {f.label}</option>
                  ))}
                </select>
                {'param' in selectedFilter && selectedFilter.param && (
                  <div>
                    <label style={S.lbl}>{selectedFilter.param.label}</label>
                    {selectedFilter.param.type === 'number' ? (
                      <input type="number"
                        value={(ffilterParams[selectedFilter.param.key] as number) ?? selectedFilter.param.def}
                        onChange={e => setFfilterParams(p => ({ ...p, [(selectedFilter as { param: { key: string } }).param.key]: parseFloat(e.target.value) }))}
                        style={{ ...S.inp, maxWidth: '180px' }} />
                    ) : (
                      <input type="text"
                        value={(ffilterParams[selectedFilter.param.key] as string) ?? ''}
                        onChange={e => setFfilterParams(p => ({ ...p, [(selectedFilter as { param: { key: string } }).param.key]: e.target.value }))}
                        style={S.inp} />
                    )}
                  </div>
                )}
                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
                    💡 Le filtre sera appliqué lors de l&apos;exécution pour cibler exactement les produits concernés
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div style={{ ...S.card, padding: '20px' }}>
                <h2 style={S.h2}>⚙️ Actions — Que faire ?</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(picked.actions as readonly ActionItem[]).map((a: ActionItem) => (
                    <div key={a.id}>
                      <label style={S.lbl}>{a.label}</label>
                      <FieldInput a={a} cfg={fconfig} setCfg={setFconfig} />
                    </div>
                  ))}
                </div>
              </div>

              {saveErr && <p style={{ color: '#dc2626', fontSize: '13px', fontWeight: 500 }}>{saveErr}</p>}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={() => setScreen('pick')} style={S.sec}>← Retour</button>
                <button onClick={save} disabled={saving || !fname.trim()}
                  style={{ ...pri(picked.color), opacity: saving || !fname.trim() ? 0.6 : 1 }}>
                  {saving ? 'Création...' : "✓ Créer l'automatisation"}
                </button>
              </div>
            </div>

            {/* Right: summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ ...S.card, padding: '18px', background: picked.bg, border: '1px solid ' + picked.color + '44' }}>
                <div style={{ fontSize: '30px', marginBottom: '10px' }}>{picked.icon}</div>
                <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700, margin: '0 0 8px', wordBreak: 'break-word' }}>{picked.name}</p>
                <p style={{ color: '#334155', fontSize: '13px', margin: '0 0 14px', lineHeight: '1.6', wordBreak: 'break-word' }}>{picked.pitch}</p>
                <div style={{ padding: '10px 14px', background: '#fff', borderRadius: '8px', border: '1px solid ' + picked.color + '33' }}>
                  <p style={{ color: picked.color, fontSize: '13px', fontWeight: 700, margin: '0 0 2px' }}>↗ {picked.result}</p>
                  <p style={{ color: '#94a3b8', fontSize: '11px', margin: 0 }}>Impact estimé</p>
                </div>
              </div>
              <div style={{ ...S.card, padding: '16px' }}>
                <p style={{ color: '#334155', fontSize: '12px', fontWeight: 700, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Exemple concret</p>
                <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', marginBottom: '8px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase' }}>Avant</p>
                  <p style={{ color: '#64748b', fontSize: '13px', margin: 0, wordBreak: 'break-word' }}>{picked.before}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', color: picked.color, fontSize: '18px', marginBottom: '8px' }}>↓</div>
                <div style={{ padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px' }}>
                  <p style={{ color: '#059669', fontSize: '10px', fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase' }}>Après</p>
                  <p style={{ color: '#0f172a', fontSize: '13px', fontWeight: 600, margin: 0, wordBreak: 'break-word' }}>{picked.after}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── LIST SCREEN ───────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      <div style={S.inner}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={S.h1}>Automatisations</h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
              {autos.length > 0
                ? autos.length + ' créée' + (autos.length > 1 ? 's' : '') + ' · ' + TYPES.length + ' types disponibles'
                : 'Exécutez des actions en masse sur vos produits en 1 clic'}
            </p>
          </div>
          <button onClick={() => setScreen('pick')} style={{ ...pri('#2563eb'), padding: '10px 22px', flexShrink: 0 }}>
            + Nouvelle automatisation
          </button>
        </div>

        <GuideBanner
          visible={guideVisible}
          icon="i"
          title="Automatisations"
          text="Créez des règles automatiques qui s'appliquent à votre catalogue — modification de prix en lot, nettoyage de tags, audit d'images. Chaque automatisation peut être planifiée ou déclenchée manuellement."
          onClose={() => setGuideVisible(false)}
        />

        {/* Stats */}
        {autos.length > 0 && !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(130px,100%),1fr))', gap: '10px', marginBottom: '20px' }}>
            {[
              { v: autos.length, l: 'Créées', c: '#2563eb' },
              { v: autos.filter(a => a.is_active).length, l: 'Actives', c: '#059669' },
              { v: autos.reduce((s, a) => s + (a.run_count || 0), 0), l: 'Exécutions', c: '#7c3aed' },
              { v: TYPES.length, l: 'Types dispo', c: '#d97706' },
            ].map(s => (
              <div key={s.l} style={{ ...S.card, padding: '14px', textAlign: 'center' }}>
                <p style={{ color: s.c, fontSize: '26px', fontWeight: 800, margin: '0 0 3px', lineHeight: 1 }}>{s.v}</p>
                <p style={{ color: '#64748b', fontSize: '12px', margin: 0, fontWeight: 500 }}>{s.l}</p>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {err && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <p style={{ color: '#dc2626', fontSize: '14px', margin: 0, flex: 1, fontWeight: 500, minWidth: 0 }}>{err}</p>
            <button onClick={load} style={{ ...S.sec, flexShrink: 0 }}>Réessayer</button>
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>Chargement...</div>}

        {/* Empty state */}
        {!loading && !err && autos.length === 0 && (
          <div style={{ ...S.card, padding: '48px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
            <p style={{ color: '#0f172a', fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>
              Automatisez votre boutique
            </p>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 28px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.7' }}>
              {TYPES.length} types d&apos;automatisations disponibles. Chaque automatisation cible des produits spécifiques selon vos critères et exécute des actions en masse.
            </p>
            <button onClick={() => setScreen('pick')} style={{ ...pri('#2563eb'), fontSize: '15px', padding: '12px 28px' }}>
              Choisir une automatisation
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(260px,100%),1fr))', gap: '12px', marginTop: '32px', textAlign: 'left' }}>
              {TYPES.slice(0, 4).map(t => (
                <button key={t.id} onClick={() => pick(t)}
                  style={{ ...S.card, padding: '16px', cursor: 'pointer', textAlign: 'left', background: t.bg, border: '1px solid ' + t.color + '33', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px', flexShrink: 0 }}>{t.icon}</span>
                    <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{t.name}</p>
                  </div>
                  <p style={{ color: t.color, fontSize: '12px', margin: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>↗ {t.result}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* List */}
        {!loading && autos.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {autos.map(a => {
              const t = getType(a.type)
              const r = runRes[a.id]
              const isOpen = openId === a.id
              const filterInfo = getFilter((a.config?.filter as string) || 'all')
              const ac = t?.color || '#2563eb'
              return (
                <div key={a.id} style={{ ...S.card, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', minWidth: 0 }}>
                    {/* Left accent stripe */}
                    <div style={{ width: '4px', minWidth: '4px', background: a.is_active ? ac : '#e2e8f0', borderRadius: '12px 0 0 12px' }} />
                    {/* Card body */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ padding: '14px 16px 12px' }}>
                        {/* Top row: icon + name/type + controls — no flexWrap, text truncates instead */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                          <div style={{ width: '38px', minWidth: '38px', height: '38px', borderRadius: '10px', background: t?.bg || '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                            {t?.icon || '⚙️'}
                          </div>
                          {/* Text section: flex:1 minWidth:0 ensures the name can truncate */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <p style={{ color: '#0f172a', fontSize: '14px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{a.name}</p>
                              <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '20px', fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap', background: a.is_active ? (t?.bg || '#eff6ff') : '#f1f5f9', color: a.is_active ? ac : '#94a3b8', border: '1px solid ' + (a.is_active ? ac + '33' : '#e2e8f0') }}>
                                {a.is_active ? '● Actif' : '○ Pause'}
                              </span>
                            </div>
                            <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t?.name || a.type}</p>
                          </div>
                          {/* Controls — always right-aligned, never wrap */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                            <button onClick={() => toggle(a.id, a.is_active)} title={a.is_active ? 'Mettre en pause' : 'Activer'}
                              style={{ width: '36px', height: '20px', borderRadius: '10px', background: a.is_active ? ac : '#cbd5e1', border: 'none', position: 'relative', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                              <div style={{ width: '14px', height: '14px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', transform: a.is_active ? 'translateX(19px)' : 'translateX(3px)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </button>
                            <button onClick={() => setOpenId(isOpen ? null : a.id)} style={{ ...S.sec, padding: '6px 10px', fontSize: '12px' }}>
                              {isOpen ? '▲' : '▼'} Détails
                            </button>
                            <button onClick={() => run(a.id)} disabled={runId === a.id || !a.is_active}
                              style={{ ...pri(a.is_active ? ac : '#94a3b8'), padding: '7px 14px', opacity: (!a.is_active || runId === a.id) ? 0.55 : 1, fontSize: '12px' }}>
                              {runId === a.id ? '⟳ En cours' : '▶ Exécuter'}
                            </button>
                            <button onClick={() => del(a.id)}
                              style={{ width: '30px', height: '30px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '7px', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                              ×
                            </button>
                          </div>
                        </div>
                        {/* Meta row — wraps freely on narrow screens */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px', paddingLeft: '48px' }}>
                          {filterInfo && (
                            <span style={{ fontSize: '11px', color: '#475569', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 7px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {filterInfo.icon} {filterInfo.label}
                            </span>
                          )}
                          {(a.run_count || 0) > 0 && (
                            <span style={{ color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>
                              <span style={{ color: ac, fontWeight: 700 }}>{a.run_count}</span> exéc.
                            </span>
                          )}
                          {a.last_run_at
                            ? <span style={{ color: '#94a3b8', fontSize: '11px', whiteSpace: 'nowrap' }}>Dernière : {new Date(a.last_run_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            : <span style={{ color: '#cbd5e1', fontSize: '11px', fontStyle: 'italic', whiteSpace: 'nowrap' }}>Jamais exécutée</span>
                          }
                        </div>
                      </div>
                      {/* Run result */}
                      {r && (
                        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: r.ok ? '#f0fdf4' : '#fef2f2', border: '1px solid ' + (r.ok ? '#86efac' : '#fca5a5'), borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '14px', flexShrink: 0 }}>{r.ok ? '✅' : '❌'}</span>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ color: r.ok ? '#14532d' : '#7f1d1d', fontSize: '13px', fontWeight: 600, margin: '0 0 2px', wordBreak: 'break-word' }}>{r.msg}</p>
                            {r.count != null && <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{r.count} produit(s) traité(s)</p>}
                          </div>
                        </div>
                      )}
                      {/* Expanded */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 16px', background: '#f8fafc' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(140px,100%),1fr))', gap: '10px', marginBottom: '12px' }}>
                            <div>
                              <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</p>
                              <p style={{ color: '#334155', fontSize: '13px', fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>{t?.name || a.type}</p>
                            </div>
                            <div>
                              <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtre</p>
                              <p style={{ color: '#334155', fontSize: '13px', fontWeight: 500, margin: 0 }}>{filterInfo?.label || 'Tous'}</p>
                            </div>
                            <div>
                              <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Créée le</p>
                              <p style={{ color: '#334155', fontSize: '13px', fontWeight: 500, margin: 0 }}>{new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                            {Object.entries(a.config || {}).filter(([k, v]) => k !== 'filter' && k !== 'filter_params' && v !== '' && v !== null && v !== false).map(([k, v]) => (
                              <div key={k}>
                                <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 700, margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.replace(/_/g, ' ')}</p>
                                <p style={{ color: '#334155', fontSize: '13px', fontWeight: 500, margin: 0, wordBreak: 'break-all' }}>{String(v)}</p>
                              </div>
                            ))}
                          </div>
                          {t && (
                            <div style={{ padding: '10px 14px', background: t.bg, border: '1px solid ' + t.color + '22', borderRadius: '8px' }}>
                              <p style={{ color: '#334155', fontSize: '12px', margin: '0 0 4px', lineHeight: '1.6', wordBreak: 'break-word' }}>{t.pitch}</p>
                              <p style={{ color: t.color, fontSize: '12px', fontWeight: 600, margin: 0 }}>↗ {t.result}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
