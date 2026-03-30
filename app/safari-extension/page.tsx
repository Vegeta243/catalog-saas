import Link from 'next/link'

export default function SafariExtensionPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧩</div>
        <h1 style={{ color: '#0f172a', fontSize: '22px', fontWeight: 800, margin: '0 0 10px' }}>Extension Safari</h1>
        <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6, margin: '0 0 24px' }}>
          Extension Safari — Bientôt disponible.<br />
          En attendant, utilisez l&apos;installation depuis Safari sur votre iPhone ou iPad.
        </p>
        <Link href="/download" style={{ display: 'inline-block', padding: '12px 24px', background: '#2563eb', color: '#fff', textDecoration: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}>
          ← Voir le guide d&apos;installation iOS
        </Link>
      </div>
    </div>
  )
}
