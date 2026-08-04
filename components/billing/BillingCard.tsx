// Billing card on the member profile (v0.1.7). Display-only in this ship:
// card on file (brand, last 4, expiration) or an amber "no card" warning.
// Payment history and charge status arrive with the first-charge flow in
// v0.1.7-b. Server-renderable — no interactivity yet.

export default function BillingCard({
  cardBrand,
  cardLast4,
  cardExpMonth,
  cardExpYear,
  hasCard,
  agreementSigned,
}: {
  cardBrand: string | null
  cardLast4: string | null
  cardExpMonth: number | null
  cardExpYear: number | null
  hasCard: boolean
  agreementSigned: boolean
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

  return (
    <div style={card}>
      <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 18px' }}>
        Billing
      </h2>

      {hasCard ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
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

      <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: '16px 0 0' }}>
        The first charge fires when the billing start date is confirmed after the nurse assessment.
        Payment history arrives in v0.1.7-b.
      </p>
    </div>
  )
}
