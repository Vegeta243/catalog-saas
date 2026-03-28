'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function OnboardingModal() {
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(1)
  const [completing, setCompleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkOnboarding()
  }, [])

  async function checkOnboarding() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('onboarding_completed').eq('id', user.id).single()
      if (data && !data.onboarding_completed) setShow(true)
    } catch { /* silent */ }
  }

  async function complete() {
    setCompleting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id)
    } catch { /* silent */ }
    setShow(false)
    setCompleting(false)
  }

  async function handleStep(s: number) {
    if (s === 1) router.push('/dashboard/shops')
    if (s === 2) {
      await fetch('/api/shopify/sync', { method: 'POST', credentials: 'include' }).catch(() => {})
      router.push('/dashboard/products')
    }
    if (s === 3) router.push('/dashboard/ai')
    if (s < 3) setStep(s + 1)
    else await complete()
  }

  if (!show) return null

  const STEPS = [
    { n: 1, title: 'Connecte ta boutique Shopify', desc: "Autorise EcomPilot à accéder à ton catalogue pour l'analyser et l'optimiser.", btn: 'Connecter ma boutique' },
    { n: 2, title: 'Lance ton premier scan IA', desc: "Synchronise ton catalogue Shopify pour que l'IA analyse tous tes produits.", btn: 'Lancer la synchronisation' },
    { n: 3, title: 'Optimise tes 3 premiers produits', desc: "Vois l'IA en action sur tes premiers produits — titres, descriptions, SEO.", btn: "Voir l'optimisation IA" },
  ]
  const current = STEPS[step - 1]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ background: '#ffffff', borderRadius: '16px', padding: 'clamp(24px,5vw,40px)', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ flex: 1, height: '4px', borderRadius: '2px', background: n <= step ? '#2563eb' : '#e2e8f0', transition: 'background 0.3s' }} />
          ))}
        </div>
        {/* Step indicator */}
        <p style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>
          Étape {step} sur 3
        </p>
        <h2 style={{ color: '#0f172a', fontSize: 'clamp(18px,4vw,22px)', fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>
          {current.title}
        </h2>
        <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 28px', lineHeight: 1.6, fontWeight: 400 }}>
          {current.desc}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={complete} disabled={completing}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
            Passer le tutoriel
          </button>
          <button onClick={() => handleStep(step)}
            style={{ padding: '11px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '9px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            {current.btn}
          </button>
        </div>
      </div>
    </div>
  )
}
