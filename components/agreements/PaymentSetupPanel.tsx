'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import type { Stripe as StripeJs } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'

// Step 2 of the signing flow: save the member's payment card. Rendered only
// when the agreement is signed and no card is on file. The card is SAVED via
// a SetupIntent — it is never charged here. Wrapper styles consume the design
// tokens (the page pins them light); the Stripe `appearance` object must carry
// literal values because Elements render inside Stripe's iframe where our CSS
// variables cannot reach — the values are the LIGHT_PIN palette's, and if the
// light palette in app/layout.tsx ever changes, update these in the same ship.

const STRIPE_APPEARANCE = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#5E9420',
    colorText: '#1D2A22',
    colorTextSecondary: '#64705F',
    colorBackground: '#FFFFFF',
    colorDanger: '#B05246',
    borderRadius: '10px',
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
}

function CardForm({ token, onSaved }: { token: string; onSaved: (brand: string | null, last4: string | null) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!stripe || !elements) return
    setError('')
    setBusy(true)
    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href.split('?')[0] },
        redirect: 'if_required',
      })
      if (result.error) {
        setError(result.error.message || 'The card could not be saved. Please check the details and try again.')
        setBusy(false)
        return
      }
      const setupIntentId = result.setupIntent?.id
      if (!setupIntentId) {
        setError('The card setup did not complete. Please try again.')
        setBusy(false)
        return
      }
      const res = await fetch(`/api/sign/${token}/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup_intent_id: setupIntentId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'The card was accepted but could not be recorded. Please contact Vitalis.')
        setBusy(false)
        return
      }
      onSaved(data.brand || null, data.last4 || null)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <div>
      <PaymentElement />
      {error && <p style={{ fontSize: 13.5, color: 'var(--red)', margin: '14px 0 0' }}>{error}</p>}
      <button
        onClick={handleSave}
        disabled={busy || !stripe || !elements}
        style={{
          width: '100%',
          marginTop: 18,
          padding: '15px 0',
          fontSize: 15.5,
          fontWeight: 700,
          fontFamily: 'inherit',
          background: busy ? 'var(--border)' : 'var(--green-bright)',
          color: busy ? 'var(--text-faint)' : 'var(--on-accent)',
          border: 'none',
          borderRadius: 10,
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Saving your card…' : 'Save your card'}
      </button>
      <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '12px 0 0', textAlign: 'center' }}>
        Your card is saved securely with Stripe and is not charged today. The first charge happens only
        when your start of care date is confirmed.
      </p>
    </div>
  )
}

export default function PaymentSetupPanel({
  token,
  publishableKey,
}: {
  token: string
  publishableKey: string
}) {
  const router = useRouter()
  const [clientSecret, setClientSecret] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<{ brand: string | null; last4: string | null } | null>(null)
  const startedRef = useRef(false)

  const stripePromise: Promise<StripeJs | null> = useMemo(() => loadStripe(publishableKey), [publishableKey])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      // Returning from a redirect-based confirmation: record the card directly.
      const qs = new URLSearchParams(window.location.search)
      const returnedSetupIntent = qs.get('setup_intent')
      const redirectStatus = qs.get('redirect_status')
      if (returnedSetupIntent && redirectStatus === 'succeeded') {
        try {
          const res = await fetch(`/api/sign/${token}/card`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setup_intent_id: returnedSetupIntent }),
          })
          const data = await res.json()
          if (res.ok) {
            setSaved({ brand: data.brand || null, last4: data.last4 || null })
            router.refresh()
            return
          }
        } catch {
          // Fall through to a fresh setup below.
        }
      }

      try {
        const res = await fetch(`/api/sign/${token}/setup`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Could not start the card setup.')
          return
        }
        setClientSecret(data.client_secret || '')
      } catch {
        setError('Could not reach the server. Refresh the page to try again.')
      }
    }
    run()
  }, [token, router])

  const handleSaved = (brand: string | null, last4: string | null) => {
    setSaved({ brand, last4 })
    router.refresh()
  }

  return (
    <div
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '24px 26px',
        marginBottom: 28,
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--green-bright)', fontWeight: 700, marginBottom: 6 }}>
        One step remains
      </div>
      <h2 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>
        Save your payment card
      </h2>

      {saved ? (
        <div
          style={{
            background: 'var(--green-glow)',
            border: '1px solid var(--green-bright)',
            borderRadius: 10,
            padding: '14px 18px',
            fontSize: 13.5,
            color: 'var(--green-dark)',
            fontWeight: 600,
          }}
        >
          Card on file{saved.brand && saved.last4 ? ` — ${saved.brand.toUpperCase()} \u2022\u2022\u2022\u2022 ${saved.last4}` : ''}. Thank you.
          A Vitalis nurse will call you to schedule your initial in-home assessment.
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--text-dim)', margin: '0 0 18px' }}>
            Your membership agreement is signed. To complete your enrollment, save the card your
            membership will be billed to. It is not charged today.
          </p>
          {error ? (
            <p style={{ fontSize: 13.5, color: 'var(--red)', margin: 0 }}>{error}</p>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: STRIPE_APPEARANCE }}>
              <CardForm token={token} onSaved={handleSaved} />
            </Elements>
          ) : (
            <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>Preparing the secure card form…</p>
          )}
        </>
      )}
    </div>
  )
}
