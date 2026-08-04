import { addMonthsClamped, addDays } from '@/lib/billing/dates'

// Billing card on the member profile. v0.1.7-b: card on file plus the payment
// history and the next renewal date. Anniversary model: N succeeded charges
// cover N months from the billing start date, so the next renewal is simply
// billing_start_date + N months (clamped). Members activated before card
// billing shipped have an empty history and no renewal line — the v0.1.7-c
// cron will pick them up once a first payment exists. Server-renderable.

export interface PaymentDisplay {
  id: string
  kind: 'first_month' | 'renewal'
  amount_cents: number
  status: 'succeeded' | 'failed'
  label: string
  failure_message: string | null
  created_at: string
}

function formatMoney(cents: number): string {
  return '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatDate(value: string | null): string {
  if (!value) return '\u2014'
  const [y, m, d] = value.split('T')[0].split('-')
  if (!y || !m || !d) return value
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIdx = parseInt(m, 10) - 1
  if (monthIdx < 0 || monthIdx > 11) return value
  return `${months[monthIdx]} ${parseInt(d, 10)}, ${y}`
}

export default function BillingCard({
  cardBrand,
  cardLast4,
  cardExpMonth,
  cardExpYear,
  hasCard,
  agreementSigned,
  payments,
  billingStartDate,
  memberActive,
}: {
  cardBrand: string | null
  cardLast4: string | null
  cardExpMonth: number | null
  cardExpYear: number | null
  hasCard: boolean
  agreementSigned: boolean
  payments: PaymentDisplay[]
  billingStartDate: string | null
  memberActive: boolean
}) {
  const card: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '24px 26px',
  }

  const exp =
    cardExpMonth != null && cardExpYear != null
      ? `${String(cardExpMonth).padStart(2, '0')}/${String(cardExpYear).slice(-2)}`
      : null

  const succeededCount = payments.filter((p) => p.status === 'succeeded').length
  // payments arrive newest-first; a failed renewal at the top of an active
  // member's history means the 10-day non-payment window is running.
  const latest = payments[0] || null
  const renewalFailing = Boolean(
    memberActive && latest && latest.status === 'failed' && latest.kind === 'renewal'
  )
  const pauseDate = renewalFailing && latest ? addDays(latest.created_at, 10) : null
  const nextRenewal =
    memberActive && billingStartDate && succeededCount > 0
      ? addMonthsClamped(billingStartDate, succeededCount)
      : null

  return (
    <div style={card}>
      <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 18px' }}>
        Billing
      </h2>

      {hasCard ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--green-bright)',
              background: 'var(--green-glow)',
            }}
          >
            Card on file
          </span>
          <span style={{ fontSize: 14.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {(cardBrand || 'Card').toUpperCase()} {'\u2022\u2022\u2022\u2022'} {cardLast4 || '????'}
          </span>
          {exp && <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>Expires {exp}</span>}
          {nextRenewal && (
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              Next renewal <b style={{ color: 'var(--text)' }}>{formatDate(nextRenewal)}</b>
            </span>
          )}
        </div>
      ) : (
        <div
          style={{
            background: 'var(--amber-glow)',
            border: '1px solid var(--amber)',
            borderRadius: 10,
            padding: '14px 18px',
            fontSize: 13.5,
            color: 'var(--amber)',
            fontWeight: 600,
          }}
        >
          No payment card on file.
          <span style={{ display: 'block', fontWeight: 400, color: 'var(--text-dim)', marginTop: 4 }}>
            {agreementSigned
              ? 'The member saves a card from their signing link \u2014 re-send or copy the link from the Membership agreement card above.'
              : 'The member saves a card as part of signing the membership agreement.'}
          </span>
        </div>
      )}

      {renewalFailing && pauseDate && latest && (
        <div
          style={{
            background: 'var(--amber-glow)',
            border: '1px solid var(--amber)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            color: 'var(--amber)',
            fontWeight: 600,
            marginTop: 14,
          }}
        >
          Renewal payment failed {formatDate(latest.created_at)} \u2014 the membership pauses {formatDate(pauseDate)} if
          unpaid. The daily run retries the card about every 3 days; the pause itself is applied by Staff
          from Edit membership.
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 18, paddingTop: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 10 }}>
          Payment history
        </div>
        {payments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
            No charges yet. The first charge fires when the billing start date is confirmed after the
            nurse assessment.
          </p>
        ) : (
          payments.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                flexWrap: 'wrap',
                padding: '8px 0',
                fontSize: 13.5,
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: p.status === 'succeeded' ? 'var(--green-bright)' : 'var(--red)',
                  background: p.status === 'succeeded' ? 'var(--green-glow)' : 'var(--red-glow)',
                }}
              >
                {p.status === 'succeeded' ? 'Paid' : 'Failed'}
              </span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(p.amount_cents)}</span>
              <span style={{ color: 'var(--text)' }}>{p.label}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 12.5 }}>{formatDate(p.created_at)}</span>
              {p.status === 'failed' && p.failure_message && (
                <span style={{ color: 'var(--red)', fontSize: 12.5, width: '100%' }}>{p.failure_message}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
