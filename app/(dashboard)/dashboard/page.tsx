'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'

const S = {
  page: {
    padding: '32px',
    maxWidth: '960px',
    margin: '0 auto',
    background: '#080d1a',
    borderRadius: '14px',
  } as CSSProperties,
  h1: {
    color: '#e8ecf4',
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 4px 0',
    letterSpacing: '-0.01em',
  } as CSSProperties,
  sub: {
    color: '#6b7a99',
    fontSize: '14px',
    margin: '0 0 32px 0',
    fontWeight: 400,
  } as CSSProperties,
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    padding: '20px',
  } as CSSProperties,
  sectionTitle: {
    color: '#e8ecf4',
    fontSize: '15px',
    fontWeight: 600,
    margin: '0 0 16px 0',
  } as CSSProperties,
}

type ChecklistItem = {
  label: string
  desc: string
  done: boolean
  href: string
}

export default function DashboardPage() {
  const [state, setState] = useState({
    plan: 'free',
    actionsUsed: 0,
    actionsLimit: 30,
    shopCount: 0,
    productCount: 0,
    loading: true,
    firstName: '',
  })

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { label: 'Connecter Shopify', done: false, href: '/dashboard/shops', desc: 'Reliez votre boutique' },
    { label: 'Synchroniser les produits', done: false, href: '/dashboard/products', desc: 'Importez vos produits' },
    { label: 'Lancer une optimisation IA', done: false, href: '/dashboard/ai', desc: 'Premiere fiche optimisee' },
  ])

  useEffect(() => {
    document.title = 'Tableau de bord - EcomPilot Elite'
    ;(async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setState((s) => ({ ...s, loading: false }))
        return
      }

      const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || ''
      const [{ data: profile }, { data: shops }] = await Promise.all([
        supabase.from('users').select('plan,actions_used,actions_limit').eq('id', user.id).single(),
        supabase.from('shops').select('id').eq('user_id', user.id).eq('is_active', true),
      ])

      let productCount = 0
      try {
        const r = await fetch('/api/shopify/products?limit=1')
        if (r.ok) {
          const d = await r.json()
          productCount = d.total || d.products?.length || 0
        }
      } catch {
        // ignore network errors in dashboard summary
      }

      const shopCount = shops?.length || 0
      const actionsUsed = profile?.actions_used || 0
      const actionsLimit = profile?.actions_limit ?? 30
      const plan = profile?.plan || 'free'

      setState({ plan, actionsUsed, actionsLimit, shopCount, productCount, loading: false, firstName })
      setChecklist([
        { label: 'Connecter Shopify', done: shopCount > 0, href: '/dashboard/shops', desc: 'Reliez votre boutique' },
        { label: 'Synchroniser les produits', done: productCount > 0, href: '/dashboard/products', desc: 'Importez vos produits' },
        { label: 'Premiere optimisation IA', done: actionsUsed > 0, href: '/dashboard/ai', desc: 'Generez votre premiere fiche' },
      ])
    })()
  }, [])

  const { plan, actionsUsed, actionsLimit, shopCount, productCount, loading, firstName } = state
  const remaining = actionsLimit === -1 ? null : Math.max(0, actionsLimit - actionsUsed)
  const pct = actionsLimit <= 0 ? 0 : Math.min(100, (actionsUsed / actionsLimit) * 100)
  const allDone = checklist.every((s) => s.done)

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Bonjour{firstName ? `, ${firstName}` : ''}</h1>
      <p style={S.sub}>Vue d'ensemble de votre boutique</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Produits', value: loading ? '-' : String(productCount), color: '#4f8ef7', href: '/dashboard/products' },
          {
            label: 'Actions IA',
            value: loading ? '-' : actionsLimit === -1 ? 'Illimite' : `${actionsUsed}/${actionsLimit}`,
            color: '#8b5cf6',
            href: '/dashboard/ai',
          },
          { label: 'Boutiques', value: loading ? '-' : String(shopCount), color: '#10b981', href: '/dashboard/shops' },
          { label: 'Plan actuel', value: loading ? '-' : plan.charAt(0).toUpperCase() + plan.slice(1), color: '#6b7a99', href: '/dashboard/billing' },
        ].map((k) => (
          <a key={k.label} href={k.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '18px 16px' }}>
              <p
                style={{
                  color: '#6b7a99',
                  fontSize: '11px',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: '0 0 8px 0',
                }}
              >
                {k.label}
              </p>
              <p style={{ color: k.color, fontSize: '26px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{k.value}</p>
            </div>
          </a>
        ))}
      </div>

      {remaining !== null && (
        <div style={{ ...S.card, marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{ color: '#e8ecf4', fontSize: '14px', fontWeight: 500, margin: 0 }}>Actions IA restantes ce mois</p>
            <p style={{ color: remaining <= 5 ? '#f87171' : '#4f8ef7', fontSize: '14px', fontWeight: 600, margin: 0 }}>
              {remaining} / {actionsLimit}
            </p>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                transition: 'width 0.4s',
                borderRadius: '2px',
                background: remaining <= 5 ? '#ef4444' : '#4f8ef7',
              }}
            />
          </div>
          {remaining <= 5 && (
            <div style={{ marginTop: '12px', textAlign: 'right' }}>
              <a href="/dashboard/billing" style={{ fontSize: '13px', color: '#4f8ef7', fontWeight: 500, textDecoration: 'none' }}>
                Voir les plans
              </a>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {!allDone && (
          <div style={S.card}>
            <p style={S.sectionTitle}>Demarrer</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {checklist.map((s, i) => (
                <a key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: s.done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${s.done ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)'}`,
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: s.done ? '#10b981' : 'transparent',
                        border: `1.5px solid ${s.done ? '#10b981' : 'rgba(255,255,255,0.15)'}`,
                        flexShrink: 0,
                      }}
                    >
                      {s.done ? (
                        <span style={{ color: 'white', fontSize: '11px', fontWeight: 700 }}>OK</span>
                      ) : (
                        <span style={{ color: '#6b7a99', fontSize: '11px', fontWeight: 600 }}>{i + 1}</span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          color: s.done ? '#10b981' : '#e8ecf4',
                          fontSize: '13px',
                          fontWeight: 500,
                          margin: '0 0 1px 0',
                          textDecoration: s.done ? 'line-through' : 'none',
                          textDecorationColor: 'rgba(16,185,129,0.5)',
                        }}
                      >
                        {s.label}
                      </p>
                      <p style={{ color: '#6b7a99', fontSize: '12px', margin: 0, fontWeight: 400 }}>{s.desc}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={S.card}>
          <p style={S.sectionTitle}>Navigation rapide</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { href: '/dashboard/ai', label: 'Optimisation IA', desc: 'Generer des fiches produits' },
              { href: '/dashboard/import', label: 'Import produits', desc: 'AliExpress, CJDropshipping...' },
              { href: '/dashboard/products', label: 'Mes produits', desc: 'Gerer le catalogue' },
              { href: '/dashboard/billing', label: 'Abonnement', desc: `${plan.charAt(0).toUpperCase() + plan.slice(1)} - Gerer le plan` },
            ].map((a) => (
              <a
                key={a.href}
                href={a.href}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  textDecoration: 'none',
                }}
              >
                <div>
                  <p style={{ color: '#e8ecf4', fontSize: '13px', fontWeight: 500, margin: '0 0 1px 0' }}>{a.label}</p>
                  <p style={{ color: '#6b7a99', fontSize: '12px', margin: 0, fontWeight: 400 }}>{a.desc}</p>
                </div>
                <span style={{ color: '#3d4d6b', fontSize: '16px' }}>›</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
