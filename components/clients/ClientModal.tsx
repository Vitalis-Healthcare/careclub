'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Client } from '@/types'

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

const warningStyle = {
  background: 'var(--amber-glow)',
  border: '1px solid var(--amber)',
  borderRadius: 8,
  padding: '12px 14px',
  fontSize: 13,
  color: 'var(--amber)',
  marginBottom: 16,
}

export interface TierOption {
  id: string
  name: string
  shifts_per_month: number
  hours_per_month: number
  monthly_price_cents: number
}

export interface ClusterPlacementOption {
  id: string
  name: string
  zoneName: string
  status: 'active' | 'forming' | 'inactive'
  committedCount: number
  hasCaregiver: boolean
}

type MemberStatus = 'waitlist' | 'active' | 'paused' | 'canceled'

function todayISO(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function ClientModal({
  mode,
  client,
  tierOptions,
  clusterOptions,
  geocodeEnabled,
  onClose,
  prefill,
  onSaved,
}: {
  mode: 'create' | 'edit'
  client: Client | null
  tierOptions: TierOption[]
  clusterOptions: ClusterPlacementOption[]
  geocodeEnabled: boolean
  onClose: () => void
  // v0.1.14: seed name/phone/email when enrolling from a sign-up lead.
  prefill?: { name?: string; phone?: string; email?: string } | null
  // v0.1.14: fired ONLY on a successful save, before onClose — lets the
  // sign-ups inbox mark the source lead converted.
  onSaved?: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(client?.name || prefill?.name || '')
  const [phone, setPhone] = useState(client?.phone || prefill?.phone || '')
  const [email, setEmail] = useState(client?.email || prefill?.email || '')
  const [address, setAddress] = useState(client?.address || '')
  const [latStr, setLatStr] = useState(client?.lat != null ? String(client.lat) : '')
  const [lngStr, setLngStr] = useState(client?.lng != null ? String(client.lng) : '')
  const [emergencyName, setEmergencyName] = useState(client?.emergency_contact_name || '')
  const [emergencyPhone, setEmergencyPhone] = useState(client?.emergency_contact_phone || '')
  const [emergencyEmail, setEmergencyEmail] = useState(client?.emergency_contact_email || '')
  const [tierId, setTierId] = useState(client?.tier_id || '')
  const [clusterId, setClusterId] = useState(client?.cluster_id || '')
  const [status, setStatus] = useState<MemberStatus>(client?.status || 'waitlist')
  const [billingStartDate, setBillingStartDate] = useState(client?.billing_start_date || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const latNum = latStr.trim() === '' ? null : parseFloat(latStr)
  const lngNum = lngStr.trim() === '' ? null : parseFloat(lngStr)

  const pickedCluster = clusterOptions.find(c => c.id === clusterId) || null

  const countsAsCommitted = status === 'waitlist' || status === 'active'
  const activatingUnplaced = status === 'active' && !clusterId
  const activatingWithoutCaregiver =
    status === 'active' && Boolean(pickedCluster) && !pickedCluster?.hasCaregiver
  const cancelingFromCounted =
    mode === 'edit' &&
    status === 'canceled' &&
    client?.status !== 'canceled' &&
    Boolean(client?.cluster_id)
  const canceledClusterName =
    clusterOptions.find(c => c.id === client?.cluster_id)?.name || 'their cluster'

  const validate = (): string | null => {
    if (!name.trim()) return 'Member name is required.'
    if (!address.trim()) return 'Home address is required — care happens at the member\u2019s home.'
    if (!phone.trim() && !email.trim()) return 'Provide at least a phone number or an email address.'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'That email address does not look valid.'
    }
    const hasLat = latStr.trim() !== ''
    const hasLng = lngStr.trim() !== ''
    if (hasLat !== hasLng) return 'Provide both latitude and longitude, or leave both blank.'
    if (hasLat && hasLng) {
      if (latNum === null || !Number.isFinite(latNum) || latNum < 38 || latNum > 40) {
        return 'Latitude must be between 38 and 40 (the Maryland service area).'
      }
      if (lngNum === null || !Number.isFinite(lngNum) || lngNum < -78 || lngNum > -76) {
        return 'Longitude must be between -78 and -76 (the Maryland service area).'
      }
    }
    if (emergencyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyEmail.trim())) {
      return 'The emergency contact email does not look valid.'
    }
    if (!tierId) return 'Pick a membership tier.'
    if (mode === 'edit' && status === 'active' && !billingStartDate) {
      return 'Set a billing start date to activate this membership.'
    }
    return null
  }

  const handleGeocode = async () => {
    if (!address.trim()) {
      setError('Enter an address first, then look up its coordinates.')
      return
    }
    setGeocoding(true)
    setError('')
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'The address lookup failed. Enter coordinates manually.')
        setGeocoding(false)
        return
      }
      setLatStr(String(data.lat))
      setLngStr(String(data.lng))
      if (typeof data.formatted_address === 'string' && data.formatted_address) {
        setAddress(data.formatted_address)
      }
      setGeocoding(false)
    } catch {
      setError('Could not reach the server. Enter coordinates manually.')
      setGeocoding(false)
    }
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError('')

    const common = {
      name: name.trim(),
      address: address.trim(),
      lat: latStr.trim() === '' ? null : latNum,
      lng: lngStr.trim() === '' ? null : lngNum,
      phone: phone.trim() || null,
      email: email.trim() || null,
      emergency_contact_name: emergencyName.trim() || null,
      emergency_contact_phone: emergencyPhone.trim() || null,
      emergency_contact_email: emergencyEmail.trim() || null,
      cluster_id: clusterId || null,
      tier_id: tierId,
    }

    const payload = mode === 'create'
      ? common
      : { ...common, status, billing_start_date: billingStartDate || null }

    try {
      const url = mode === 'create' ? '/api/clients' : `/api/clients/${client?.id}`
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
      if (onSaved) onSaved()
      router.refresh()
      onClose()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setSaving(false)
    }
  }

  const formatMoney = (cents: number) =>
    '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const placementLabel = (c: ClusterPlacementOption): string => {
    const state = c.status === 'forming'
      ? `forming, ${c.committedCount} of 3 committed`
      : c.hasCaregiver
        ? 'active'
        : 'active, no caregiver yet'
    return `${c.name} — ${c.zoneName} (${state})`
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
          width: 520,
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
          {mode === 'create' ? 'Enroll a member' : `Edit ${client?.name || 'membership'}`}
        </h2>

        <label style={labelStyle}>Full name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Margaret Osei" style={inputStyle} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(301) 555-0100" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="margaret@example.com" style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>Home address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="1234 Fenton St, Silver Spring, MD 20910"
          style={{ ...inputStyle, marginBottom: geocodeEnabled ? 10 : 16 }}
        />
        {geocodeEnabled && (
          <button
            onClick={handleGeocode}
            disabled={geocoding || saving}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
              background: 'transparent',
              color: geocoding ? 'var(--text-faint)' : 'var(--green-bright)',
              border: `1px solid ${geocoding ? 'var(--border)' : 'var(--green-bright)'}`,
              borderRadius: 8,
              cursor: geocoding ? 'default' : 'pointer',
              marginBottom: 16,
            }}
          >
            {geocoding ? 'Looking up…' : 'Find coordinates'}
          </button>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Latitude</label>
            <input value={latStr} onChange={(e) => setLatStr(e.target.value)} placeholder="38.9907" inputMode="decimal" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Longitude</label>
            <input value={lngStr} onChange={(e) => setLngStr(e.target.value)} placeholder="-77.0261" inputMode="decimal" style={inputStyle} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '-8px 0 16px' }}>
          {geocodeEnabled
            ? 'Coordinates are optional — use the lookup button or leave them blank for now.'
            : 'Coordinates are optional and can be added later once address lookup is configured.'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Emergency contact</label>
            <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} placeholder="Kwame Osei" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Emergency phone</label>
            <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="(301) 555-0101" style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>Emergency contact email</label>
        <input value={emergencyEmail} onChange={(e) => setEmergencyEmail(e.target.value)} placeholder="kwame@example.com" style={inputStyle} />

        <label style={labelStyle}>Membership tier</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {tierOptions.map((t) => {
            const on = tierId === t.id
            const signature = t.name === 'Signature'
            const accent = signature ? 'var(--champagne)' : 'var(--green-bright)'
            const glow = signature ? 'var(--champagne-glow)' : 'var(--green-glow)'
            return (
              <button
                key={t.id}
                onClick={() => setTierId(t.id)}
                style={{
                  padding: '14px 10px 12px',
                  fontFamily: 'inherit',
                  textAlign: 'center',
                  background: on ? glow : 'transparent',
                  border: `1px solid ${on ? accent : 'var(--border)'}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: on ? accent : 'var(--text)', marginBottom: 4 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
                  {t.shifts_per_month} shifts · {t.hours_per_month} hrs
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display), serif',
                    fontSize: 19,
                    fontWeight: 600,
                    color: on ? accent : 'var(--text)',
                  }}
                >
                  {formatMoney(t.monthly_price_cents)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>per month</div>
              </button>
            )
          })}
        </div>

        <label style={labelStyle}>Placement</label>
        <select
          value={clusterId}
          onChange={(e) => setClusterId(e.target.value)}
          style={{ ...inputStyle, appearance: 'none' as const }}
        >
          <option value="">Waitlist — no cluster yet</option>
          {clusterOptions
            .filter(c => c.status !== 'inactive' || c.id === client?.cluster_id)
            .map((c) => (
              <option key={c.id} value={c.id}>{placementLabel(c)}</option>
            ))}
        </select>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '-8px 0 16px' }}>
          {mode === 'create'
            ? 'New members start on the waitlist either way. Placing them in a forming cluster counts them toward its launch.'
            : countsAsCommitted && clusterId
              ? 'This member counts toward the cluster\u2019s committed total.'
              : 'Placement is kept for the record; paused and canceled members do not count toward any cluster.'}
        </div>

        {mode === 'edit' && (
          <>
            <label style={labelStyle}>Membership status</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['waitlist', 'active', 'paused', 'canceled'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    fontSize: 12.5,
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

            {status === 'active' && (
              <>
                <label style={labelStyle}>Billing start date</label>
                <input
                  type="date"
                  value={billingStartDate}
                  onChange={(e) => setBillingStartDate(e.target.value)}
                  style={inputStyle}
                />
                {!billingStartDate && (
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '-8px 0 16px' }}>
                    <button
                      onClick={() => setBillingStartDate(todayISO())}
                      style={{
                        padding: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        background: 'transparent',
                        color: 'var(--green-bright)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Use today
                    </button>
                  </div>
                )}
              </>
            )}

            {activatingUnplaced && (
              <div style={warningStyle}>
                This member is active but unplaced — they will count toward revenue but cannot be scheduled until they join a cluster.
              </div>
            )}
            {activatingWithoutCaregiver && (
              <div style={warningStyle}>
                {pickedCluster?.name} has no caregiver assigned yet, so this member cannot be scheduled until one is. Their subscription still counts.
              </div>
            )}
            {status === 'paused' && client?.status !== 'paused' && (
              <div style={warningStyle}>
                Pausing keeps this member&apos;s cluster seat but removes them from revenue and committed counts until they resume.
              </div>
            )}
            {cancelingFromCounted && (
              <div style={warningStyle}>
                Canceling frees this member&apos;s seat in {canceledClusterName}. Their record stays for history, but they no longer count anywhere.
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
            {saving
              ? 'Saving…'
              : mode === 'create'
                ? 'Enroll member'
                : 'Save membership'}
          </button>
        </div>
      </div>
    </div>
  )
}
