import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import BuildWeekButton from '@/components/schedule/BuildWeekButton'
import { parseMonday, currentMonday, addDays, BLOCK_LABELS } from '@/lib/patterns/validate'
import type { BlockStart } from '@/lib/patterns/validate'

interface ShiftRow {
  id: string
  client_id: string
  cluster_id: string
  shift_date: string
  start_time: string
  status: string
  clients: { name: string } | { name: string }[] | null
}

function formatDayHeading(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`
}

function formatWeekRange(monday: string): string {
  return `${formatDayHeading(monday)} – ${formatDayHeading(addDays(monday, 4))}`
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const monday = parseMonday(week) || currentMonday()
  const friday = addDays(monday, 4)
  const days = [0, 1, 2, 3, 4].map(i => addDays(monday, i))
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  const [
    { data: clusters },
    { data: shifts },
    { data: zones },
  ] = await Promise.all([
    svc.from('clusters').select('id, name, zone_id, status, caregivers(name)').order('name'),
    svc.from('shifts').select('id, client_id, cluster_id, shift_date, start_time, status, clients(name)').gte('shift_date', monday).lte('shift_date', friday).order('start_time'),
    svc.from('zones').select('id, name'),
  ])

  const allClusters = clusters || []
  const allShifts = (shifts || []) as ShiftRow[]
  const isStaff = Boolean(user)

  const zoneNameById = new Map<string, string>()
  for (const z of zones || []) zoneNameById.set(z.id as string, z.name as string)

  // Conflict = two shifts in the same cluster, same day, same block.
  const conflictKeys = new Set<string>()
  const slotCounts = new Map<string, number>()
  for (const s of allShifts) {
    const key = `${s.cluster_id}|${s.shift_date}|${s.start_time.slice(0, 5)}`
    slotCounts.set(key, (slotCounts.get(key) || 0) + 1)
  }
  for (const [key, count] of slotCounts) {
    if (count > 1) conflictKeys.add(key)
  }
  const conflictCount = Array.from(slotCounts.values()).filter(c => c > 1).length

  const memberNameOf = (s: ShiftRow): string => {
    const c = Array.isArray(s.clients) ? s.clients[0] : s.clients
    return c?.name || '—'
  }

  const timeLabel = (start: string): string => {
    const key = start.slice(0, 5) as BlockStart
    return BLOCK_LABELS[key] || start.slice(0, 5)
  }

  const isCurrentWeek = monday === currentMonday()

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
      <PageHead
        eyebrow="Operations"
        title="Schedule"
        right={isStaff ? <BuildWeekButton weekStart={monday} /> : undefined}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-display), serif', fontSize: 24, fontWeight: 600 }}>
            {formatWeekRange(monday)}
          </span>
          {isCurrentWeek && (
            <span
              style={{
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '3px 9px',
                borderRadius: 999,
                background: 'var(--green-glow)',
                color: 'var(--green-bright)',
              }}
            >
              This week
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/schedule?week=${addDays(monday, -7)}`} style={navLink}>← Previous</Link>
          {!isCurrentWeek && <Link href="/schedule" style={navLink}>This week</Link>}
          <Link href={`/schedule?week=${addDays(monday, 7)}`} style={navLink}>Next →</Link>
        </div>
      </div>

      {conflictCount > 0 && (
        <div
          style={{
            background: 'var(--amber-glow)',
            border: '1px solid var(--amber)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            color: 'var(--amber)',
            marginBottom: 20,
          }}
        >
          {conflictCount} {conflictCount === 1 ? 'block has' : 'blocks have'} more than one visit in the same cluster — one caregiver cannot be in two homes at once. Adjust the standing weeks so each block holds one visit.
        </div>
      )}

      {allClusters.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 14,
            boxShadow: 'var(--shadow)',
            padding: '56px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontFamily: 'var(--font-display), serif', fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>
            No clusters yet
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
            The board fills in once clusters exist and members have standing weeks.
          </p>
        </div>
      ) : (
        allClusters.map((cluster) => {
          const cg = Array.isArray(cluster.caregivers) ? cluster.caregivers[0] : cluster.caregivers
          const laneShifts = allShifts.filter(s => s.cluster_id === cluster.id)
          return (
            <div
              key={cluster.id as string}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-soft)',
                borderRadius: 14,
                boxShadow: 'var(--shadow)',
                padding: '20px 22px',
                marginBottom: 18,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
                <span style={{ fontFamily: 'var(--font-display), serif', fontSize: 19, fontWeight: 600 }}>
                  {cluster.name as string}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>
                  {zoneNameById.get(cluster.zone_id as string) || ''}
                  {cg?.name ? ` · ${cg.name}` : ' · no caregiver yet'}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 'auto' }}>
                  {laneShifts.length} {laneShifts.length === 1 ? 'visit' : 'visits'} this week
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {days.map((date, i) => {
                  const dayShifts = laneShifts.filter(s => s.shift_date === date)
                  return (
                    <div key={date}>
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'var(--text-faint)',
                          fontWeight: 600,
                          marginBottom: 8,
                        }}
                      >
                        {dayNames[i]} <span style={{ fontWeight: 500 }}>{formatDayHeading(date)}</span>
                      </div>
                      {dayShifts.length === 0 ? (
                        <div
                          style={{
                            border: '1px dashed var(--border-soft)',
                            borderRadius: 8,
                            padding: '14px 10px',
                            fontSize: 11.5,
                            color: 'var(--text-faint)',
                            textAlign: 'center',
                          }}
                        >
                          Open
                        </div>
                      ) : (
                        dayShifts.map((s) => {
                          const conflict = conflictKeys.has(`${s.cluster_id}|${s.shift_date}|${s.start_time.slice(0, 5)}`)
                          return (
                            <Link
                              key={s.id}
                              href={`/clients/${s.client_id}`}
                              style={{
                                display: 'block',
                                background: 'var(--surface-raised)',
                                border: `1px solid ${conflict ? 'var(--amber)' : 'var(--border-soft)'}`,
                                borderRadius: 8,
                                padding: '10px 12px',
                                marginBottom: 8,
                                textDecoration: 'none',
                                color: 'var(--text)',
                              }}
                            >
                              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>
                                {memberNameOf(s)}
                              </div>
                              <div style={{ fontSize: 11.5, color: conflict ? 'var(--amber)' : 'var(--text-dim)' }}>
                                {timeLabel(s.start_time)} · 2 hrs
                              </div>
                            </Link>
                          )
                        })
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 24 }}>
        Visits run 2 hours inside 2.5-hour blocks — the 30-minute tail covers travel and finishing up. Completing, canceling, and the monthly view arrive in v0.1.5-b.
      </p>
    </>
  )
}
