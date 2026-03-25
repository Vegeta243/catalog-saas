'use client'
import { useEffect, useState } from 'react'

export function DemoVideo() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/admin/demo-video')
      .then((r) => r.json())
      .then((d) => {
        setVideoUrl(d.url || null)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded) {
    return (
      <div className="w-full max-w-4xl mx-auto aspect-video bg-slate-900 rounded-2xl animate-pulse border border-slate-800" />
    )
  }

  if (videoUrl) {
    return (
      <div className="w-full max-w-4xl mx-auto rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-blue-500/10">
        <video
          src={videoUrl}
          controls
          autoPlay
          muted
          loop
          playsInline
          className="w-full"
          style={{ display: 'block' }}
        />
      </div>
    )
  }

  return (
    <div
      className="w-full max-w-4xl mx-auto aspect-video rounded-2xl border border-gray-200 flex items-center justify-center shadow-2xl shadow-gray-400/20 cursor-pointer group"
      style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}
    >
      <div className="text-center px-6">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg"
          style={{ backgroundColor: '#3b82f6' }}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-9 h-9 translate-x-0.5">
            <polygon points="5,3 19,12 5,21" />
          </svg>
        </div>
        <p className="text-2xl font-bold mb-2" style={{ color: '#fff' }}>
          Voir la démo en 90 secondes →
        </p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Découvrez comment optimiser votre catalogue en quelques clics
        </p>
      </div>
      <div
        className="absolute bottom-4 right-4 text-xs px-3 py-1.5 rounded-full font-semibold"
        style={{ backgroundColor: 'rgba(59,130,246,0.9)', color: '#fff' }}
      >
        Essayer gratuitement →
      </div>
    </div>
  )
}
