'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Cluster } from '@/types'

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

export interface ZoneOption {
  id: string
  name: string
  abbreviation: string
  nextClusterName: string
}

export default function ClusterModal({
  mode,
  cluster,
  zoneOptions,
  activeMemberCount,
  hasCaregiver,
  onClose,
}: {
  mode: 'create' | 'edit'
  cluster: Cluster | null
  zoneOptions: ZoneOption[]
  activeMemberCount: number
  hasCaregiver: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [zoneId, setZoneId] = useState(zoneOptions.length === 1 ? zoneOptions[0].id : '')
  const [salaryDollars, setSalaryDollars] = useState(
    cluster ? String(cluster.monthly_salary_cents / 100) : '3750'
  )
  const [status, setStatus] = useState<'active' | 'forming' | 'inactive'>(cluster?.status || 'forming')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedZone = zoneOptions.find(z => z.id === zoneId) || null

  const salaryNum = parseFloat(salaryDollars)
  const salaryValid = Number.isFinite(salaryNum) && salaryNum >= 1000 && salaryNum <= 20000
  const loadedCost = salaryValid ? salaryNum * 1.25 : null
  const premierToBreakeven = loadedCost !== null ? Math.ceil(loadedCost / 1200) : null

  const activatingWithoutCaregiver =
    mode === 'edit' && status === 'active' && cluster?.status !== 'active' && !hasCaregiver
  const deactivatingWithMembers =
    mode === 'edit' && status === 'inactive' && cluster?.status !== 'inactive' && activeMemberCount > 0

  const validate = (): string | null => {
    if (mode === 'create' && !zoneId) return 'Pick a zone for the cluster.'
    if (!salaryValid) return 'Monthly salary must be between $1,000 and $20,000.'
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

    const cents = Math.round(salaryNum * 100)

    try {
      const url = mode === 'create' ? '/api/clusters' : `/api/clusters/${cluster?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const payload = mode === 'create'
        ? { zone_id: zoneId, monthly_salary_cents: cents }
        : { monthly_salary_cents: cents, status }
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

  const formatMoney = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

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
          width: 460,
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
          {mode === 'create' ? 'Open a cluster' : `Edit ${cluster?.name || 'cluster'}`}
        </h2>

        {mode === 'create' ? (
          <>
            <label style={labelStyle}>Zone</label>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              style={{ ...inputStyle, appearance: 'none' as const }}
            >
              <option value="" disabled>Choose a zone</option>
              {zoneOptions.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.abbreviation})</option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '-8px 0 16px' }}>
              {selectedZone
                ? <>The cluster will be named <b style={{ color: 'var(--text)' }}>{selectedZone.nextClusterName}</b> and start as forming while its waitlist builds.</>
                : 'The name is assigned automatically from the zone abbreviation (SSC-1, SSC-2, ...).'}
            </div>
          </>
        ) : (
          <>
            <label style={labelStyle}>Cluster name</label>
            <input
              value={cluster?.name || ''}
              disabled
              style={{ ...inputStyle, color: 'var(--text-dim)', cursor: 'not-allowed' }}
            />
          </>
        )}

        <label style={labelStyle}>Monthly caregiver salary (USD)</label>
        <input
          value={salaryDollars}
          onChange={(e) => setSalaryDollars(e.target.value)}
          placeholder="3750"
          inputMode="decimal"
          style={inputStyle}
        />
        {loadedCost !== null && (
          <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '-8px 0 16px' }}>
            Loaded cost {formatMoney(loadedCost)}/mo at 25% burden · breakeven at {premierToBreakeven} Premier {premierToBreakeven === 1 ? 'subscriber' : 'subscribers'}
          </div>
        )}

        {mode === 'edit' && (
          <>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {(['forming', 'active', 'inactive'] as const).map((s) => (
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

            {activatingWithoutCaregiver && (
              <div
                style={{
                  background: 'var(--champagne-glow)',
                  border: '1px solid var(--champagne)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: 'var(--champagne)',
                  marginBottom: 16,
                }}
              >
                No caregiver is assigned yet, so this cluster will keep displaying as forming until one is assigned (caregiver management arrives in v0.1.3). Activating now is fine — it marks the cluster as ready.
              </div>
            )}

            {deactivatingWithMembers && (
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
                This cluster has {activeMemberCount} active {activeMemberCount === 1 ? 'member' : 'members'}. Deactivating it does not pause their memberships — move them to another cluster first.
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
            {saving ? 'Saving...' : mode === 'create' ? 'Open cluster' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
