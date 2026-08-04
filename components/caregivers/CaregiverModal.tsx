'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Caregiver } from '@/types'

const DAY_CHIPS: { code: string; label: string }[] = [
  { code: 'mon', label: 'Mon' },
  { code: 'tue', label: 'Tue' },
  { code: 'wed', label: 'Wed' },
  { code: 'thu', label: 'Thu' },
  { code: 'fri', label: 'Fri' },
  { code: 'sat', label: 'Sat' },
  { code: 'sun', label: 'Sun' },
]

const labelStyle = {
  display: 'block',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  fontWeight: 600,
  color: 'var(--text-faint)',
  marginBottom: 7,
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

function toTimeInput(value: string | undefined): string {
  if (!value) return ''
  return value.slice(0, 5)
}

export default function CaregiverModal({
  mode,
  caregiver,
  assignedClusterName,
  onClose,
}: {
  mode: 'create' | 'edit'
  caregiver: Caregiver | null
  assignedClusterName: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(caregiver?.name || '')
  const [phone, setPhone] = useState(caregiver?.phone || '')
  const [email, setEmail] = useState(caregiver?.email || '')
  const [salaryDollars, setSalaryDollars] = useState(
    caregiver ? String(caregiver.monthly_salary_cents / 100) : '3750'
  )
  const [workDays, setWorkDays] = useState<string[]>(
    caregiver?.work_days?.length ? caregiver.work_days : ['mon', 'tue', 'wed', 'thu', 'fri']
  )
  const [shiftStart, setShiftStart] = useState(toTimeInput(caregiver?.shift_start) || '08:00')
  const [shiftEnd, setShiftEnd] = useState(toTimeInput(caregiver?.shift_end) || '16:00')
  const [status, setStatus] = useState<'active' | 'inactive'>(caregiver?.status || 'active')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const salaryNum = parseFloat(salaryDollars)
  const salaryValid = Number.isFinite(salaryNum) && salaryNum >= 1000 && salaryNum <= 20000

  const deactivatingWhileAssigned =
    mode === 'edit' && status === 'inactive' && caregiver?.status !== 'inactive' && Boolean(assignedClusterName)

  const toggleDay = (code: string) => {
    setWorkDays(prev =>
      prev.includes(code) ? prev.filter(d => d !== code) : [...prev, code]
    )
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Caregiver name is required.'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'That email address does not look valid.'
    }
    if (!salaryValid) return 'Monthly salary must be between $1,000 and $20,000.'
    if (workDays.length === 0) return 'Pick at least one work day.'
    if (!shiftStart || !shiftEnd) return 'Set the shift start and end times.'
    if (shiftStart >= shiftEnd) return 'Shift start must be before shift end.'
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      monthly_salary_cents: Math.round(salaryNum * 100),
      work_days: DAY_CHIPS.map(d => d.code).filter(c => workDays.includes(c)),
      shift_start: shiftStart,
      shift_end: shiftEnd,
      status,
    }

    try {
      const url = mode === 'create' ? '/api/caregivers' : `/api/caregivers/${caregiver?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setSaving(false)
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setSaving(false)
    }
  }

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
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div
        style={{
          width: 480,
          maxWidth: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: 'var(--shadow)',
          padding: '32px 32px 28px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 26,
            fontWeight: 600,
            margin: '0 0 24px',
          }}
        >
          {mode === 'create' ? 'Add a caregiver' : `Edit ${caregiver?.name || 'caregiver'}`}
        </h2>

        <label style={labelStyle}>Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Angela Mensah" style={inputStyle} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(240) 555-0100" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="angela@example.com" style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>Monthly salary (USD)</label>
        <input
          value={salaryDollars}
          onChange={(e) => setSalaryDollars(e.target.value)}
          placeholder="3750"
          inputMode="decimal"
          style={inputStyle}
        />

        <label style={labelStyle}>Work days</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {DAY_CHIPS.map((d) => {
            const on = workDays.includes(d.code)
            return (
              <button
                key={d.code}
                onClick={() => toggleDay(d.code)}
                style={{
                  padding: '8px 0',
                  width: 52,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: on ? 'var(--green-glow)' : 'transparent',
                  color: on ? 'var(--green-bright)' : 'var(--text-faint)',
                  border: `1px solid ${on ? 'var(--green-bright)' : 'var(--border)'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                {d.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Shift start</label>
            <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Shift end</label>
            <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {mode === 'edit' && (
          <>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {(['active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    background: status === s ? 'var(--surface-raised)' : 'transparent',
                    color: status === s ? 'var(--text)' : 'var(--text-faint)',
                    border: `1px solid ${status === s ? 'var(--text-faint)' : 'var(--border)'}`,
                    borderRadius: 8,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            {deactivatingWhileAssigned && (
              <div
                style={{
                  background: 'var(--amber-glow)',
                  border: '1px solid var(--amber)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: 'var(--amber)',
                  marginBottom: 16,
                }}
              >
                {caregiver?.name} is assigned to {assignedClusterName}. Deactivating does not unassign them — the cluster will display as forming until a replacement is assigned. To swap caregivers, edit the cluster instead.
              </div>
            )}
          </>
        )}

        {error && (
          <p style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 14px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1,
              padding: '11px 0',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              background: 'transparent',
              color: 'var(--text-dim)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: '11px 0',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              background: saving ? 'var(--surface-raised)' : 'var(--green-bright)',
              color: saving ? 'var(--text-faint)' : 'var(--on-accent)',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : mode === 'create' ? 'Add caregiver' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
