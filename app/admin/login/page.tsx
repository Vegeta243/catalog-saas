'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/admin')
        router.refresh()
      } else {
        setError('Email ou mot de passe incorrect')
        setLoading(false)
      }
    } catch {
      setError('Erreur réseau, réessayez')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030712' }}>
      <div className="w-full max-w-sm rounded-2xl border p-8" style={{ backgroundColor: '#111827', borderColor: '#7f1d1d' }}>
        <div className="text-center mb-8">
          <img src="/logo-icon.svg" alt="EcomPilot Elite" className="w-12 h-12 object-contain mx-auto mb-3" style={{ filter: 'brightness(0) invert(1)' }} />
          <h1 className="text-xl font-bold" style={{ color: '#fff' }}>Administration</h1>
          <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>EcomPilot Elite</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>Identifiant</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
              style={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
              placeholder="Identifiant ou email admin"
              required
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: '#9ca3af' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none"
              style={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
              placeholder="••••••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ color: '#fca5a5', backgroundColor: '#450a0a' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: loading ? '#991b1b' : '#b91c1c', color: '#fff' }}
          >
            {loading ? 'Connexion...' : "Accéder à l'administration →"}
          </button>
        </form>

        <p className="text-center mt-6">
          <a href="/dashboard" className="text-xs hover:underline" style={{ color: '#4b5563' }}>
            ← Retour au dashboard
          </a>
        </p>
      </div>
    </div>
  )
}
