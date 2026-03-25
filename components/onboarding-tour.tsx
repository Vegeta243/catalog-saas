'use client'
import { useState, useEffect } from 'react'
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

const TOUR_STEPS = [
  {
    title: 'Bienvenue sur EcomPilot Elite !',
    description: "Votre assistant IA pour optimiser votre boutique Shopify. Laissez-nous vous montrer les fonctionnalites cles en 30 secondes.",
  },
  {
    title: 'Connectez votre boutique',
    description: "Commencez par connecter votre boutique Shopify. Tous vos produits seront synchronises automatiquement.",
  },
  {
    title: 'Optimisation IA',
    description: "Generez des titres et descriptions optimises SEO pour vos produits en 1 clic grace a l'IA.",
  },
  {
    title: 'Import de produits',
    description: "Importez des produits depuis AliExpress, CJDropshipping, DHgate et plus encore directement dans votre boutique.",
  },
  {
    title: 'Modifier en masse',
    description: "Editez les prix, titres et descriptions de centaines de produits simultanement.",
  },
  {
    title: 'Vous etes pret !',
    description: "Votre essai gratuit inclut 30 actions IA. Commencez par connecter votre boutique Shopify.",
  },
]

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem('onboarding_tour_done')
    const skipped = localStorage.getItem('onboarding_tour_skipped')
    if (!done && !skipped) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss(completed = false) {
    if (completed) {
      localStorage.setItem('onboarding_tour_done', 'true')
    } else {
      localStorage.setItem('onboarding_tour_skipped', 'true')
    }
    setVisible(false)
  }

  function next() {
    if (step < TOUR_STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
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

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[90] backdrop-blur-sm"
        onClick={() => dismiss(false)}
      />
      <div className="fixed z-[100] inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#334155]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-slate-400 text-sm font-semibold">Guide de demarrage</span>
            </div>
            <button
              onClick={() => dismiss(false)}
              className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            <h3 className="text-white font-black text-xl mb-3">{current.title}</h3>
            <p className="text-slate-400 leading-relaxed">{current.description}</p>
          </div>

          <div className="flex items-center justify-center gap-2 px-6 pb-2">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === step
                    ? 'w-6 h-2 bg-blue-500'
                    : i < step
                    ? 'w-2 h-2 bg-blue-500/40'
                    : 'w-2 h-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between p-5 border-t border-[#334155]">
            <button
              onClick={() => dismiss(false)}
              className="text-slate-500 hover:text-slate-300 text-sm transition-colors font-semibold"
            >
              Passer le guide
            </button>
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={prev}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Precedent
                </button>
              )}
              <button
                onClick={next}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-black transition-colors"
              >
                {isLast ? 'Commencer !' : 'Suivant'}
                {!isLast && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
