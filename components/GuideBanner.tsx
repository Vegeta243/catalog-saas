'use client'

export default function GuideBanner({
  visible,
  icon,
  title,
  text,
  onClose,
}: {
  visible: boolean
  icon: string
  title: string
  text: string
  onClose: () => void
}) {
  if (!visible) return null

  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderLeft: '4px solid #2563eb',
      borderRadius: '10px',
      padding: '16px 20px',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '8px',
        background: '#eff6ff', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0, fontSize: '16px', color: '#0f172a',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
          {text}
        </div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#94a3b8', fontSize: '18px', padding: '0 4px', flexShrink: 0, lineHeight: 1,
        }}
      >×</button>
    </div>
  )
}