'use client'
import { useState, useEffect } from 'react'

const APK_URL =
  'https://github.com/Vegeta243/catalog-saas/releases/latest/download/EcomPilotElite-v1.0.apk'

export default function DownloadPage() {
  const [os, setOs] = useState<'android' | 'ios' | 'desktop' | null>(null)

  useEffect(() => {
    document.title = 'Télécharger EcomPilot Elite'
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('android')) setOs('android')
    else if (ua.includes('iphone') || ua.includes('ipad')) setOs('ios')
    else setOs('desktop')
  }, [])

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">

        {/* Logo */}
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-black text-3xl">E</span>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">
          EcomPilot Elite
        </h1>
        <p className="text-slate-400 mb-10">
          L&apos;IA qui optimise votre boutique Shopify
        </p>

        {/* Android detected */}
        {os === 'android' && (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6">
              <p className="text-green-400 text-sm font-semibold">
                📱 Android détecté — téléchargement direct disponible
              </p>
            </div>

            <a
              href={APK_URL}
              className="flex items-center justify-center gap-3 w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-2xl text-lg transition-all hover:scale-105"
              download="EcomPilotElite.apk">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger l&apos;APK Android
            </a>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left">
              <p className="text-white font-bold text-sm mb-3">
                📋 Instructions d&apos;installation :
              </p>
              <ol className="space-y-2 text-slate-400 text-sm">
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  Téléchargez le fichier APK ci-dessus
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">2.</span>
                  Ouvrez <strong className="text-slate-300">Paramètres → Sécurité</strong>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">3.</span>
                  Activez &quot;Sources inconnues&quot; ou &quot;Installer des apps inconnues&quot;
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">4.</span>
                  Ouvrez le fichier APK depuis vos Téléchargements
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400 font-bold">5.</span>
                  Appuyez sur &quot;Installer&quot;
                </li>
              </ol>
            </div>

            <p className="text-slate-600 text-xs mt-4">
              Bientôt disponible sur Google Play Store
            </p>
          </div>
        )}

        {/* iOS detected */}
        {os === 'ios' && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 mb-6">
              <p className="text-blue-400 text-sm font-semibold">
                🍎 iPhone/iPad détecté
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-white font-bold mb-3">
                App iOS bientôt disponible
              </p>
              <p className="text-slate-400 text-sm mb-6">
                En attendant, utilisez la version web directement dans Safari — elle fonctionne comme une vraie app !
              </p>
              <a
                href="https://www.ecompilotelite.com"
                className="block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl transition-colors">
                Ouvrir dans Safari →
              </a>
              <p className="text-slate-600 text-xs mt-3">
                Puis appuyez sur Partager → Ajouter à l&apos;écran d&apos;accueil
              </p>
            </div>
          </div>
        )}

        {/* Desktop */}
        {os === 'desktop' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <a
                href={APK_URL}
                className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-800 hover:border-green-500/50 rounded-2xl transition-all"
                download="EcomPilotElite.apk">
                <span className="text-3xl">🤖</span>
                <span className="text-white font-bold text-sm">Android APK</span>
                <span className="text-slate-500 text-xs">Installation directe</span>
              </a>

              <a
                href="https://www.ecompilotelite.com/dashboard"
                className="flex flex-col items-center gap-2 p-4 bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl transition-all">
                <span className="text-3xl">🌐</span>
                <span className="text-white font-bold text-sm">Version Web</span>
                <span className="text-slate-500 text-xs">Tous les appareils</span>
              </a>
            </div>

            <p className="text-slate-600 text-xs">
              App Store iOS disponible prochainement
            </p>
          </div>
        )}

        {/* Loading state */}
        {os === null && (
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* PWA install hint */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-slate-500 text-xs">
            Vous pouvez aussi installer EcomPilot Elite comme une app depuis votre navigateur Chrome ou Safari →
            &quot;Ajouter à l&apos;écran d&apos;accueil&quot;
          </p>
        </div>

      </div>
    </div>
  )
}
