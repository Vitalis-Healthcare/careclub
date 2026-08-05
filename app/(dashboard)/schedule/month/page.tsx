import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import { addDays, BLOCK_LABELS } from '@/lib/patterns/validate'
import type { BlockStart } from '@/lib/patterns/validate'

// Month at a glance: weekday-only calendar (Mon-Fri columns) with every
// cluster's visits in each day cell, colored by status. Working days only —
// weekend scheduling arrives with the weekend UI in a later phase.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parseMonth(value: unknown): { year: number; month: number } | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return null
  const [y, m] = value.split('-').map(n => parseInt(n, 10))
  if (m < 1 || m > 12) return null
  return { year: y, month: m }
}

function currentMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, '0')}`
}

function shiftMonth(y: number, m: number, delta: number): { year: number; month: number } {
  const idx = (y * 12 + (m - 1)) + delta
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 }
}

export default async function ScheduleMonthPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const { year, month } = parseMonth(monthParam) || currentMonth()

  const firstOfMonth = `${year}-${String(month).padStart(2, '0')}-01`
  const firstDow = new Date(firstOfMonth + 'T00:00:00Z').getUTCDay() // 0=Sun
  // Monday of the week containing the 1st
  const gridStart = addDays(firstOfMonth, -((firstDow + 6) % 7))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lastOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  // Build Mon-Fri rows until the row start passes the month end.
  const weeks: string[][] = []
  let cursor = gridStart
  while (cursor <= lastOfMonth) {
    weeks.push([0, 1, 2, 3, 4].map(i => addDays(cursor, i)))
    cursor = addDays(cursor, 7)
  }
  const gridEnd = addDays(weeks[weeks.length - 1][4], 0)

  const svc = createServiceClient()
  const [{ data: shifts }, { data: clusters }] = await Promise.all([
    svc.from('shifts').select('id, client_id, cluster_id, shift_date, start_time, status, is_overage, clients(name)').gte('shift_date', gridStart).lte('shift_date', gridEnd).order('start_time'),
    svc.from('clusters').select('id, name'),
  ])

  const clusterNameById = new Map<string, string>()
  for (const c of clusters || []) clusterNameById.set(c.id as string, c.name as string)

  const allShifts = shifts || []
  const monthShifts = allShifts.filter(s => (s.shift_date as string) >= firstOfMonth && (s.shift_date as string) <= lastOfMonth)
  const completedCount = monthShifts.filter(s => s.status === 'completed').length
  const scheduledCount = monthShifts.filter(s => s.status === 'scheduled').length

  const memberNameOf = (s: { clients: { name: string } | { name: string }[] | null }): string => {
    const c = Array.isArray(s.clients) ? s.clients[0] : s.clients
    return c?.name || '—'
  }

  const statusColor = (status: string, conflictless = true): string => {
    if (status === 'completed') return 'var(--green-text)'
    if (status === 'canceled') return 'var(--red)'
    if (status === 'no_show') return 'var(--amber)'
    return conflictless ? 'var(--text-dim)' : 'var(--amber)'
  }

  const prev = shiftMonth(year, month, -1)
  const next = shiftMonth(year, month, 1)
  const nowMonth = currentMonth()
  const isCurrentMonth = year === nowMonth.year && month === nowMonth.month

  const navLink = {
    fontSize: 12.5,
    fontWeight: 600,
    color: 'var(--text-dim)',
    textDecoration: 'none',
    padding: '7px 12px',
    border: '1px solid var(--border)',
    borderRadius: 8,
  } as const

  return (
    <>
      <PageHead eyebrow="Operations" title="Schedule" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-display), serif', fontSize: 24, fontWeight: 600 }}>
            {MONTHS[month - 1]} {year}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
            {monthShifts.length} {monthShifts.length === 1 ? 'visit' : 'visits'} · {completedCount} completed · {scheduledCount} ahead
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/schedule" style={navLink}>Week view</Link>
          <Link href={`/schedule/month?month=${monthKey(prev.year, prev.month)}`} style={navLink}>← Previous</Link>
          {!isCurrentMonth && <Link href="/schedule/month" style={navLink}>This month</Link>}
          <Link href={`/schedule/month?month=${monthKey(next.year, next.month)}`} style={navLink}>Next →</Link>
        </div>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 14,
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(d => (
            <div
              key={d}
              style={{
                padding: '12px 14px',
                fontSize: 10.5,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-faint)',
                fontWeight: 600,
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {d}
            </div>
          ))}
          {weeks.map((week, wi) =>
            week.map((date) => {
              const inMonth = date >= firstOfMonth && date <= lastOfMonth
              const dayShifts = allShifts.filter(s => s.shift_date === date)
              const dayNum = parseInt(date.slice(8, 10), 10)
              return (
                <div
                  key={date}
                  style={{
                    minHeight: 108,
                    padding: '10px 12px',
                    borderBottom: wi < weeks.length - 1 ? '1px solid var(--border-soft)' : 'none',
                    borderRight: '1px solid var(--border-soft)',
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 6, fontVariantNumeric: 'tabular-nums' }}>
                    {dayNum}
                  </div>
                  {dayShifts.slice(0, 4).map((s) => (
                    <Link
                      key={s.id as string}
                      href={`/schedule?week=${addDays(date, -((new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7))}`}
                      style={{
                        display: 'block',
                        fontSize: 11,
                        color: statusColor(s.status as string),
                        textDecoration: s.status === 'canceled' ? 'line-through' : 'none',
                        marginBottom: 3,
                      }}
                    >
                      {(BLOCK_LABELS[(s.start_time as string).slice(0, 5) as BlockStart] || (s.start_time as string).slice(0, 5))}
                      {' · '}
                      {memberNameOf(s as { clients: { name: string } | { name: string }[] | null })}
                      {clusterNameById.size > 1 ? ` · ${clusterNameById.get(s.cluster_id as string) || ''}` : ''}
                      {Boolean(s.is_overage) && s.status !== 'canceled' && <span style={{ color: 'var(--champagne)' }}> +1</span>}
                    </Link>
                  ))}
                  {dayShifts.length > 4 && (
                    <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
                      +{dayShifts.length - 4} more
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 24 }}>
        Click any visit to jump to its week on the board, where visits can be completed, canceled, or extended.
      </p>
    </>
  )
}
