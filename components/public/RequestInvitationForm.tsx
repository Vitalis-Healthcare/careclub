'use client'

import { useState } from 'react'

// The public sign-up form (v0.1.12). Lives inside the front page's LIGHT_PIN
// wrapper, so tokens resolve to the light palette. A submission creates a
// LEAD for Staff follow-up — never a member. The "company" field is a
// honeypot: visually hidden, ignored by people, filled by bots; the API
// accepts and discards those submissions silently.

const AREA_OPTIONS = [
  { value: 'silver_spring', label: 'Silver Spring — now enrolling' },
  { value: 'rockville_germantown', label: 'Rockville / Germantown — coming soon' },
  { value: 'annapolis', label: 'Annapolis — coming soon' },
  { value: 'baltimore_county', label: 'Baltimore County — coming soon' },
]

const CARE_FOR_OPTIONS = [
  { value: 'myself', label: 'Myself' },
  { value: 'parent', label: 'A parent' },
  { value: 'spouse_partner', label: 'A spouse or partner' },
  { value: 'other', label: 'Someone else' },
]

const fieldWrap: React.CSSProperties = { marginBottom: 18 }

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 6,
  color: 'var(--text)',
}

const optionalMark: React.CSSProperties = { color: 'var(--text-faint)', fontWeight: 400 }

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  padding: '12px 14px',
  border: '1px solid var(--border)',
  borderRadius: 10,
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
}

export default function RequestInvitationForm() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [area, setArea] = useState('silver_spring')
  const [careFor, setCareFor] = useState('myself')
  const [careRecipientName, setCareRecipientName] = useState('')
  const [note, setNote] = useState('')
  const [company, setCompany] = useState('') // honeypot
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (submitting) return
    setError(null)
    if (!name.trim()) {
      setError('Please tell us your name.')
      return
    }
    if (!phone.trim() && !email.trim()) {
      setError('Please share a phone number or an email so we can reach you.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          area,
          care_for: careFor,
          care_recipient_name: careFor === 'myself' ? '' : careRecipientName,
          note,
          company,
        }),
      })
      if (!res.ok) {
        let message = 'Something went wrong. Please try again, or call us at (240) 290-5143.'
        try {
          const data = await res.json()
          if (data && typeof data.error === 'string' && data.error) message = data.error
        } catch {
          // keep the default message
        }
        setError(message)
        setSubmitting(false)
        return
      }
      setDone(true)
    } catch {
      setError('We could not reach the server. Please try again, or call us at (240) 290-5143.')
      setSubmitting(false)
    }
  }

  const shell: React.CSSProperties = {
    maxWidth: 640,
    margin: '0 auto',
    background: 'var(--surface-raised)',
    border: '1px solid var(--border)',
    borderTop: '3px solid var(--champagne)',
    borderRadius: 20,
    boxShadow: 'var(--shadow-deep)',
    padding: 'clamp(28px, 5vw, 44px)',
  }

  if (done) {
    return (
      <div style={shell}>
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--green-bright)',
            marginBottom: 14,
          }}
        >
          Request received
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(26px, 3.4vw, 34px)',
            fontWeight: 500,
            textAlign: 'center',
            marginBottom: 16,
            color: 'var(--text)',
          }}
        >
          Thank you — we have your request.
        </h2>
        <p
          style={{
            textAlign: 'center',
            fontSize: 14.5,
            color: 'var(--text-dim)',
            maxWidth: '46ch',
            margin: '0 auto 26px',
            lineHeight: 1.65,
          }}
        >
          A Vitalis care advisor will be calling you soon to talk through membership and arrange your
          home visit. If you shared an email, a confirmation is on its way.
        </p>
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--champagne)',
            borderRadius: 12,
            padding: '20px 24px',
            maxWidth: 420,
            margin: '0 auto',
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--champagne)',
              marginBottom: 4,
            }}
          >
            So you recognize our call
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            (240) 290-5143
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Please save this number as <strong style={{ color: 'var(--text)' }}>Vitalis Care Club</strong> —
            it&rsquo;s the line our team calls from.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={shell}>
      <div
        style={{
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--green-bright)',
          marginBottom: 14,
        }}
      >
        Founding memberships
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 3.6vw, 38px)',
          fontWeight: 500,
          textAlign: 'center',
          marginBottom: 16,
          color: 'var(--text)',
        }}
      >
        Request an invitation.
      </h2>
      <p
        style={{
          textAlign: 'center',
          fontSize: 14,
          color: 'var(--text-dim)',
          maxWidth: '48ch',
          margin: '0 auto 34px',
          lineHeight: 1.65,
        }}
      >
        This is a soft indication of interest — no commitment and no payment. A Vitalis care advisor
        will call you, then visit you at home with the full membership package and brochures.
      </p>

      <div style={fieldWrap}>
        <label style={labelStyle}>Your name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          maxLength={120}
          style={inputStyle}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={fieldWrap}>
          <label style={labelStyle}>Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(240) 000-0000"
            maxLength={25}
            style={inputStyle}
          />
        </div>
        <div style={fieldWrap}>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={254}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>Where would visits happen?</label>
        <select value={area} onChange={(e) => setArea(e.target.value)} style={inputStyle}>
          {AREA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldWrap}>
        <label style={labelStyle}>
          Who is the care for? <span style={optionalMark}>— optional</span>
        </label>
        <select value={careFor} onChange={(e) => setCareFor(e.target.value)} style={inputStyle}>
          {CARE_FOR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {careFor !== 'myself' && (
        <div style={fieldWrap}>
          <label style={labelStyle}>
            Their name <span style={optionalMark}>— if you&rsquo;d like to share</span>
          </label>
          <input
            type="text"
            value={careRecipientName}
            onChange={(e) => setCareRecipientName(e.target.value)}
            placeholder="The name of the person the care is for"
            maxLength={120}
            style={inputStyle}
          />
        </div>
      )}

      <div style={fieldWrap}>
        <label style={labelStyle}>
          Anything we should know? <span style={optionalMark}>— optional</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Tell us a little about the care you're considering…"
          maxLength={2000}
          style={{ ...inputStyle, resize: 'vertical', minHeight: 84 }}
        />
      </div>

      {/* Honeypot — hidden from people, tempting to bots */}
      <div style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
        <label>
          Company
          <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

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

      <button
        onClick={submit}
        disabled={submitting}
        style={{
          width: '100%',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--on-accent)',
          background: 'var(--green-dark)',
          border: 'none',
          cursor: submitting ? 'default' : 'pointer',
          opacity: submitting ? 0.7 : 1,
          padding: '15px 32px',
          borderRadius: 999,
          boxShadow: 'var(--shadow)',
          marginTop: 4,
        }}
      >
        {submitting ? 'Sending…' : 'Request an invitation'}
      </button>
      <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-dim)', marginTop: 18 }}>
        Prefer to talk first? Call{' '}
        <a href="tel:+12402905143" style={{ color: 'var(--green-dark)', fontWeight: 500, textDecoration: 'none' }}>
          (240) 290-5143
        </a>
        .
      </p>
      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-faint)', marginTop: 10 }}>
        We&rsquo;ll only use your details to talk to you about Care Club membership.
      </p>
    </div>
  )
}
