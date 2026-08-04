'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const BLOCKS: { start: string; label: string }[] = [
  { start: '08:00', label: '8:00 AM' },
  { start: '10:30', label: '10:30 AM' },
  { start: '13:00', label: '1:00 PM' },
]

const DAYS: { day: number; label: string }[] = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
]

export interface PatternChip {
  day_of_week: number
  start_time: string
}

const keyOf = (day: number, start: string) => `${day}|${start}`

export default function PatternsCard({
  clientId,
  initialPatterns,
  tierName,
  shiftsPerMonth,
  memberStatus,
  editable,
}: {
  clientId: string
  initialPatterns: PatternChip[]
  tierName: string
  shiftsPerMonth: number
  memberStatus: 'waitlist' | 'active' | 'paused' | 'canceled'
  editable: boolean
}) {
  const router = useRouter()
  const initialKeys = new Set(initialPatterns.map(p => keyOf(p.day_of_week, p.start_time.slice(0, 5))))
  const [selected, setSelected] = useState<Set<string>>(initialKeys)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const weekly = selected.size
  const monthlyPace = Math.round(weekly * 4.33)
  const paceOff = Math.abs(monthlyPace - shiftsPerMonth) > 1

  const toggle = (day: number, start: string) => {
    if (!editing) return
    const key = keyOf(day, start)
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const patterns = Array.from(selected).map(k => {
      const [day, start] = k.split('|')
      return { day_of_week: parseInt(day, 10), start_time: start }
    })
    try {
      const res = await fetch(`/api/clients/${clientId}/patterns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patterns }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setSaving(false)
        return
      }
      setSaving(false)
      setEditing(false)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setSelected(new Set(initialKeys))
    setEditing(false)
    setError('')
  }

  const smallButton = (active: boolean) => ({
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'inherit',
    background: active ? 'var(--green-bright)' : 'transparent',
    color: active ? 'var(--on-accent)' : 'var(--text-dim)',
    border: active ? 'none' : '1px solid var(--border)',
    borderRadius: 8,
    cursor: 'pointer',
  } as const)

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
          The standing week
        </h2>
        {editable && !editing && (
          <button onClick={() => setEditing(true)} style={smallButton(false)}>
            Edit
          </button>
        )}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: '0 0 16px' }}>
        Two-hour visits in the standard blocks. Visits generate on the schedule only while the membership is active.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
        <div />
        {DAYS.map(d => (
          <div
            key={d.day}
            style={{
              fontSize: 10.5,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {d.label}
          </div>
        ))}
        {BLOCKS.map(b => (
          <div key={b.start} style={{ display: 'contents' }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-dim)', fontWeight: 600, alignSelf: 'center' }}>
              {b.label}
            </div>
            {DAYS.map(d => {
              const on = selected.has(keyOf(d.day, b.start))
              return (
                <button
                  key={`${d.day}-${b.start}`}
                  onClick={() => toggle(d.day, b.start)}
                  disabled={!editing}
                  style={{
                    padding: '12px 0',
                    fontFamily: 'inherit',
                    fontSize: 11,
                    fontWeight: 700,
                    background: on ? 'var(--green-glow)' : 'var(--surface-raised)',
                    color: on ? 'var(--green-bright)' : 'var(--text-faint)',
                    border: `1px solid ${on ? 'var(--green-bright)' : 'var(--border-soft)'}`,
                    borderRadius: 8,
                    cursor: editing ? 'pointer' : 'default',
                    opacity: !editing && !on ? 0.55 : 1,
                  }}
                >
                  {on ? 'Visit' : editing ? '·' : ''}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12.5, color: paceOff ? 'var(--amber)' : 'var(--text-dim)', marginBottom: editing || error ? 14 : 0 }}>
        {weekly === 0
          ? `No standing visits yet. The ${tierName} tier includes ${shiftsPerMonth} visits a month.`
          : `${weekly} ${weekly === 1 ? 'visit' : 'visits'} a week · about ${monthlyPace} a month against the ${tierName} tier's ${shiftsPerMonth}.`}
        {paceOff && weekly > 0 && ' Adjust the pattern or expect overage or unused visits.'}
      </div>

      {memberStatus !== 'active' && weekly > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: editing || error ? 12 : 0 }}>
          This membership is {memberStatus} — the pattern is saved but will not generate visits until it is active.
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 12px' }}>{error}</p>}

      {editing && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleCancel} disabled={saving} style={{ ...smallButton(false), flex: 1, padding: '10px 0' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px 0',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              background: saving ? 'var(--surface-raised)' : 'var(--green-bright)',
              color: saving ? 'var(--text-faint)' : 'var(--on-accent)',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save the week'}
          </button>
        </div>
      )}
    </div>
  )
}
