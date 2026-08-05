// The hour bank (v0.1.9). Presentational only: the profile page runs the
// period engine (lib/billing/periods.ts) and hands the results down. Server
// component — no interactivity, no client bundle weight.

import type { PeriodDisplay } from '@/lib/billing/periods'
import { formatMoney } from '@/lib/agreements/content'

function formatHours(value: number): string {
  const n = Number(value) || 0
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function formatPeriodDate(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-')
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const idx = parseInt(m, 10) - 1
  if (idx < 0 || idx > 11) return iso
  return `${months[idx]} ${parseInt(d, 10)}, ${y}`
}

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border-soft)',
  borderRadius: 14,
  boxShadow: 'var(--shadow)',
  padding: '22px 26px',
} as const

const metricLabel = {
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  fontWeight: 600,
  marginBottom: 3,
} as const

const metricValue = {
  fontSize: 20,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
} as const

export default function HourBankCard({
  periods,
  overageRateCents,
  weekendRateCents,
  emptyMessage,
}: {
  periods: PeriodDisplay[]
  overageRateCents: number
  weekendRateCents: number
  emptyMessage: string | null
}) {
  const currentPeriod = periods.find((p) => p.current) || periods[0] || null
  const pastPeriods = periods.filter((p) => p !== currentPeriod)

  return (
    <div style={card}>
      <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 4px' }}>
        The hour bank
      </h2>
      <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px' }}>
        Visit hours against the tier, month by month. Each period runs anniversary to anniversary.
      </p>

      {emptyMessage && (
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>{emptyMessage}</p>
      )}

      {!emptyMessage && currentPeriod && (
        <>
          <div style={{ ...metricLabel, marginBottom: 10 }}>
            Current period · {formatPeriodDate(currentPeriod.periodStart)} – {formatPeriodDate(currentPeriod.periodEndInclusive)}
          </div>

          <div style={{ display: 'flex', gap: 34, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <div style={metricLabel}>Included</div>
              <div style={metricValue}>{formatHours(currentPeriod.hoursIncluded)} hrs</div>
            </div>
            <div>
              <div style={metricLabel}>Used</div>
              <div style={metricValue}>{formatHours(currentPeriod.hoursUsed)} hrs</div>
            </div>
            <div>
              <div style={metricLabel}>Committed</div>
              <div style={{ ...metricValue, color: 'var(--text-dim)' }}>
                {formatHours(currentPeriod.committedHours)} hrs
              </div>
            </div>
            <div>
              <div style={metricLabel}>Remaining</div>
              <div
                style={{
                  ...metricValue,
                  color: currentPeriod.hoursRemaining === 0 ? 'var(--amber)' : 'var(--green-bright)',
                }}
              >
                {formatHours(currentPeriod.hoursRemaining)} hrs
              </div>
            </div>
            <div>
              <div style={metricLabel}>Free cancels left</div>
              <div
                style={{
                  ...metricValue,
                  color: currentPeriod.freeCancelsRemaining === 0 ? 'var(--amber)' : 'var(--text)',
                }}
              >
                {currentPeriod.freeCancelsRemaining}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: 14, display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-dim)' }}>
                Overage this period · {formatMoney(overageRateCents)}/hr
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: currentPeriod.overageHours > 0 ? 'var(--amber)' : 'var(--text-faint)',
                }}
              >
                {formatHours(currentPeriod.overageHours)} hrs · {formatMoney(currentPeriod.overageHours * overageRateCents)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-dim)' }}>
                Weekend visits this period · {formatMoney(weekendRateCents)}/hr
                {currentPeriod.committedWeekendHours > 0
                  ? ` (${formatHours(currentPeriod.committedWeekendHours)} hrs scheduled ahead)`
                  : ''}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: currentPeriod.weekendHours > 0 ? 'var(--amber)' : 'var(--text-faint)',
                }}
              >
                {formatHours(currentPeriod.weekendHours)} hrs · {formatMoney(currentPeriod.weekendHours * weekendRateCents)}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--text-faint)', margin: '2px 0 0' }}>
              Accrued charges bill automatically at period close, alongside the renewal.
            </p>
          </div>

          {pastPeriods.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-soft)', marginTop: 16, paddingTop: 14 }}>
              <div style={{ ...metricLabel, marginBottom: 8 }}>Past periods</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {pastPeriods.map((p) => (
                  <div
                    key={p.periodStart}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, flexWrap: 'wrap', gap: 8 }}
                  >
                    <span style={{ color: 'var(--text-dim)' }}>
                      {formatPeriodDate(p.periodStart)} – {formatPeriodDate(p.periodEndInclusive)}
                    </span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                      {formatHours(p.hoursUsed)} of {formatHours(p.hoursIncluded)} hrs
                      {p.overageHours > 0 ? ` · overage ${formatHours(p.overageHours)} hrs (${formatMoney(p.overageHours * overageRateCents)})` : ''}
                      {p.weekendHours > 0 ? ` · weekend ${formatHours(p.weekendHours)} hrs (${formatMoney(p.weekendHours * weekendRateCents)})` : ''}
                      {` · ${p.freeCancelsRemaining} free cancels left`}
                      {p.committedHours + p.committedWeekendHours > 0 && (
                        <span
                          style={{ color: 'var(--amber)', fontWeight: 600 }}
                          title="Visits in this closed period were never marked completed, canceled, or no-show — the hour bank billed without them."
                        >
                          {` · ${formatHours(p.committedHours + p.committedWeekendHours)} hrs unresolved`}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
