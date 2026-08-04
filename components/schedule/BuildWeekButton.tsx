'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BuildWeekButton({ weekStart }: { weekStart: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [overageNotes, setOverageNotes] = useState<string[]>([])

  const handleBuild = async () => {
    setBusy(true)
    setResult('')
    setError('')
    setOverageNotes([])
    try {
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setBusy(false)
        return
      }
      if (data.note) {
        setResult(data.note)
      } else if (data.created === 0 && data.skipped === 0) {
        setResult('No standing visits to place this week yet.')
      } else {
        const created = `${data.created} ${data.created === 1 ? 'visit' : 'visits'} added`
        const skipped = data.skipped > 0 ? ` · ${data.skipped} already in place` : ''
        setResult(created + skipped)
      }
      setOverageNotes(Array.isArray(data.overage_notes) ? data.overage_notes : [])
      setBusy(false)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {result && <span style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{result}</span>}
      {error && <span style={{ fontSize: 12.5, color: 'var(--red)' }}>{error}</span>}
      <button
        onClick={handleBuild}
        disabled={busy}
        style={{
          padding: '10px 18px',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          background: busy ? 'var(--surface-raised)' : 'var(--green-bright)',
          color: busy ? 'var(--text-faint)' : 'var(--on-accent)',
          border: 'none',
          borderRadius: 8,
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Building…' : 'Build the week'}
      </button>
    </div>
    {overageNotes.map((note) => (
      <div key={note} style={{ fontSize: 12, color: 'var(--amber)', maxWidth: 520, textAlign: 'right' }}>
        {note}
      </div>
    ))}
    </div>
  )
}
