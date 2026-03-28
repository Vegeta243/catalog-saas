import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0f1e 0%, #111827 50%, #0a0f1e 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '32px',
        }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '36px', fontWeight: 900, color: 'white',
          }}>E</div>
          <span style={{ color: '#0f172a', fontSize: '32px', fontWeight: 900 }}>
            EcomPilot Elite
          </span>
        </div>

        <h1 style={{
          color: '#0f172a',
          fontSize: '56px',
          fontWeight: 900,
          textAlign: 'center',
          margin: '0 0 16px',
          lineHeight: 1.2,
          maxWidth: '900px',
        }}>
          L&apos;IA qui optimise votre
          <span style={{ color: '#4f8ef7' }}> boutique Shopify</span>
        </h1>

        <p style={{
          color: '#475569',
          fontSize: '28px',
          textAlign: 'center',
          margin: '0 0 40px',
        }}>
          Fiches SEO · Import AliExpress · Prix en masse
        </p>

        <div style={{
          background: '#4f8ef7',
          color: 'white',
          padding: '16px 40px',
          borderRadius: '12px',
          fontSize: '22px',
          fontWeight: 800,
        }}>
          100 actions gratuites — Sans CB
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
