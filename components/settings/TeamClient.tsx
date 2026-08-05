'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHead } from '@/components/ui/PageChrome'
import type { Profile, UserRole } from '@/types'

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

function roleLabel(role: UserRole): string {
  return role === 'admin' ? 'Admin' : 'Staff'
}

function joinedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function RolePill({ role }: { role: UserRole }) {
  const admin = role === 'admin'
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase' as const,
        padding: '3px 10px',
        borderRadius: 999,
        color: admin ? 'var(--green-text)' : 'var(--text-dim)',
        border: `1px solid ${admin ? 'var(--green-text)' : 'var(--border)'}`,
      }}
    >
      {roleLabel(role)}
    </span>
  )
}

interface CreatedAccount {
  full_name: string
  email: string
  role: UserRole
  tempPassword: string
}

function AddTeammateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('scheduler')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedAccount | null>(null)
  const [copied, setCopied] = useState(false)

  const create = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not create the account.')
        setSaving(false)
        return
      }
      setCreated({
        full_name: data.full_name,
        email: data.email,
        role: data.role,
        tempPassword: data.tempPassword,
      })
      setSaving(false)
    } catch {
      setError('Could not create the account. Please try again.')
      setSaving(false)
    }
  }

  const copyPassword = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(created.tempPassword)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const finish = () => {
    router.refresh()
    onClose()
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
        if (e.target === e.currentTarget && !saving && !created) onClose()
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
          {created ? 'Account created' : 'Add a teammate'}
        </h2>

        {!created && (
          <>
            <label style={labelStyle}>Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Peace Enoch"
              style={inputStyle}
            />

            <label style={labelStyle}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="peace@vitalishealthcare.com"
              style={inputStyle}
            />

            <label style={labelStyle}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="scheduler">Staff</option>
              <option value="admin">Admin</option>
            </select>

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
                onClick={create}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '11px 0',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: 'var(--green-dark)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 8,
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </>
        )}

        {created && (
          <>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '0 0 18px', lineHeight: 1.55 }}>
              {created.full_name} can sign in at the staff entrance with this temporary
              password. It is shown once — copy it now and hand it to them directly.
            </p>

            <label style={labelStyle}>Email</label>
            <div style={{ ...inputStyle, background: 'var(--surface-raised)' }}>{created.email}</div>

            <label style={labelStyle}>Temporary password</label>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  ...inputStyle,
                  marginBottom: 0,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                {created.tempPassword}
              </div>
              <button
                onClick={copyPassword}
                style={{
                  padding: '11px 18px',
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: 'transparent',
                  color: 'var(--green-text)',
                  border: '1px solid var(--green-text)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <button
              onClick={finish}
              style={{
                width: '100%',
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
                background: 'var(--green-dark)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function TeamClient({
  profiles,
  currentUserId,
}: {
  profiles: Profile[]
  currentUserId: string
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)

  const flipRole = async (p: Profile) => {
    const next: UserRole = p.role === 'admin' ? 'scheduler' : 'admin'
    setBusyId(p.id)
    setRowError(null)
    try {
      const res = await fetch(`/api/team/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRowError(data.error || 'Could not change the role.')
      } else {
        router.refresh()
      }
    } catch {
      setRowError('Could not change the role. Please try again.')
    }
    setBusyId(null)
  }

  return (
    <div>
      <PageHead
        eyebrow="Admin"
        title="Settings"
        right={
          <button
            onClick={() => setAdding(true)}
            style={{
              padding: '11px 20px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'inherit',
              background: 'var(--green-dark)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Add a teammate
          </button>
        }
      />

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '26px 28px',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase' as const,
            fontWeight: 600,
            color: 'var(--text-faint)',
            marginBottom: 16,
          }}
        >
          The team
        </div>

        {rowError && (
          <p style={{ fontSize: 13, color: 'var(--red)', margin: '0 0 14px' }}>{rowError}</p>
        )}

        <div style={{ display: 'grid', gap: 4 }}>
          {profiles.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 12px',
                borderRadius: 10,
                border: '1px solid var(--border-soft)',
                flexWrap: 'wrap' as const,
              }}
            >
              <div style={{ minWidth: 200, flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>
                  {p.full_name || p.email || 'Unnamed account'}
                  {p.id === currentUserId && (
                    <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}> · you</span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 2 }}>
                  {p.email || '—'} · joined {joinedLabel(p.created_at)}
                </div>
              </div>
              <RolePill role={p.role} />
              <button
                onClick={() => flipRole(p)}
                disabled={busyId === p.id}
                style={{
                  padding: '7px 14px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  background: 'transparent',
                  color: 'var(--text-dim)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  cursor: busyId === p.id ? 'default' : 'pointer',
                  opacity: busyId === p.id ? 0.6 : 1,
                }}
              >
                {p.role === 'admin' ? 'Make Staff' : 'Make Admin'}
              </button>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: '16px 0 0', lineHeight: 1.55 }}>
          Teammates sign in at the staff entrance with their temporary password.
          The portal always keeps at least one administrator.
        </p>
      </div>

      {adding && <AddTeammateModal onClose={() => setAdding(false)} />}
    </div>
  )
}
