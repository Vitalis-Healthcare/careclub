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
    try {
      const res = await fetch('/api/auth/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Could not send the link. Please try again.')
        setLoading(false)
        return
      }
      setSent(true); setLoading(false)
    } catch {
      setError('Could not send the link. Please try again.')
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '11px 13px',
    fontSize: 14,
    fontFamily: 'inherit',
    background: 'var(--surface-raised)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: 16,
  }

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
    color: 'var(--text-faint)',
    marginBottom: 7,
  }

  const primaryEnabled = mode === 'password' ? Boolean(email && password && !loading) : Boolean(email && !loading)

  const primaryButtonStyle = {
    width: '100%',
    padding: '11px 0',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
    background: primaryEnabled ? 'var(--green-bright)' : 'var(--surface-raised)',
    color: primaryEnabled ? 'var(--on-accent)' : 'var(--text-faint)',
    border: 'none',
    borderRadius: 8,
    cursor: primaryEnabled ? 'pointer' : 'default',
  }

  const secondaryButtonStyle = {
    width: '100%',
    padding: '10px 0',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    marginTop: 12,
    background: 'transparent',
    color: 'var(--text-dim)',
    border: 'none',
    cursor: 'pointer',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 20,
      }}
    >
      <div
        style={{
          width: 400,
          maxWidth: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 14,
          padding: '48px 40px',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            fontWeight: 600,
          }}
        >
          Vitalis Healthcare
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 34,
            fontWeight: 600,
            color: 'var(--text)',
            marginTop: 2,
            marginBottom: 32,
          }}
        >
          Care <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--champagne)' }}>Club</em>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 8px' }}>
              Check your email
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>
              If <strong style={{ color: 'var(--text)' }}>{email}</strong> belongs to a team
              account, a sign-in link from Vitalis Care Club is on its way. It works once
              and expires after about an hour.
            </p>
          </div>
        ) : (
          <>
            <label style={labelStyle}>Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@vitalishealthcare.com" style={inputStyle} />

            {mode === 'password' && (
              <>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && email && password && handlePassword()}
                  placeholder="Enter your password" style={inputStyle} />
              </>
            )}

            {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</p>}

            {mode === 'password' ? (
              <>
                <button onClick={handlePassword} disabled={!email || !password || loading} style={primaryButtonStyle}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <button onClick={() => { setMode('magic'); setError('') }} style={secondaryButtonStyle}>
                  Email me a sign-in link instead
                </button>
              </>
            ) : (
              <>
                <button onClick={handleMagic} disabled={!email || loading} style={primaryButtonStyle}>
                  {loading ? 'Sending...' : 'Send sign-in link'}
                </button>
                <button onClick={() => { setMode('password'); setError('') }} style={secondaryButtonStyle}>
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
