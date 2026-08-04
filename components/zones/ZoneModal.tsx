'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Zone } from '@/types'

// Suggest an abbreviation from the initials of the zone name.
function suggestAbbreviation(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

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

export default function ZoneModal({
  mode,
  zone,
  activeClusterNames,
  onClose,
}: {
  mode: 'create' | 'edit'
  zone: Zone | null
  activeClusterNames: string[]
  onClose: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(zone?.name || '')
  const [abbreviation, setAbbreviation] = useState(zone?.abbreviation || '')
  const [abbrevTouched, setAbbrevTouched] = useState(mode === 'edit')
  const [centerAddress, setCenterAddress] = useState(zone?.center_address || '')
  const [lat, setLat] = useState(zone ? String(zone.center_lat) : '')
  const [lng, setLng] = useState(zone ? String(zone.center_lng) : '')
  const [radius, setRadius] = useState(zone ? String(zone.radius_miles) : '3.0')
  const [status, setStatus] = useState<'active' | 'inactive'>(zone?.status || 'active')
  const [notes, setNotes] = useState(zone?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const deactivating = mode === 'edit' && zone?.status === 'active' && status === 'inactive'
  const showClusterWarning = deactivating && activeClusterNames.length > 0

  const handleNameChange = (value: string) => {
    setName(value)
    if (mode === 'create' && !abbrevTouched) {
      setAbbreviation(suggestAbbreviation(value))
    }
  }

  const validate = (): string | null => {
    if (!name.trim()) return 'Zone name is required.'
    if (!abbreviation.trim()) return 'Abbreviation is required.'
    if (!/^[A-Za-z0-9]{1,6}$/.test(abbreviation.trim())) {
      return 'Abbreviation must be 1-6 letters or numbers.'
    }
    const latNum = parseFloat(lat)
    if (!Number.isFinite(latNum) || latNum < 38 || latNum > 40) {
      return 'Latitude must be between 38 and 40 (the Maryland service area).'
    }
    const lngNum = parseFloat(lng)
    if (!Number.isFinite(lngNum) || lngNum < -78 || lngNum > -76) {
      return 'Longitude must be between -78 and -76 (the Maryland service area).'
    }
    const radiusNum = parseFloat(radius)
    if (!Number.isFinite(radiusNum) || radiusNum < 0.5 || radiusNum > 25) {
      return 'Radius must be between 0.5 and 25 miles.'
    }
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
      abbreviation: abbreviation.trim().toUpperCase(),
      center_address: centerAddress.trim() || null,
      center_lat: parseFloat(lat),
      center_lng: parseFloat(lng),
      radius_miles: parseFloat(radius),
      notes: notes.trim() || null,
      status,
    }

    try {
      const url = mode === 'create' ? '/api/zones' : `/api/zones/${zone?.id}`
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
          {mode === 'create' ? 'Add a zone' : `Edit ${zone?.name || 'zone'}`}
        </h2>

        <label style={labelStyle}>Zone name</label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Bethesda"
          style={inputStyle}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Abbreviation</label>
            <input
              value={abbreviation}
              onChange={(e) => {
                setAbbrevTouched(true)
                setAbbreviation(e.target.value.toUpperCase())
              }}
              placeholder="BET"
              maxLength={6}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Radius (miles)</label>
            <input
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              placeholder="3.0"
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
        </div>

        <label style={labelStyle}>Center address</label>
        <input
          value={centerAddress}
          onChange={(e) => setCenterAddress(e.target.value)}
          placeholder="7315 Wisconsin Ave, Bethesda, MD 20814"
          style={inputStyle}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Latitude</label>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="38.9847"
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Longitude</label>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-77.0947"
              inputMode="decimal"
              style={inputStyle}
            />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '-8px 0 16px' }}>
          In Google Maps, right-click the center point — the coordinates appear at the top of the menu. Click them to copy.
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
            {showClusterWarning && (
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
                This zone still has {activeClusterNames.length === 1 ? 'an active cluster' : `${activeClusterNames.length} active clusters`}: {activeClusterNames.join(', ')}. Deactivating the zone does not pause them — it removes the zone from market planning only.
              </div>
            )}
          </>
        )}

        <label style={labelStyle}>Service area notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything the team should know about this territory"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }}
        />

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
            {saving ? 'Saving...' : mode === 'create' ? 'Add zone' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
