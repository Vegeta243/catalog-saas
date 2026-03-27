'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('Bonjour')
  const [firstName, setFirstName] = useState('')
  const [plan, setPlan] = useState('free')
  const [actionsUsed, setActionsUsed] = useState(0)
  const [actionsLimit, setActionsLimit] = useState(30)
  const [shopCount, setShopCount] = useState(0)
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [steps, setSteps] = useState([
    { id: 1, emoji: '🏪', label: 'Connecter Shopify', desc: 'Reliez votre boutique', done: false, href: '/dashboard/shops' },
    { id: 2, emoji: '📦', label: 'Synchroniser les produits', desc: 'Importez vos produits Shopify', done: false, href: '/dashboard/products' },
    { id: 3, emoji: '✨', label: 'Lancer une optimisation IA', desc: 'Générez votre primera fiche optimisée', done: false, href: '/dashboard/ai' },
  ])

  useEffect(() => {
    document.title = 'Tableau de bord — EcomPilot Elite'
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir')
    loadData()
  }, [])

  async function loadData() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const name = user.user_metadata?.first_name || user.email?.split('@')[0] || ''
      setFirstName(name)

      const [profileRes, shopsRes, productsRes] = await Promise.allSettled([
        supabase.from('users').select('plan, actions_used, actions_limit').eq('id', user.id).single(),
        supabase.from('shops').select('id').eq('user_id', user.id).eq('is_active', true),
        fetch('/api/shopify/products?limit=1'),
      ])

      if (profileRes.status === 'fulfilled' && profileRes.value.data) {
        const d = profileRes.value.data
        setPlan(d.plan || 'free')
        setActionsUsed(d.actions_used || 0)
        setActionsLimit(d.actions_limit ?? 30)
      }

      const shops = shopsRes.status === 'fulfilled' ? shopsRes.value.data || [] : []
      setShopCount(shops.length)

      let prodTotal = 0
      if (productsRes.status === 'fulfilled' && productsRes.value.ok) {
        try {
          const d = await productsRes.value.json()
          prodTotal = d.total || (d.products?.length ?? 0)
          setProductCount(prodTotal)
        } catch {}
      }

      setSteps([
        { id: 1, emoji: '🏪', label: 'Connecter Shopify', desc: 'Reliez votre boutique', done: shops.length > 0, href: '/dashboard/shops' },
        { id: 2, emoji: '📦', label: 'Synchroniser les produits', desc: 'Importez vos produits Shopify', done: prodTotal > 0, href: '/dashboard/products' },
        { id: 3, emoji: '✨', label: 'Lancer une optimisation IA', desc: 'Générez votre première fiche optimisée', done: false, href: '/dashboard/ai' },
      ])
    } catch {}
    setLoading(false)
  }

  const allDone = steps.every(s => s.done)
  const remaining = actionsLimit === -1 ? null : Math.max(0, actionsLimit - actionsUsed)
  const pct = actionsLimit <= 0 ? 0 : Math.min(100, (actionsUsed / actionsLimit) * 100)

  const card: React.CSSProperties = { background: '#111827', border: '1px solid #1e2d45', borderRadius: '20px', padding: '20px' }
  const PLAN_COLORS: Record<string, string> = { free: '#94a3b8', starter: '#4f8ef7', pro: '#a78bfa', agency: '#34d399' }
  const planColor = PLAN_COLORS[plan] || '#94a3b8'

  const kpis = [
    { label: 'PRODUITS', value: loading ? '…' : String(productCount), emoji: '📦', accent: '#4f8ef7', bg: 'rgba(79,142,247,0.08)', border: 'rgba(79,142,247,0.2)', href: '/dashboard/products' },
    { label: 'ACTIONS IA', value: loading ? '…' : (actionsLimit === -1 ? '∞' : actionsUsed + '/' + actionsLimit), emoji: '🤖', accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', href: '/dashboard/ai' },
    { label: 'BOUTIQUES', value: loading ? '…' : String(shopCount), emoji: '🏪', accent: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', href: '/dashboard/shops' },
    { label: 'PLAN', value: loading ? '…' : plan.toUpperCase(), emoji: '🚀', accent: planColor, bg: `rgba(100,100,100,0.08)`, border: 'rgba(100,100,100,0.2)', href: '/dashboard/billing' },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Page title */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: '#f0f4ff', fontSize: '26px', fontWeight: 900, margin: '0 0 4px' }}>
          {greeting}{firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <p style={{ color: '#8b9fc4', fontSize: '14px', margin: 0 }}>
          Bienvenue sur EcomPilot Elite
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {kpis.map(k => (
          <Link key={k.label} href={k.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: k.bg, border: '1px solid ' + k.border, borderRadius: '20px', padding: '20px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{k.emoji}</div>
              <p style={{ color: '#8b9fc4', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{k.label}</p>
              <p style={{ color: k.accent, fontSize: '30px', fontWeight: 900, margin: 0, lineHeight: 1 }}>{k.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Actions bar */}
      {remaining !== null && (
        <div style={{ ...card, marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: '14px', margin: 0 }}>Actions IA restantes ce mois</p>
            <span style={{ color: remaining <= 5 ? '#fca5a5' : '#4f8ef7', fontWeight: 900, fontSize: '16px' }}>
              {remaining} / {actionsLimit}
            </span>
          </div>
          <div style={{ height: '8px', background: '#1a2234', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '4px', background: remaining <= 5 ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#4f8ef7,#06b6d4)', width: pct + '%', transition: 'width 0.4s' }} />
          </div>
          {remaining <= 5 && (
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <a href="/dashboard/billing" style={{ padding: '8px 16px', background: '#4f8ef7', color: '#f0f4ff', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
                Passer au plan payant →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      {!allDone && (
        <div style={{ ...card, marginBottom: '24px' }}>
          <p style={{ color: '#f0f4ff', fontWeight: 800, fontSize: '16px', margin: '0 0 16px' }}>🚀 Démarrer en 3 étapes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {steps.map((s, i) => (
              <a key={s.id} href={s.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px', background: s.done ? 'rgba(34,197,94,0.08)' : '#0a0f1e', border: '1px solid ' + (s.done ? 'rgba(34,197,94,0.25)' : '#1e2d45') }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: s.done ? '#22c55e' : '#1a2234', border: '2px solid ' + (s.done ? '#22c55e' : '#334155'), flexShrink: 0, fontSize: s.done ? '16px' : '13px', color: s.done ? 'white' : '#8b9fc4', fontWeight: 700 }}>
                    {s.done ? '✓' : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: s.done ? '#86efac' : '#f0f4ff', fontWeight: 700, fontSize: '14px', margin: '0 0 2px', textDecoration: s.done ? 'line-through' : 'none' }}>{s.emoji} {s.label}</p>
                    <p style={{ color: '#8b9fc4', fontSize: '12px', margin: 0 }}>{s.desc}</p>
                  </div>
                  <span style={{ color: '#4a5878', fontSize: '20px' }}>›</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* All done */}
      {allDone && (
        <div style={{ ...card, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '32px' }}>🎉</span>
          <div>
            <p style={{ color: '#86efac', fontWeight: 800, fontSize: '16px', margin: '0 0 4px' }}>Configuration terminée !</p>
            <p style={{ color: '#8b9fc4', fontSize: '14px', margin: 0 }}>Votre boutique est connectée et prête à être optimisée.</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ ...card }}>
        <p style={{ color: '#f0f4ff', fontWeight: 800, fontSize: '16px', margin: '0 0 16px' }}>Actions rapides</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {[
            { href: '/dashboard/ai', emoji: '✨', label: 'Optimiser avec l\'IA', color: '#a78bfa' },
            { href: '/dashboard/import', emoji: '📥', label: 'Importer depuis AliExpress', color: '#4f8ef7' },
            { href: '/dashboard/products', emoji: '📦', label: 'Gérer mes produits', color: '#fbbf24' },
            { href: '/dashboard/billing', emoji: '💳', label: 'Mon abonnement', color: '#34d399' },
          ].map(a => (
            <a key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '14px', background: '#0a0f1e', border: '1px solid #1e2d45', textDecoration: 'none' }}>
              <span style={{ fontSize: '22px' }}>{a.emoji}</span>
              <span style={{ color: a.color, fontWeight: 700, fontSize: '14px' }}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
