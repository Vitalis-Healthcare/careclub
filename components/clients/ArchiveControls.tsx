'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Archive controls (v0.1.10), rendered on the profile for admins only. The
// server enforces every rule again; this component just avoids offering an
// archive the server would refuse (active/paused members see nothing).

export default function ArchiveControls({
  clientId,
  memberName,
  archived,
  status,
}: {
  clientId: string
  memberName: string
  archived: boolean
  status: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const canArchive = !archived && (status === 'canceled' || status === 'waitlist')
  if (!archived && !canArchive) return null

  const act = async (action: 'archive' | 'restore') => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/clients/${clientId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setBusy(false)
        return
      }
      setConfirming(false)
      setBusy(false)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  const button = {
    padding: '9px 16px',
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: 'inherit',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
  } as const

  return (
    <div style={{ marginTop: 18 }}>
      {error && <p style={{ fontSize: 12.5, color: 'var(--red)', margin: '0 0 10px' }}>{error}</p>}
      {archived ? (
        <button
          onClick={() => act('restore')}
          disabled={busy}
          style={{ ...button, color: 'var(--green-bright)', border: '1px solid var(--green-bright)' }}
        >
          {busy ? 'Restoring…' : 'Restore from the archive'}
        </button>
      ) : !confirming ? (
        <button onClick={() => setConfirming(true)} disabled={busy} style={{ ...button, color: 'var(--text-dim)' }}>
          Archive this member…
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
            Move {memberName} out of the working lists? The record is kept in full and can be restored.
          </span>
          <button onClick={() => act('archive')} disabled={busy} style={{ ...button, color: 'var(--amber)', border: '1px solid var(--amber)' }}>
            {busy ? 'Archiving…' : 'Yes, archive'}
          </button>
          <button onClick={() => setConfirming(false)} disabled={busy} style={{ ...button, color: 'var(--text-faint)' }}>
            Keep as is
          </button>
        </div>
      )}
    </div>
  )
}
