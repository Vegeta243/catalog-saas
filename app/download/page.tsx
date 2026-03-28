'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const STEPS_ANDROID = [
  'Appuyez sur le bouton bleu ci-dessus',
  'Le fichier EcomPilotElite.apk se telecharge',
  'Ouvrez le fichier dans vos telechargements',
  'Autorisez les sources inconnues si demande',
  'Appuyez sur Installer - termine !',
]

export default function DownloadPage() {
  const [os, setOs] = useState<string>('loading')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    document.title = 'Telecharger EcomPilot Elite'
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('android')) setOs('android')
    else if (/iphone|ipad|ipod/.test(ua)) setOs('ios')
    else setOs('desktop')
  }, [])

  function handleDownload() {
    setDownloading(true)
    const link = document.createElement('a')
    link.href = '/api/download/apk'
    link.setAttribute('download', 'EcomPilotElite.apk')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => setDownloading(false), 4000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    }}>

      <div style={{ position: 'fixed', top: 16, left: 16 }}>
        <Link href="/" style={{
          color: "var(--text-tertiary)",
          textDecoration: 'none',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          &larr; Retour
        </Link>
      </div>

      <div style={{ maxWidth: '360px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '96px', height: '96px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            borderRadius: '24px',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 20px 40px rgba(59,130,246,0.3)'
          }}>
            <span style={{ color: 'white', fontWeight: '900', fontSize: '40px' }}>E</span>
          </div>
          <h1 style={{ color: '#ffffff', fontWeight: '900', fontSize: '24px', margin: '0 0 4px' }}>
            EcomPilot Elite
          </h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: '14px', margin: 0 }}>
            Version 1.0 &middot; Android &middot; 4.3 MB
          </p>
        </div>

        {os === 'loading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '32px', height: '32px',
              border: '2px solid #3b82f6',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              margin: '0 auto',
              animation: 'spin 0.8s linear infinite'
            }} />
          </div>
        )}

        {(os === 'android' || os === 'desktop') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {os === 'android' && (
              <div style={{
                backgroundColor: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.3)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '8px', height: '8px',
                  backgroundColor: '#3b82f6',
                  borderRadius: '50%'
                }} />
                <span style={{ color: '#1d4ed8', fontSize: '14px', fontWeight: '600' }}>
                  Android detecte - pret a installer
                </span>
              </div>
            )}

            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                width: '100%',
                padding: '18px',
                backgroundColor: downloading ? '#1d4ed8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                fontSize: '16px',
                fontWeight: '900',
                cursor: downloading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'background-color 0.2s',
                boxShadow: '0 8px 24px rgba(37,99,235,0.4)'
              }}>
              {downloading ? (
                <>
                  <div style={{
                    width: '20px', height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span style={{ color: '#ffffff' }}>Telechargement en cours...</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '20px', color: '#ffffff' }}>&#8659;</span>
                  <span style={{ color: '#ffffff' }}>Telecharger l&apos;app Android</span>
                </>
              )}
            </button>

            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px'
            }}>
              <p style={{ color: '#ffffff', fontWeight: '700', fontSize: '14px', margin: '0 0 16px' }}>
                Comment installer :
              </p>
              {STEPS_ANDROID.map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: i < STEPS_ANDROID.length - 1 ? '12px' : 0
                }}>
                  <div style={{
                    minWidth: '24px', height: '24px',
                    backgroundColor: '#2563eb',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: '900' }}>{i + 1}</span>
                  </div>
                  <p style={{ color: '#cbd5e1', fontSize: '14px', margin: 0, lineHeight: '1.5' }}>{step}</p>
                </div>
              ))}
            </div>

            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '14px 16px'
            }}>
              <p style={{ color: "var(--text-tertiary)", fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                <strong style={{ color: '#e2e8f0' }}>Google Play Protect ?</strong>
                <br />
                Normal pour une app hors Play Store.
                Appuyez sur &quot;Installer sans analyser&quot;
                ou &quot;Quand meme installer&quot;.
                L&apos;app est securisee.
              </p>
            </div>

            <div style={{ textAlign: 'center', paddingTop: '8px' }}>
              <p style={{ color: "var(--text-secondary)", fontSize: '12px', margin: '0 0 4px' }}>
                Pas d&apos;installation ? Utilisez la version web
              </p>
              <Link href="/dashboard" style={{
                color: '#3b82f6',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none'
              }}>
                Acceder au dashboard &rarr;
              </Link>
            </div>
          </div>
        )}

        {os === 'ios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '40px', margin: '0 0 12px' }}>&#127822;</p>
              <h2 style={{ color: '#ffffff', fontWeight: '900', fontSize: '18px', margin: '0 0 8px' }}>
                App iOS - Bientot disponible
              </h2>
              <p style={{ color: "var(--text-tertiary)", fontSize: '14px', lineHeight: '1.6', margin: '0 0 20px' }}>
                En attendant, accedez a EcomPilot Elite
                depuis Safari et installez-le sur votre
                ecran d&apos;accueil.
              </p>
              <div style={{
                backgroundColor: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '12px',
                padding: '14px',
                textAlign: 'left',
                marginBottom: '16px'
              }}>
                {[
                  "Ouvrez ce lien dans Safari",
                  "Appuyez sur l'icone Partager",
                  "Selectionnez Sur l'ecran d'accueil",
                  "Appuyez sur Ajouter",
                ].map((s, i) => (
                  <p key={i} style={{
                    color: '#cbd5e1',
                    fontSize: '13px',
                    margin: i < 3 ? '0 0 6px' : 0
                  }}>
                    <span style={{ color: '#60a5fa', fontWeight: '700' }}>{i + 1}.</span>
                    {' '}{s}
                  </p>
                ))}
              </div>
              <Link href="/dashboard" style={{
                display: 'block',
                padding: '14px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '12px',
                fontWeight: '900',
                fontSize: '14px'
              }}>
                Ouvrir EcomPilot Elite &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
