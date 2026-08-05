'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { isShortNotice } from '@/lib/shifts/validate'

export interface ShiftForModal {
  id: string
  client_id: string
  memberName: string
  clusterName: string
  shift_date: string
  start_time: string
  timeLabel: string
  dateLabel: string
  duration_hours: number
  status: string
  is_overage: boolean
  cancel_type: string | null
  freeCancelsRemaining: number | null
  freeCancelsAllowance: number | null
}

const actionButton = {
  width: '100%',
  padding: '11px 0',
  fontSize: 13.5,
  fontWeight: 600,
  fontFamily: 'inherit',
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  cursor: 'pointer',
  marginBottom: 10,
} as const

export default function ShiftModal({
  shift,
  onClose,
}: {
  shift: ShiftForModal
  onClose: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)

  const shortNotice = isShortNotice(shift.shift_date, shift.start_time)

  // The cancel assist (v0.1.9-b): the software does the arithmetic, Staff
  // keep the judgment. Free is recommended only when 48-hour notice stands
  // AND the member still has free cancels this period (unknown period means
  // benefit of the doubt).
  const freeLeft = shift.freeCancelsRemaining
  const allowance = shift.freeCancelsAllowance
  const recommendFree = !shortNotice && (freeLeft === null || freeLeft > 0)

  const act = async (action: string, cancelType?: 'free' | 'forfeit') => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cancelType ? { action, cancel_type: cancelType } : { action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setBusy(false)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  const statusLine = () => {
    if (shift.status === 'completed') return { text: 'Completed', color: 'var(--green-text)' }
    if (shift.status === 'no_show') return { text: 'No-show', color: 'var(--amber)' }
    if (shift.status === 'canceled') {
      return { text: `Canceled · ${shift.cancel_type === 'forfeit' ? 'forfeited' : 'free cancel'}`, color: 'var(--red)' }
    }
    return { text: 'Scheduled', color: 'var(--text-dim)' }
  }
  const status = statusLine()

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div
        style={{
          width: 420,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow)',
          padding: '28px 28px 24px',
        }}
      >
        <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 24, fontWeight: 600, margin: '0 0 4px' }}>
          {shift.memberName}
        </h2>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 2 }}>
          {shift.dateLabel} · {shift.timeLabel} · {shift.duration_hours} hrs · {shift.clusterName}
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: status.color, marginBottom: 4 }}>
          {status.text}
          {shift.is_overage && (
            <span style={{ color: 'var(--champagne)', marginLeft: 8 }}>+1 hr overage</span>
          )}
        </div>
        <div style={{ marginBottom: 18 }}>
          <Link
            href={`/clients/${shift.client_id}`}
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--green-bright)', textDecoration: 'none' }}
          >
            View membership →
          </Link>
        </div>

        {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 12px' }}>{error}</p>}

        {shift.status === 'scheduled' && !cancelOpen && (
          <>
            <button onClick={() => act('complete')} disabled={busy} style={{ ...actionButton, background: 'var(--green-glow)', color: 'var(--green-bright)', border: '1px solid var(--green-bright)' }}>
              Mark completed
            </button>
            {!shift.is_overage ? (
              <button onClick={() => act('extend')} disabled={busy} style={actionButton}>
                Extend by 1 hour (overage)
              </button>
            ) : (
              <button onClick={() => act('remove_extension')} disabled={busy} style={actionButton}>
                Remove the 1-hour extension
              </button>
            )}
            <button onClick={() => act('no_show')} disabled={busy} style={actionButton}>
              Mark as no-show
            </button>
            <button onClick={() => setCancelOpen(true)} disabled={busy} style={{ ...actionButton, color: 'var(--red)' }}>
              Cancel this visit…
            </button>
          </>
        )}

        {shift.status === 'scheduled' && cancelOpen && (
          <>
            <div
              style={{
                background: recommendFree ? 'var(--green-glow)' : 'var(--amber-glow)',
                border: `1px solid ${recommendFree ? 'var(--green-bright)' : 'var(--amber)'}`,
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 12.5,
                color: recommendFree ? 'var(--green-bright)' : 'var(--amber)',
                marginBottom: 12,
              }}
            >
              {recommendFree
                ? freeLeft !== null && allowance !== null
                  ? `More than 48 hours' notice · ${freeLeft} of ${allowance} free cancels remaining — this cancellation is free.`
                  : `More than 48 hours' notice — this cancellation is free.`
                : shortNotice
                  ? `This visit starts in under 48 hours — Club policy books short-notice cancellations as a forfeit of the visit's 2 hours. The choice stays yours.`
                  : `48-hour notice was given, but no free cancels remain this period — Club policy books this as a forfeit of the visit's 2 hours. The choice stays yours.`}
            </div>
            {recommendFree ? (
              <>
                <button onClick={() => act('cancel', 'free')} disabled={busy} style={{ ...actionButton, background: 'var(--green-glow)', color: 'var(--green-bright)', border: '1px solid var(--green-bright)' }}>
                  Cancel — free (recommended)
                </button>
                <button onClick={() => act('cancel', 'forfeit')} disabled={busy} style={{ ...actionButton, color: 'var(--red)' }}>
                  Cancel — forfeit the visit's 2 hours
                </button>
              </>
            ) : (
              <>
                <button onClick={() => act('cancel', 'forfeit')} disabled={busy} style={{ ...actionButton, color: 'var(--red)', border: '1px solid var(--red)' }}>
                  Cancel — forfeit the visit's 2 hours (recommended)
                </button>
                <button onClick={() => act('cancel', 'free')} disabled={busy} style={actionButton}>
                  Cancel — free (override)
                </button>
              </>
            )}
            <button onClick={() => setCancelOpen(false)} disabled={busy} style={{ ...actionButton, color: 'var(--text-dim)' }}>
              Back
            </button>
          </>
        )}

        {shift.status !== 'scheduled' && (
          <button onClick={() => act('revert')} disabled={busy} style={actionButton}>
            Revert to scheduled
          </button>
        )}

        <button
          onClick={onClose}
          disabled={busy}
          style={{ ...actionButton, marginBottom: 0, color: 'var(--text-faint)', border: '1px solid var(--border-soft)' }}
        >
          Close
        </button>
      </div>
    </div>
  )
}
