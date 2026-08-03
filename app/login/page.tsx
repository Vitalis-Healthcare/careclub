'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handlePassword = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: e } = await supabase.auth.signInWithPassword({ email, password })
    if (e) { setError(e.message); setLoading(false) } else { router.push('/dashboard') }
  }

  const handleMagic = async () => {
    setLoading(true); setError('')
    const supabase = createClient()
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (e) { setError(e.message); setLoading(false) } else { setSent(true); setLoading(false) }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #ddd',
    borderRadius: 8, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 16,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f4' }}>
      <div style={{ width: 400, background: '#fff', borderRadius: 12, padding: '48px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#2D5A1B', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 600 }}>CC</div>
          <span style={{ fontSize: 18, fontWeight: 600, color: '#2D5A1B' }}>Care Club</span>
        </div>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 32 }}>Vitalis Healthcare Services</p>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Check your email</p>
            <p style={{ fontSize: 14, color: '#666' }}>We sent a magic link to <strong>{email}</strong></p>
          </div>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 6 }}>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@vitalishealthcare.com" style={inputStyle} />

            {mode === 'password' && (
              <>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 6 }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && email && password && handlePassword()}
                  placeholder="Enter your password" style={inputStyle} />
              </>
            )}

            {error && <p style={{ fontSize: 13, color: '#c00', marginBottom: 12 }}>{error}</p>}

            {mode === 'password' ? (
              <>
                <button onClick={handlePassword} disabled={!email || !password || loading}
                  style={{ width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 500,
                    background: email && password && !loading ? '#2D5A1B' : '#ccc', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: email && password && !loading ? 'pointer' : 'default' }}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <button onClick={() => { setMode('magic'); setError('') }}
                  style={{ width: '100%', padding: '10px 0', fontSize: 13, marginTop: 12,
                    background: 'transparent', color: '#2D5A1B', border: 'none', cursor: 'pointer' }}>
                  Email me a magic link instead
                </button>
              </>
            ) : (
              <>
                <button onClick={handleMagic} disabled={!email || loading}
                  style={{ width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 500,
                    background: email && !loading ? '#2D5A1B' : '#ccc', color: '#fff',
                    border: 'none', borderRadius: 8, cursor: email && !loading ? 'pointer' : 'default' }}>
                  {loading ? 'Sending...' : 'Send magic link'}
                </button>
                <button onClick={() => { setMode('password'); setError('') }}
                  style={{ width: '100%', padding: '10px 0', fontSize: 13, marginTop: 12,
                    background: 'transparent', color: '#2D5A1B', border: 'none', cursor: 'pointer' }}>
                  Sign in with password instead
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
