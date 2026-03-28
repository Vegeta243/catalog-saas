'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ActionsCounter() {
  const [used, setUsed] = useState(0)
  const [limit, setLimit] = useState(100)
  const [showTip, setShowTip] = useState(false)
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('actions_used, actions_limit, plan').eq('id', user.id).single()
      if (data) {
        setUsed(data.actions_used || 0)
        setLimit(data.actions_limit || 100)
      }
    } catch { /* silent */ }
  }

  const remaining = Math.max(0, limit - used)
  const pct = limit > 0 ? (remaining / limit) * 100 : 0
  const barColor = pct > 50 ? '#16a34a' : pct > 20 ? '#d97706' : '#dc2626'
  const isLow = pct < 20

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => router.push('/pricing')}
        onMouseEnter={() => isLow && setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill={barColor}>
          <path d="M13 2L4.09 12.96A1 1 0 005 14.5h6V22l8.91-10.96A1 1 0 0019 9.5h-6V2z"/>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '80px' }}>
          <span style={{ color: '#0f172a', fontSize: '12px', fontWeight: 600, lineHeight: 1, whiteSpace: 'nowrap' }}>
            {remaining.toLocaleString('fr-FR')} actions
          </span>
          <div style={{ height: '3px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', width: '80px' }}>
            <div style={{ height: '100%', width: pct + '%', background: barColor, borderRadius: '2px', transition: 'width 0.3s', animation: isLow ? 'blink 1.5s ease-in-out infinite' : 'none' }} />
          </div>
        </div>
      </button>
      {showTip && isLow && (
        <div style={{ position: 'absolute', top: '110%', right: 0, background: '#0f172a', color: '#ffffff', fontSize: '12px', padding: '8px 12px', borderRadius: '8px', whiteSpace: 'nowrap', zIndex: 1000, lineHeight: 1.5, fontWeight: 400 }}>
          Passez au plan supérieur pour<br />continuer à optimiser votre catalogue
        </div>
      )}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
