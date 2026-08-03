'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
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
            <div style={{ fontSize: 40, marginBottom: 12 }}>&#9993;</div>
            <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Check your email</p>
            <p style={{ fontSize: 14, color: '#666' }}>We sent a magic link to <strong>{email}</strong></p>
          </div>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#333', marginBottom: 6 }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email && handleLogin()}
              placeholder="you@vitalishealthcare.com"
              style={{
                width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #ddd',
                borderRadius: 8, outline: 'none', boxSizing: 'border-box', marginBottom: 16,
              }}
            />
            {error && <p style={{ fontSize: 13, color: '#c00', marginBottom: 12 }}>{error}</p>}
            <button
              onClick={handleLogin}
              disabled={!email || loading}
              style={{
                width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 500,
                background: email && !loading ? '#2D5A1B' : '#ccc', color: '#fff',
                border: 'none', borderRadius: 8, cursor: email && !loading ? 'pointer' : 'default',
              }}
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
