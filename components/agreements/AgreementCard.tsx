'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export interface AgreementSummary {
  id: string
  status: 'sent' | 'viewed' | 'signed' | 'void'
  token: string
  version: number
  tier_name: string
  sent_at: string
  signed_at: string | null
  signer_name: string | null
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

export default function AgreementCard({
  clientId,
  agreement,
  memberHasEmail,
}: {
  clientId: string
  agreement: AgreementSummary | null
  memberHasEmail: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [signUrl, setSignUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const send = async () => {
    setBusy(true)
    setError('')
    setNote('')
    setSignUrl(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/agreement`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setBusy(false)
        return
      }
      setNote(data.email_note || 'Agreement created.')
      setSignUrl(data.sign_url || null)
      setBusy(false)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  const voidAgreement = async () => {
    if (!agreement) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/agreements/${agreement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'void' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setBusy(false)
        return
      }
      setNote('Agreement voided. Send a fresh one when ready.')
      setBusy(false)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy — select the link text and copy it manually.')
    }
  }

  const pill = () => {
    if (!agreement) return { label: 'Not sent', color: 'var(--text-faint)', bg: 'var(--surface-raised)' }
    if (agreement.status === 'signed') return { label: 'Signed', color: 'var(--green-bright)', bg: 'var(--green-glow)' }
    if (agreement.status === 'viewed') return { label: 'Viewed', color: 'var(--champagne)', bg: 'var(--champagne-glow)' }
    return { label: 'Sent', color: 'var(--amber)', bg: 'var(--amber-glow)' }
  }
  const p = pill()

  const smallButton = {
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    background: 'transparent',
    color: 'var(--text-dim)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
  } as const

  const liveUrl = agreement && agreement.status !== 'void' ? `/sign/${agreement.token}` : null

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        boxShadow: 'var(--shadow)',
        padding: '22px 26px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: 0 }}>
          Membership agreement
        </h2>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            padding: '3px 9px',
            borderRadius: 999,
            background: p.bg,
            color: p.color,
          }}
        >
          {p.label}
        </span>
      </div>

      {agreement ? (
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 14px' }}>
          {agreement.status === 'signed'
            ? `Signed by ${agreement.signer_name} on ${formatDate(agreement.signed_at)} · ${agreement.tier_name} · version ${agreement.version}.`
            : `Sent ${formatDate(agreement.sent_at)} · ${agreement.tier_name} · version ${agreement.version}. Awaiting signature.`}
        </p>
      ) : (
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 14px' }}>
          {memberHasEmail
            ? 'Send the membership agreement for review and signature.'
            : 'This member has no email on file — sending will produce a link to share by text or in person.'}
        </p>
      )}

      {note && <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 10px' }}>{note}</p>}
      {signUrl && (
        <div
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-soft)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 11.5,
            color: 'var(--text-dim)',
            wordBreak: 'break-all',
            marginBottom: 12,
          }}
        >
          {signUrl}
        </div>
      )}
      {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(!agreement || agreement.status === 'void') && (
          <button onClick={send} disabled={busy} style={{ ...smallButton, background: 'var(--green-bright)', color: 'var(--on-accent)', border: 'none' }}>
            {busy ? 'Sending…' : 'Send agreement'}
          </button>
        )}
        {agreement && (agreement.status === 'sent' || agreement.status === 'viewed') && (
          <>
            <button onClick={send} disabled={busy} style={smallButton}>
              {busy ? 'Working…' : 'Re-send (fresh link)'}
            </button>
            {liveUrl && (
              <button onClick={() => copyLink(window.location.origin + liveUrl)} disabled={busy} style={smallButton}>
                {copied ? 'Copied' : 'Copy signing link'}
              </button>
            )}
          </>
        )}
        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            style={{ ...smallButton, textDecoration: 'none', display: 'inline-block' }}
          >
            View
          </a>
        )}
        {agreement && agreement.status === 'signed' && (
          <button onClick={voidAgreement} disabled={busy} style={{ ...smallButton, color: 'var(--red)' }}>
            {busy ? 'Working…' : 'Void & allow re-send'}
          </button>
        )}
      </div>
    </div>
  )
}
