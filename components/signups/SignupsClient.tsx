'use client'

import { useState } from 'react'
import type { Lead } from '@/types'
import ClientModal, { TierOption, ClusterPlacementOption } from '@/components/clients/ClientModal'

// The Sign-ups inbox client (v0.1.13; v0.1.14 adds enroll-from-lead and
// area filtering). The demand map is the four area cards: open leads
// counted per area, and each card is now a filter — click to see only
// that area, click again to see everything. "Enroll as member" opens the
// real enrollment modal pre-filled from the lead; on a successful save
// the lead is marked converted automatically. Status changes PATCH the
// lead and update local state; warn-and-allow, no forced sequence.

const AREA_LABELS: Record<Lead['area'], string> = {
  silver_spring: 'Silver Spring',
  rockville_germantown: 'Rockville / Germantown',
  annapolis: 'Annapolis',
  baltimore_county: 'Baltimore County',
}

const AREA_ORDER: Lead['area'][] = ['silver_spring', 'rockville_germantown', 'annapolis', 'baltimore_county']

const CARE_FOR_LABELS: Record<NonNullable<Lead['care_for']>, string> = {
  myself: 'Themselves',
  parent: 'A parent',
  spouse_partner: 'A spouse or partner',
  other: 'Someone else',
}

const STATUS_META: Record<Lead['status'], { label: string; color: string; glow: string }> = {
  new: { label: 'New', color: 'var(--champagne)', glow: 'var(--champagne-glow)' },
  contacted: { label: 'Contacted', color: 'var(--green-bright)', glow: 'var(--green-glow)' },
  converted: { label: 'Converted', color: 'var(--green-dark)', glow: 'var(--green-glow)' },
  closed: { label: 'Closed', color: 'var(--text-faint)', glow: 'var(--surface)' },
}

function formatPhone(digits: string): string {
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return digits
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const actionBtn: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 12.5,
  fontWeight: 500,
  padding: '7px 14px',
  borderRadius: 999,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-dim)',
  cursor: 'pointer',
}

export default function SignupsClient({
  initialLeads,
  role,
  tierOptions,
  clusterOptions,
  geocodeEnabled,
}: {
  initialLeads: Lead[]
  role: 'admin' | 'scheduler'
  tierOptions: TierOption[]
  clusterOptions: ClusterPlacementOption[]
  geocodeEnabled: boolean
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [showClosed, setShowClosed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [areaFilter, setAreaFilter] = useState<Lead['area'] | null>(null)
  const [enrolling, setEnrolling] = useState<Lead | null>(null)

  const open = leads.filter((l) => l.status !== 'closed')
  const closed = leads.filter((l) => l.status === 'closed')
  const openShown = areaFilter ? open.filter((l) => l.area === areaFilter) : open
  const closedShown = areaFilter ? closed.filter((l) => l.area === areaFilter) : closed

  async function setStatus(id: string, status: Lead['status']) {
    if (busyId) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        let message = 'The change did not save. Please try again.'
        try {
          const data = await res.json()
          if (data && typeof data.error === 'string' && data.error) message = data.error
        } catch {
          // keep default
        }
        setError(message)
        setBusyId(null)
        return
      }
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    } catch {
      setError('Could not reach the server. Please try again.')
    }
    setBusyId(null)
  }

  function LeadCard({ lead }: { lead: Lead }) {
    const meta = STATUS_META[lead.status]
    const isClosed = lead.status === 'closed'
    return (
      <div
        style={{
          background: 'var(--surface-raised)',
          border: isClosed ? '1px dashed var(--border)' : '1px solid var(--border)',
          borderRadius: 14,
          padding: '20px 24px',
          opacity: busyId === lead.id ? 0.6 : 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-display), serif', fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
                {lead.name}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: 999,
                  color: meta.color,
                  background: meta.glow,
                  border: `1px solid ${meta.color}`,
                }}
              >
                {meta.label}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 6 }}>
              {AREA_LABELS[lead.area]} · {formatWhen(lead.created_at)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isClosed && lead.status !== 'converted' && (
              <button
                style={{ ...actionBtn, background: 'var(--green-bright)', color: 'var(--on-accent)', border: '1px solid var(--green-bright)', fontWeight: 600 }}
                onClick={() => setEnrolling(lead)}
              >
                Enroll as member
              </button>
            )}
            {!isClosed && lead.status !== 'contacted' && lead.status !== 'converted' && (
              <button style={actionBtn} onClick={() => setStatus(lead.id, 'contacted')}>Mark contacted</button>
            )}
            {!isClosed && lead.status !== 'converted' && (
              <button
                style={{ ...actionBtn, color: 'var(--green-dark)', border: '1px solid var(--green-bright)' }}
                onClick={() => setStatus(lead.id, 'converted')}
              >
                Mark converted
              </button>
            )}
            {!isClosed && (
              <button style={actionBtn} onClick={() => setStatus(lead.id, 'closed')}>Close</button>
            )}
            {isClosed && (
              <button style={actionBtn} onClick={() => setStatus(lead.id, 'new')}>Reopen</button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 14, fontSize: 13.5, color: 'var(--text)' }}>
          <span>
            <span style={{ color: 'var(--text-faint)' }}>Phone: </span>
            {lead.phone ? <a href={`tel:+1${lead.phone}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{formatPhone(lead.phone)}</a> : '—'}
          </span>
          <span>
            <span style={{ color: 'var(--text-faint)' }}>Email: </span>
            {lead.email ? <a href={`mailto:${lead.email}`} style={{ color: 'var(--text)', textDecoration: 'none' }}>{lead.email}</a> : '—'}
          </span>
          <span>
            <span style={{ color: 'var(--text-faint)' }}>Care is for: </span>
            {lead.care_for ? CARE_FOR_LABELS[lead.care_for] : '—'}
            {lead.care_recipient_name ? ` (${lead.care_recipient_name})` : ''}
          </span>
        </div>
        {lead.note && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 10,
              fontSize: 13.5,
              color: 'var(--text-dim)',
              lineHeight: 1.6,
            }}
          >
            {lead.note}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* The demand map — each card is a filter */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: areaFilter ? 12 : 34,
        }}
      >
        {AREA_ORDER.map((area) => {
          const count = open.filter((l) => l.area === area).length
          const live = area === 'silver_spring'
          const active = areaFilter === area
          return (
            <button
              key={area}
              onClick={() => setAreaFilter(active ? null : area)}
              style={{
                background: active ? 'var(--green-glow)' : 'var(--surface-raised)',
                border: active
                  ? '1.5px solid var(--green-bright)'
                  : live
                    ? '1px solid var(--green-bright)'
                    : '1px solid var(--border)',
                borderRadius: 14,
                padding: '18px 20px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600, color: live ? 'var(--green-bright)' : 'var(--champagne)', marginBottom: 6 }}>
                {live ? 'Now enrolling' : 'Coming soon'}
              </div>
              <div style={{ fontFamily: 'var(--font-display), serif', fontSize: 19, fontWeight: 600, color: 'var(--text)' }}>
                {AREA_LABELS[area]}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                {count} open {count === 1 ? 'sign-up' : 'sign-ups'}
              </div>
            </button>
          )
        })}
      </div>

      {areaFilter && (
        <div style={{ marginBottom: 22, fontSize: 13, color: 'var(--text-dim)' }}>
          Showing {AREA_LABELS[areaFilter]} only ·{' '}
          <button
            onClick={() => setAreaFilter(null)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--green-bright)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500 }}
          >
            Show all areas
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'var(--red-glow)',
            border: '1px solid var(--red)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13.5,
            color: 'var(--red)',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* The working list */}
      {openShown.length === 0 ? (
        <div
          style={{
            border: '1px dashed var(--border)',
            borderRadius: 14,
            padding: '36px 24px',
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: 14.5,
          }}
        >
          {areaFilter
            ? `No open sign-ups in ${AREA_LABELS[areaFilter]} right now.`
            : 'No open sign-ups right now. New requests from the front page will appear here.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {openShown.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}

      {/* Closed, behind a toggle */}
      {closedShown.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <button
            style={{ ...actionBtn, background: 'none', border: 'none', color: 'var(--text-faint)', padding: 0, fontSize: 13 }}
            onClick={() => setShowClosed((v) => !v)}
          >
            {showClosed ? 'Hide closed' : `Closed (${closedShown.length})`}
          </button>
          {showClosed && (
            <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
              {closedShown.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enrollment from a lead: the real modal, pre-filled; a successful
          save marks the lead converted. */}
      {enrolling && (
        <ClientModal
          mode="create"
          client={null}
          tierOptions={tierOptions}
          clusterOptions={clusterOptions}
          geocodeEnabled={geocodeEnabled}
          prefill={{
            name: enrolling.name,
            phone: enrolling.phone ? formatPhone(enrolling.phone) : undefined,
            email: enrolling.email ?? undefined,
          }}
          onSaved={() => {
            void setStatus(enrolling.id, 'converted')
          }}
          onClose={() => setEnrolling(null)}
        />
      )}
    </div>
  )
}
