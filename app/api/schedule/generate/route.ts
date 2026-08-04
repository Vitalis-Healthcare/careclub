import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseMonday, addDays, BLOCK_END, VISIT_HOURS } from '@/lib/patterns/validate'
import type { BlockStart } from '@/lib/patterns/validate'

// "Build the week": materializes shifts from every active, placed member's
// standing pattern for the given Monday-anchored week. Idempotent by member
// and date — a member with any existing shift on a day is skipped for that
// day, so manual edits survive re-runs.

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'scheduler') {
    return NextResponse.json({ error: 'Only Vitalis staff can build the week.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const weekStart = parseMonday((body as Record<string, unknown>)?.week_start)
  if (!weekStart) {
    return NextResponse.json({ error: 'week_start must be a Monday in YYYY-MM-DD format.' }, { status: 400 })
  }
  const weekEnd = addDays(weekStart, 4) // Friday

  try {
    const [
      { data: members },
      { data: clusters },
      { data: existingShifts },
    ] = await Promise.all([
      svc.from('clients').select('id, cluster_id, status').eq('status', 'active').not('cluster_id', 'is', null),
      svc.from('clusters').select('id, caregiver_id, status'),
      svc.from('shifts').select('client_id, shift_date').gte('shift_date', weekStart).lte('shift_date', weekEnd),
    ])

    const activeMembers = members || []
    if (activeMembers.length === 0) {
      return NextResponse.json({ created: 0, skipped: 0, note: 'No active, placed members yet — visits generate once memberships are active and placed in a cluster.' })
    }

    const { data: patterns } = await svc
      .from('standing_patterns')
      .select('client_id, day_of_week, start_time')
      .in('client_id', activeMembers.map(m => m.id as string))

    const clusterById = new Map<string, { caregiver_id: string | null; status: string }>()
    for (const c of clusters || []) {
      clusterById.set(c.id as string, { caregiver_id: (c.caregiver_id as string | null) ?? null, status: c.status as string })
    }

    const taken = new Set<string>()
    for (const s of existingShifts || []) {
      taken.add(`${s.client_id}|${s.shift_date}`)
    }

    const inserts: {
      client_id: string
      cluster_id: string
      caregiver_id: string | null
      shift_date: string
      start_time: string
      end_time: string
      duration_hours: number
      status: 'scheduled'
      is_overage: boolean
      is_weekend: boolean
    }[] = []
    let skipped = 0

    for (const member of activeMembers) {
      const memberPatterns = (patterns || []).filter(p => p.client_id === member.id)
      for (const p of memberPatterns) {
        const day = p.day_of_week as number
        if (day < 1 || day > 5) continue // weekday grid only in Phase 1
        const shiftDate = addDays(weekStart, day - 1)
        const key = `${member.id}|${shiftDate}`
        if (taken.has(key)) {
          skipped += 1
          continue
        }
        const start = String(p.start_time).slice(0, 5) as BlockStart
        const end = BLOCK_END[start]
        if (!end) continue // pattern predates the block grid; surface via board absence rather than guessing
        const cluster = clusterById.get(member.cluster_id as string)
        inserts.push({
          client_id: member.id as string,
          cluster_id: member.cluster_id as string,
          caregiver_id: cluster?.caregiver_id ?? null,
          shift_date: shiftDate,
          start_time: start,
          end_time: end,
          duration_hours: VISIT_HOURS,
          status: 'scheduled',
          is_overage: false,
          is_weekend: false,
        })
        taken.add(key)
      }
    }

    if (inserts.length > 0) {
      const { error: insertError } = await svc.from('shifts').insert(inserts)
      if (insertError) {
        return NextResponse.json({ error: 'Could not build the week. Please try again.' }, { status: 500 })
      }
    }

    return NextResponse.json({ created: inserts.length, skipped })
  } catch {
    return NextResponse.json({ error: 'Could not build the week. Please try again.' }, { status: 500 })
  }
}
