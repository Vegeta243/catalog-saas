'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function DownloadPage() {
  const [os, setOs] = useState<'android' | 'ios' | 'desktop' | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    document.title = 'Télécharger EcomPilot Elite'
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('android')) setOs('android')
    else if (/iphone|ipad|ipod/.test(ua)) setOs('ios')
    else setOs('desktop')
  }, [])

  const handleDownload = () => {
    setDownloading(true)
    window.location.href = '/api/download/apk'
    setTimeout(() => setDownloading(false), 3000)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6">

      {/* Back to site */}
      <div className="fixed top-4 left-4">
        <Link href="/"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>
      </div>

      <div className="max-w-sm w-full">

        {/* App icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl flex items-center justify-center mb-4 shadow-2xl shadow-blue-500/30">
            <span className="text-white font-black text-4xl">E</span>
          </div>
          <h1 className="text-2xl font-black text-white">EcomPilot Elite</h1>
          <p className="text-slate-400 text-sm mt-1">Version 1.0 · 4.3 MB</p>
        </div>

        {/* Android */}
        {(os === 'android' || os === 'desktop') && (
          <div className="space-y-4">

            {os === 'android' && (
              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse flex-shrink-0" />
                <p className="text-blue-300 text-sm font-semibold">
                  Android détecté — prêt à installer
                </p>
              </div>
            )}

            {/* Download button */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full flex items-center justify-center gap-3 py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-70 text-white font-black rounded-2xl text-base transition-all hover:scale-105 shadow-lg shadow-blue-500/20 active:scale-95">
              {downloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Démarrage du téléchargement...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Télécharger l&apos;app Android
                </>
              )}
            </button>

            {/* Install steps */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-white font-bold text-sm mb-3">Comment installer :</p>
              <div className="space-y-3">
                {[
                  "Appuyez sur \"Télécharger l'app Android\"",
                  'Attendez la fin du téléchargement',
                  'Ouvrez le fichier .apk téléchargé',
                  'Si demandé → autoriser les sources inconnues',
                  'Appuyez sur "Installer"',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-black">{i + 1}</span>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* PWA alternative */}
            <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-4 text-center">
              <p className="text-slate-500 text-xs mb-2">Alternative sans installation</p>
              <Link href="/dashboard"
                className="text-blue-400 text-sm font-semibold hover:text-blue-300 transition-colors">
                Utiliser la version web →
              </Link>
            </div>
          </div>
        )}

        {/* iOS */}
        {os === 'ios' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-4">🍎</div>
              <h2 className="text-white font-black text-lg mb-2">App iOS — Bientôt</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                L&apos;app iOS est en cours de développement.
                En attendant, installez EcomPilot Elite directement depuis Safari.
              </p>

              {/* PWA install on iOS */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 text-left">
                <p className="text-blue-300 text-sm font-bold mb-2">Installer via Safari :</p>
                <ol className="space-y-1">
                  {[
                    "Ouvrez ce lien dans Safari",
                    "Appuyez sur l'icône Partager ↑",
                    "Sélectionnez \"Sur l'écran d'accueil\"",
                    'Appuyez sur "Ajouter"',
                  ].map((s, i) => (
                    <li key={i} className="text-slate-300 text-xs flex items-start gap-2">
                      <span className="text-blue-400 font-bold flex-shrink-0">{i + 1}.</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>

              <Link href="/dashboard"
                className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-colors text-sm">
                Ouvrir dans Safari →
              </Link>
            </div>
          </div>
        )}

        {/* Loading state */}
        {os === null && (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

      </div>
    </div>
  )
}
