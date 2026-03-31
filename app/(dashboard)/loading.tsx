export default function DashboardLoading() {
  const block = (height: string, width = '100%') => ({
    height,
    width,
    borderRadius: '10px',
    background: '#f1f5f9',
    animation: 'pulse 1.5s ease-in-out infinite',
  })

  return (
    <div style={{ padding: '20px', maxWidth: '1240px', margin: '0 auto' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '240px', flex: '1 1 240px' }}>
          <div style={block('28px', '220px')} />
          <div style={{ marginTop: '10px', ...block('14px', '320px') }} />
        </div>
        <div style={{ ...block('42px', '200px'), maxWidth: '200px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
            <div style={block('14px', '55%')} />
            <div style={{ marginTop: '16px', ...block('26px', '40%') }} />
          </div>
        ))}
      </div>
    </div>
  )
}