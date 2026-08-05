'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// The landing for the Club sign-in link. Sign-in completes on the button
// press, not on the bare page load, so an email scanner following the link
// cannot consume the one-time token before the person does.

export default function ConfirmSignIn({ tokenHash }: { tokenHash: string }) {
  const router = useRouter()
  const [working, setWorking] = useState(false)
  const [failed, setFailed] = useState(false)

  const complete = async () => {
    setWorking(true)
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    })
    if (error) {
      setFailed(true)
      setWorking(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const invalid = !tokenHash || failed

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
          textAlign: 'center',
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
            marginBottom: 28,
          }}
        >
          Care <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--champagne)' }}>Club</em>
        </div>

        {invalid ? (
          <>
            <p style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 8px', color: 'var(--text)' }}>
              This link has expired
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '0 0 24px', lineHeight: 1.55 }}>
              Sign-in links work once and expire after about an hour.
              Request a fresh one from the staff entrance.
            </p>
            <a
              href="/login"
              style={{
                display: 'inline-block',
                width: '100%',
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                background: 'var(--green-bright)',
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: 8,
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <p style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 8px', color: 'var(--text)' }}>
              Sign in to the portal
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '0 0 24px', lineHeight: 1.55 }}>
              You followed a Club sign-in link. Continue below to open the portal.
            </p>
            <button
              onClick={complete}
              disabled={working}
              style={{
                width: '100%',
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                background: 'var(--green-bright)',
                color: 'var(--on-accent)',
                border: 'none',
                borderRadius: 8,
                cursor: working ? 'default' : 'pointer',
                opacity: working ? 0.7 : 1,
              }}
            >
              {working ? 'Signing you in\u2026' : 'Continue to the portal'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
