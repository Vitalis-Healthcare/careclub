import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseShiftAction, NEXT_BLOCK, EXTENDED_END } from '@/lib/shifts/validate'
import { BLOCK_END, VISIT_HOURS } from '@/lib/patterns/validate'
import type { BlockStart } from '@/lib/patterns/validate'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
    return NextResponse.json({ error: 'Only Vitalis staff can manage visits.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { input, error } = parseShiftAction(body)
  if (!input) {
    return NextResponse.json({ error }, { status: 400 })
  }

  try {
    const { data: shift } = await svc
      .from('shifts')
      .select('id, cluster_id, shift_date, start_time, end_time, duration_hours, status, is_overage')
      .eq('id', id)
      .single()

    if (!shift) {
      return NextResponse.json({ error: 'Visit not found.' }, { status: 404 })
    }

    const start = String(shift.start_time).slice(0, 5) as BlockStart

    const update: Record<string, unknown> = {}

    if (input.action === 'complete') {
      if (shift.status !== 'scheduled') {
        return NextResponse.json({ error: 'Only scheduled visits can be marked completed.' }, { status: 400 })
      }
      update.status = 'completed'
    } else if (input.action === 'no_show') {
      if (shift.status !== 'scheduled') {
        return NextResponse.json({ error: 'Only scheduled visits can be marked as a no-show.' }, { status: 400 })
      }
      update.status = 'no_show'
    } else if (input.action === 'cancel') {
      if (shift.status !== 'scheduled') {
        return NextResponse.json({ error: 'Only scheduled visits can be canceled.' }, { status: 400 })
      }
      update.status = 'canceled'
      update.cancel_type = input.cancel_type
    } else if (input.action === 'revert') {
      if (shift.status === 'scheduled') {
        return NextResponse.json({ error: 'This visit is already scheduled.' }, { status: 400 })
      }
      update.status = 'scheduled'
      update.cancel_type = null
    } else if (input.action === 'extend') {
      if (shift.status !== 'scheduled') {
        return NextResponse.json({ error: 'Only scheduled visits can be extended.' }, { status: 400 })
      }
      if (shift.is_overage) {
        return NextResponse.json({ error: 'This visit is already extended.' }, { status: 400 })
      }
      const extendedEnd = EXTENDED_END[start]
      if (!extendedEnd) {
        return NextResponse.json({ error: 'This visit is outside the standard blocks and cannot be extended here.' }, { status: 400 })
      }
      const nextBlock = NEXT_BLOCK[start]
      if (nextBlock) {
        const { data: blocking } = await svc
          .from('shifts')
          .select('id')
          .eq('cluster_id', shift.cluster_id)
          .eq('shift_date', shift.shift_date)
          .eq('start_time', nextBlock)
          .neq('status', 'canceled')

        if (blocking && blocking.length > 0) {
          return NextResponse.json(
            { error: `The ${nextBlock === '10:30' ? '10:30 AM' : '1:00 PM'} block is taken, so this visit cannot run long. Book the extra hour as a separate visit instead.` },
            { status: 409 }
          )
        }
      }
      update.end_time = extendedEnd
      update.duration_hours = VISIT_HOURS + 1
      update.is_overage = true
    } else if (input.action === 'remove_extension') {
      if (!shift.is_overage) {
        return NextResponse.json({ error: 'This visit has no extension to remove.' }, { status: 400 })
      }
      const baseEnd = BLOCK_END[start]
      if (!baseEnd) {
        return NextResponse.json({ error: 'This visit is outside the standard blocks.' }, { status: 400 })
      }
      update.end_time = baseEnd
      update.duration_hours = VISIT_HOURS
      update.is_overage = false
    }

    const { data, error: dbError } = await svc
      .from('shifts')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Could not update the visit. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ shift: data })
  } catch {
    return NextResponse.json({ error: 'Could not update the visit. Please try again.' }, { status: 500 })
  }
}
