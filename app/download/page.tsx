'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function DownloadPage() {
  const [tab, setTab] = useState<'android' | 'ios'>('android')
  const [deferredPrompt, setDeferredPrompt] = useState<(Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }) | null>(null)
  const [installed, setInstalled] = useState(false)
  const [prompted, setPrompted] = useState(false)

  useEffect(() => {
    document.title = 'TÃ©lÃ©charger EcomPilot Elite'
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) setTab('ios')

    const handleInstallable = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> })
    }
    const handleInstalled = () => setInstalled(true)

    window.addEventListener('beforeinstallprompt', handleInstallable)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallable)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function installPWA() {
    if (!deferredPrompt) {
      setPrompted(true)
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  const tabBtn = (id: 'android' | 'ios', label: string) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1, padding: '10px',
        background: tab === id ? '#2563eb' : 'transparent',
        color: tab === id ? '#fff' : '#64748b',
        border: 'none', borderRadius: '8px',
        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#f8fafc',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      <div style={{ position: 'fixed', top: 16, left: 16 }}>
        <Link href="/" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px' }}>â† Retour</Link>
      </div>

      <div style={{ maxWidth: '400px', width: '100%' }}>
        {/* App icon + name */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '88px', height: '88px',
            background: 'linear-gradient(135deg, #2563eb, #06b6d4)',
            borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', boxShadow: '0 12px 32px rgba(37,99,235,0.25)',
          }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: '38px' }}>E</span>
          </div>
          <h1 style={{ color: '#0f172a', fontWeight: 800, fontSize: '22px', margin: '0 0 4px' }}>EcomPilot Elite</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Optimisation catalogue Shopify par IA</p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '10px', padding: '4px', marginBottom: '20px' }}>
          {tabBtn('android', 'ðŸ“± Android / PWA')}
          {tabBtn('ios', 'ðŸŽ iOS (Safari)')}
        </div>

        {/* Android / PWA tab */}
        {tab === 'android' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {installed ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', margin: '0 0 8px' }}>âœ…</p>
                <p style={{ color: '#15803d', fontSize: '15px', fontWeight: 700, margin: '0 0 4px' }}>Application installÃ©e !</p>
                <p style={{ color: '#166534', fontSize: '13px', margin: 0 }}>Retrouvez EcomPilot Elite sur votre Ã©cran d&apos;accueil.</p>
              </div>
            ) : (
              <div>
                <button onClick={installPWA} style={{
                  width: '100%', padding: '16px', background: '#2563eb', color: '#fff',
                  border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 800,
                  cursor: 'pointer', boxShadow: '0 6px 20px rgba(37,99,235,0.35)', marginBottom: '12px',
                }}>
                  {deferredPrompt ? 'â¬‡ Installer l\'application' : 'â¬‡ Installer sur l\'Ã©cran d\'accueil'}
                </button>
                {prompted && !deferredPrompt && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                    <p style={{ color: '#92400e', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                      <strong>Installation manuelle :</strong><br />
                      Menu â‹® (3 points) â†’ &quot;Ajouter Ã  l&apos;Ã©cran d&apos;accueil&quot; ou &quot;Installer l&apos;application&quot;
                    </p>
                  </div>
                )}
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px' }}>
              <p style={{ color: '#0f172a', fontWeight: 700, fontSize: '13px', margin: '0 0 14px' }}>Comment installer :</p>
              {[
                'Cliquez sur "Installer l\'application" ci-dessus',
                'Une invite s\'affiche â€” appuyez sur "Installer"',
                'L\'icÃ´ne EcomPilot apparaÃ®t sur votre Ã©cran d\'accueil',
                'Ouvrez l\'app â€” elle fonctionne comme une app native',
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 3 ? '10px' : 0 }}>
                  <div style={{ minWidth: '22px', height: '22px', background: '#2563eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: '11px', fontWeight: 800 }}>{i + 1}</span>
                  </div>
                  <p style={{ color: '#475569', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ color: '#1e40af', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                <strong>Pas d&apos;invite ?</strong> Essayez depuis Chrome ou Edge. Menu â‹® â†’ &quot;Installer l&apos;application&quot;.
              </p>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '4px' }}>
              <Link href="/dashboard" style={{ color: '#2563eb', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                Continuer dans le navigateur â†’
              </Link>
            </div>
          </div>
        )}

        {/* iOS tab */}
        {tab === 'ios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px' }}>
              <p style={{ color: '#0f172a', fontWeight: 700, fontSize: '14px', margin: '0 0 16px' }}>
                Installer depuis Safari en 4 Ã©tapes :
              </p>
              {[
                { icon: 'ðŸŒ', title: 'Ouvrez dans Safari', desc: 'Assurez-vous d\'utiliser Safari (pas Chrome ni Firefox)' },
                { icon: 'â¬†ï¸', title: 'Appuyez sur Partager', desc: 'L\'icÃ´ne carrÃ© avec une flÃ¨che vers le haut, en bas de l\'Ã©cran' },
                { icon: 'âž•', title: '"Sur l\'Ã©cran d\'accueil"', desc: 'Faites dÃ©filer dans le menu Partager et sÃ©lectionnez cette option' },
                { icon: 'âœ…', title: 'Tapez "Ajouter"', desc: 'Personnalisez le nom si souhaitÃ©, puis confirmez avec "Ajouter"' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: i < 3 ? '14px' : 0, paddingBottom: i < 3 ? '14px' : 0, borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                  <div style={{ fontSize: '22px', flexShrink: 0, lineHeight: 1 }}>{step.icon}</div>
                  <div>
                    <p style={{ color: '#0f172a', fontWeight: 700, fontSize: '13px', margin: '0 0 2px' }}>{i + 1}. {step.title}</p>
                    <p style={{ color: '#64748b', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px 14px' }}>
              <p style={{ color: '#9a3412', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
                <strong>âš ï¸ Important :</strong> L&apos;installation sur l&apos;Ã©cran d&apos;accueil n&apos;est disponible que dans <strong>Safari</strong>. Elle ne fonctionne pas depuis Chrome ou Firefox sur iOS.
              </p>
            </div>

            <a href="/dashboard" style={{
              display: 'block', width: '100%', padding: '14px', background: '#0f172a',
              color: '#fff', textDecoration: 'none', borderRadius: '12px',
              fontWeight: 700, fontSize: '14px', textAlign: 'center', boxSizing: 'border-box',
            }}>
              Ouvrir EcomPilot Elite dans Safari â†’
            </a>

            <div style={{ textAlign: 'center' }}>
              <Link href="/safari-extension" style={{ color: '#94a3b8', fontSize: '12px', textDecoration: 'none' }}>
                Extension Safari â†’ En savoir plus
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
