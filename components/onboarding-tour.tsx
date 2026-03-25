'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

const STORAGE_KEY = 'ecompilot_tour_v2'

const TOUR_STEPS = [
  {
    emoji: '👋',
    title: 'Bienvenue sur EcomPilot Elite !',
    description: "Votre assistant IA pour optimiser votre boutique Shopify. Laissez-nous vous montrer les fonctionnalites cles en 30 secondes.",
    ctaLabel: 'Commencer le guide',
    navigateTo: null as string | null,
  },
  {
    emoji: '🏪',
    title: 'Connectez votre boutique',
    description: "Commencez par connecter votre boutique Shopify. Tous vos produits seront synchronises automatiquement et vous pourrez les gerer depuis EcomPilot.",
    ctaLabel: 'Connecter ma boutique →',
    navigateTo: '/dashboard/shops',
  },
  {
    emoji: '🛒',
    title: 'Importez des produits',
    description: "Importez des produits depuis AliExpress, CJDropshipping, DHgate et plus encore directement dans votre boutique en quelques secondes.",
    ctaLabel: "Importer des produits →",
    navigateTo: '/dashboard/import',
  },
  {
    emoji: '✨',
    title: 'Optimisation IA',
    description: "Generez des titres et descriptions optimises SEO pour vos produits en 1 clic grace a l'IA. Augmentez votre visibilite sur Google.",
    ctaLabel: "Optimiser avec l'IA →",
    navigateTo: '/dashboard/ai',
  },
  {
    emoji: '📦',
    title: 'Modifier en masse',
    description: "Editez les prix, titres et descriptions de centaines de produits simultanement. Un seul clic pour appliquer des changements globaux.",
    ctaLabel: "Modifier en masse →",
    navigateTo: '/dashboard/products',
  },
  {
    emoji: '🚀',
    title: 'Vous etes pret !',
    description: "Votre essai gratuit inclut 30 actions IA. Commencez par connecter votre boutique Shopify pour debloquer toutes les fonctionnalites.",
    ctaLabel: 'Acceder au tableau de bord',
    navigateTo: '/dashboard',
  },
]

export function OnboardingTour() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss(completed = false) {
    localStorage.setItem(STORAGE_KEY, completed ? 'done' : 'skipped')
    setVisible(false)
  }

  function handleCta() {
    const current = TOUR_STEPS[step]
    if (step < TOUR_STEPS.length - 1) {
      if (current.navigateTo) {
        router.push(current.navigateTo)
      }
      setStep(s => s + 1)
    } else {
      if (current.navigateTo) {
        router.push(current.navigateTo)
      }
      dismiss(true)
    }
  }

  function prev() {
    setStep(s => Math.max(0, s - 1))
  }

  if (!visible) return null

  const current = TOUR_STEPS[step]
  const isFirst = step === 0
  const isLast = step === TOUR_STEPS.length - 1
  const progress = ((step) / (TOUR_STEPS.length - 1)) * 100

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90, backdropFilter: 'blur(4px)' }}
        onClick={() => dismiss(false)}
      />
      <div style={{ position: 'fixed', zIndex: 100, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <div style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: 440,
          background: '#111827',
          border: '1px solid #1e2d45',
          borderRadius: 20,
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #1e2d45' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles style={{ width: 18, height: 18, color: '#4f8ef7' }} />
              <span style={{ color: '#8b9fc4', fontSize: 13, fontWeight: 600 }}>Guide de demarrage • Etape {step + 1}/{TOUR_STEPS.length}</span>
            </div>
            <button
              onClick={() => dismiss(false)}
              style={{ padding: 6, color: '#4a5878', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseOver={e => (e.currentTarget.style.color = '#f0f4ff')}
              onMouseOut={e => (e.currentTarget.style.color = '#4a5878')}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: '#1a2234' }}>
            <div style={{ height: '100%', background: '#4f8ef7', width: `${progress}%`, transition: 'width 0.3s ease', borderRadius: '0 2px 2px 0' }} />
          </div>

          {/* Body */}
          <div style={{ padding: '28px 24px 20px' }}>
            <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>{current.emoji}</div>
            <h3 style={{ color: '#f0f4ff', fontWeight: 900, fontSize: 20, marginBottom: 12, lineHeight: 1.3, textAlign: 'center' }}>{current.title}</h3>
            <p style={{ color: '#8b9fc4', lineHeight: 1.7, fontSize: 14, textAlign: 'center' }}>{current.description}</p>
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 4 }}>
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  borderRadius: 999,
                  transition: 'all 0.2s',
                  background: i === step ? '#4f8ef7' : i < step ? 'rgba(79,142,247,0.4)' : '#1a2234',
                  width: i === step ? 24 : 8,
                  height: 8,
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid #1e2d45' }}>
            <button
              onClick={() => dismiss(false)}
              style={{ color: '#4a5878', fontSize: 13, fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseOver={e => (e.currentTarget.style.color = '#8b9fc4')}
              onMouseOut={e => (e.currentTarget.style.color = '#4a5878')}
            >
              Passer le guide
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isFirst && (
                <button
                  onClick={prev}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', background: '#1a2234', border: '1px solid #1e2d45',
                    color: '#8b9fc4', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#253552'; e.currentTarget.style.color = '#f0f4ff' }}
                  onMouseOut={e => { e.currentTarget.style.background = '#1a2234'; e.currentTarget.style.color = '#8b9fc4' }}
                >
                  <ArrowLeft style={{ width: 14, height: 14 }} />
                  Retour
                </button>
              )}
              <button
                onClick={handleCta}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 18px', background: '#4f8ef7', border: 'none',
                  color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(79,142,247,0.3)',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#3b82f6')}
                onMouseOut={e => (e.currentTarget.style.background = '#4f8ef7')}
              >
                {current.ctaLabel}
                {!isLast && <ArrowRight style={{ width: 14, height: 14 }} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
