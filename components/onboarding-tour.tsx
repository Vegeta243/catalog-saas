'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ArrowLeft, Sparkles, MousePointerClick } from 'lucide-react'

const STORAGE_KEY = 'ecompilot_tour_v3'

const TOUR_STEPS = [
  {
    emoji: '👋',
    title: 'Bienvenue sur EcomPilot Elite !',
    description: "Votre assistant IA pour optimiser votre boutique Shopify. Laissez-nous vous montrer les fonctionnalités clés en 30 secondes.",
    ctaLabel: 'Commencer le guide',
    navigateTo: null as string | null,
    tryLabel: null as string | null,
  },
  {
    emoji: '🏪',
    title: 'Connectez votre boutique',
    description: "Commencez par connecter votre boutique Shopify. Tous vos produits seront synchronisés automatiquement et vous pourrez les gérer depuis EcomPilot.",
    ctaLabel: 'Suivant →',
    navigateTo: '/dashboard/shops',
    tryLabel: 'Explorer la page',
  },
  {
    emoji: '🛒',
    title: 'Importez des produits',
    description: "Importez des produits depuis AliExpress, CJDropshipping, DHgate et plus encore directement dans votre boutique en quelques secondes.",
    ctaLabel: 'Suivant →',
    navigateTo: '/dashboard/import',
    tryLabel: 'Explorer la page',
  },
  {
    emoji: '✨',
    title: 'Optimisation IA',
    description: "Générez des titres et descriptions optimisés SEO pour vos produits en 1 clic grâce à l'IA. Augmentez votre visibilité sur Google.",
    ctaLabel: 'Suivant →',
    navigateTo: '/dashboard/ai',
    tryLabel: 'Explorer la page',
  },
  {
    emoji: '📦',
    title: 'Modifier en masse',
    description: "Éditez les prix, titres et descriptions de centaines de produits simultanément. Un seul clic pour appliquer des changements globaux.",
    ctaLabel: 'Suivant →',
    navigateTo: '/dashboard/products',
    tryLabel: 'Explorer la page',
  },
  {
    emoji: '🚀',
    title: 'Vous êtes prêt !',
    description: "Votre essai gratuit inclut 100 actions IA. Commencez par connecter votre boutique Shopify pour débloquer toutes les fonctionnalités.",
    ctaLabel: 'Accéder au tableau de bord',
    navigateTo: '/dashboard',
    tryLabel: null,
  },
]

const EXPLORE_DURATION = 12 // seconds

export function OnboardingTour() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [exploring, setExploring] = useState(false)
  const [countdown, setCountdown] = useState(EXPLORE_DURATION)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  const stopExploring = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current)
    setExploring(false)
    setCountdown(EXPLORE_DURATION)
  }, [])

  function dismiss(completed = false) {
    stopExploring()
    localStorage.setItem(STORAGE_KEY, completed ? 'done' : 'skipped')
    setVisible(false)
  }

  function handleExplore() {
    const current = TOUR_STEPS[step]
    if (current.navigateTo) router.push(current.navigateTo)
    setExploring(true)
    setCountdown(EXPLORE_DURATION)
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          stopExploring()
          if (step < TOUR_STEPS.length - 1) setStep(s => s + 1)
          return EXPLORE_DURATION
        }
        return c - 1
      })
    }, 1000)
  }

  function handleExploreDone() {
    stopExploring()
    if (step < TOUR_STEPS.length - 1) setStep(s => s + 1)
  }

  function handleCta() {
    const current = TOUR_STEPS[step]
    if (step < TOUR_STEPS.length - 1) {
      if (current.navigateTo) router.push(current.navigateTo)
      setStep(s => s + 1)
    } else {
      if (current.navigateTo) router.push(current.navigateTo)
      dismiss(true)
    }
  }

  function prev() {
    stopExploring()
    setStep(s => Math.max(0, s - 1))
  }

  // Intercept form submissions during explore mode
  useEffect(() => {
    if (!exploring) return
    function handleSubmit(e: Event) {
      e.preventDefault()
    }
    document.addEventListener('submit', handleSubmit)
    return () => document.removeEventListener('submit', handleSubmit)
  }, [exploring])

  if (!visible) return null

  const current = TOUR_STEPS[step]
  const isFirst = step === 0
  const isLast = step === TOUR_STEPS.length - 1
  const progress = (step / (TOUR_STEPS.length - 1)) * 100

  // Explore mode: minimized floating chip
  if (exploring) {
    return (
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        background: '#111827', border: '1px solid #1e2d45',
        borderRadius: 16, padding: '12px 16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: 10, minWidth: 240,
      }}>
        <MousePointerClick style={{ width: 18, height: 18, color: '#4f8ef7', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: '#f0f4ff', fontSize: 12, fontWeight: 700, margin: 0 }}>
            Explorez librement
          </p>
          <p style={{ color: '#8b9fc4', fontSize: 11, margin: 0 }}>
            Reprise dans <span style={{ color: '#4f8ef7', fontWeight: 700 }}>{countdown}s</span>
          </p>
        </div>
        <button
          onClick={handleExploreDone}
          style={{
            padding: '5px 12px', background: '#4f8ef7', border: 'none',
            color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          Continuer →
        </button>
        <button
          onClick={() => dismiss(false)}
          style={{ padding: 4, color: '#4a5878', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    )
  }

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
              <span style={{ color: '#8b9fc4', fontSize: 13, fontWeight: 600 }}>Guide de démarrage • Étape {step + 1}/{TOUR_STEPS.length}</span>
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
                onClick={() => { stopExploring(); setStep(i) }}
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
              {current.tryLabel && (
                <button
                  onClick={handleExplore}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', background: '#1a2234', border: '1px solid #2d4a7a',
                    color: '#4f8ef7', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = '#1e3a5f' }}
                  onMouseOut={e => { e.currentTarget.style.background = '#1a2234' }}
                >
                  <MousePointerClick style={{ width: 14, height: 14 }} />
                  {current.tryLabel}
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

export function TourLauncher({ className }: { className?: string }) {
  function restart() {
    localStorage.removeItem(STORAGE_KEY)
    window.location.reload()
  }
  return (
    <button
      onClick={restart}
      className={className}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', background: '#4f8ef7', border: 'none',
        color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700,
        cursor: 'pointer', boxShadow: '0 4px 15px rgba(79,142,247,0.2)',
      }}
    >
      <Sparkles style={{ width: 14, height: 14 }} />
      Reprendre le guide
    </button>
  )
}
