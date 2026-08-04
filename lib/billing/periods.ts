// The period engine (v0.1.9). A billing period is one anniversary month: it
// opens on the member's anniversary and closes the day before the next one,
// using the same clamped date math as the renewals cron (addMonthsClamped),
// so the Billing card, the cron, and the hour bank can never disagree about
// where a month starts.
//
// VISITS ARE THE SINGLE SOURCE OF TRUTH. The billing_periods row is a
// write-through record: every read recomputes the counters from the visits
// inside the window and syncs the row when anything differs. The row can
// never drift from reality, and the overage/weekend billing ship can trust
// it at period close.
//
// Accounting rules (Okezie's rulings, 4 Aug 2026):
// - A completed weekday visit consumes its base 2 hours from the bank. The
//   extension hour of an extended visit is 1 hour of overage at the tier's
//   overage rate ($65).
// - Weekend visits never draw the bank: the whole visit accrues at the
//   weekend rate ($65/hr). Forfeit cancels and no-shows on weekend visits
//   accrue the same way (billed as delivered).
// - A forfeit cancel consumes the base 2 bank hours (an undelivered
//   extension hour accrues nothing). A no-show consumes the base 2 bank
//   hours and does NOT touch the free-cancel count.
// - A free cancel consumes no hours and decrements the free-cancel count.
// - hours_used is the RAW base-hour consumption and may exceed
//   hours_included (extra whole visits beyond the tier are warn-and-allow).
//   The stored overage_hours column carries the TOTAL billable overage:
//   extension hours PLUS any excess of hours_used over hours_included.
//   hours_remaining (generated) may therefore go negative; displays clamp
//   it at zero and show the excess as overage instead.
// - hours_included is a snapshot of the tier at the moment the period row
//   is created; past periods keep their history through tier changes.
//   (Rows backfilled lazily for months before this shipped snapshot the
//   member's CURRENT tier — the best information available.)

import { addMonthsClamped, addDays } from './dates'
import { createServiceClient } from '@/lib/supabase/service'

export const BASE_VISIT_HOURS = 2

export interface PeriodWindow {
  index: number
  start: string // yyyy-mm-dd, the anniversary (inclusive)
  endExclusive: string // the NEXT anniversary
  endInclusive: string // the day before the next anniversary
}

// Every period window from the billing start through the one containing
// `today`. Empty when the billing start is still in the future. Anniversary
// k is always computed from the ORIGIN date (billing start + k months,
// clamped) — identical to the renewals cron — so a Jan 31 start yields
// Jan 31 / Feb 28 / Mar 31, never a drifting Feb 28 / Mar 28.
export function periodWindows(billingStart: string, today: string): PeriodWindow[] {
  const origin = billingStart.split('T')[0]
  const windows: PeriodWindow[] = []
  if (today < origin) return windows
  for (let k = 0; k < 1200; k += 1) {
    const start = addMonthsClamped(origin, k)
    if (start > today) break
    const endExclusive = addMonthsClamped(origin, k + 1)
    windows.push({ index: k, start, endExclusive, endInclusive: addDays(endExclusive, -1) })
    if (endExclusive > today) break
  }
  return windows
}

export interface ShiftForAccounting {
  shift_date: string
  duration_hours: number
  status: 'scheduled' | 'completed' | 'canceled' | 'no_show'
  is_weekend: boolean
  cancel_type: 'free' | 'forfeit' | null
}

export interface PeriodAccounting {
  hoursUsed: number
  extensionOverageHours: number
  weekendHours: number
  committedHours: number
  committedWeekendHours: number
  freeCancelsUsed: number
}

export function computeAccounting(
  shifts: ShiftForAccounting[],
  window: PeriodWindow
): PeriodAccounting {
  const acc: PeriodAccounting = {
    hoursUsed: 0,
    extensionOverageHours: 0,
    weekendHours: 0,
    committedHours: 0,
    committedWeekendHours: 0,
    freeCancelsUsed: 0,
  }

  for (const shift of shifts) {
    const date = String(shift.shift_date).split('T')[0]
    if (date < window.start || date >= window.endExclusive) continue
    const duration = Number(shift.duration_hours) || BASE_VISIT_HOURS
    const forfeited = shift.status === 'canceled' && shift.cancel_type === 'forfeit'
    const freeCanceled = shift.status === 'canceled' && shift.cancel_type === 'free'

    if (shift.is_weekend) {
      if (shift.status === 'completed' || shift.status === 'no_show' || forfeited) {
        acc.weekendHours += duration
      } else if (shift.status === 'scheduled') {
        acc.committedWeekendHours += duration
      } else if (freeCanceled) {
        acc.freeCancelsUsed += 1
      }
      continue
    }

    if (shift.status === 'completed') {
      acc.hoursUsed += BASE_VISIT_HOURS
      acc.extensionOverageHours += Math.max(0, duration - BASE_VISIT_HOURS)
    } else if (shift.status === 'no_show' || forfeited) {
      acc.hoursUsed += BASE_VISIT_HOURS
    } else if (freeCanceled) {
      acc.freeCancelsUsed += 1
    } else if (shift.status === 'scheduled') {
      acc.committedHours += BASE_VISIT_HOURS
    }
  }

  return acc
}

// Total billable overage for a period: extension hours plus any whole-visit
// hours consumed beyond the tier's bank.
export function totalOverageHours(hoursIncluded: number, acc: PeriodAccounting): number {
  return acc.extensionOverageHours + Math.max(0, acc.hoursUsed - hoursIncluded)
}

export interface PeriodDisplay {
  periodStart: string
  periodEndInclusive: string
  current: boolean
  hoursIncluded: number
  hoursUsed: number
  hoursRemaining: number // clamped at zero for display
  committedHours: number
  overageHours: number // TOTAL billable overage (extensions + excess)
  weekendHours: number
  committedWeekendHours: number
  freeCancelsRemaining: number
}

interface EnsureParams {
  clientId: string
  billingStart: string
  currentTierHoursIncluded: number
  freeCancelsPerPeriod: number
  today: string
}

type Svc = ReturnType<typeof createServiceClient>

interface PeriodRow {
  id: string
  period_start: string
  period_end: string
  hours_included: number
  hours_used: number
  overage_hours: number
  weekend_hours: number
  free_cancels_remaining: number
}

// Ensure a billing_periods row exists for every window from the billing
// start through today, recompute each window's accounting from visits, sync
// any row whose stored counters differ, and return display structs newest
// first. Idempotent: safe to run on every profile view. Insert races are
// absorbed by the UNIQUE (client_id, period_start) constraint (23505 means
// another request created the row first — re-read and continue).
export async function ensureAndSyncPeriods(
  svc: Svc,
  params: EnsureParams
): Promise<PeriodDisplay[]> {
  const windows = periodWindows(params.billingStart, params.today)
  if (windows.length === 0) return []

  const { data: shiftData } = await svc
    .from('shifts')
    .select('shift_date, duration_hours, status, is_weekend, cancel_type')
    .eq('client_id', params.clientId)
    .gte('shift_date', windows[0].start)

  const shifts = (shiftData || []) as ShiftForAccounting[]

  const { data: rowData } = await svc
    .from('billing_periods')
    .select('id, period_start, period_end, hours_included, hours_used, overage_hours, weekend_hours, free_cancels_remaining')
    .eq('client_id', params.clientId)

  const rows = (rowData || []) as PeriodRow[]
  const rowByStart = new Map(rows.map((r) => [String(r.period_start).split('T')[0], r]))

  const displays: PeriodDisplay[] = []

  for (const window of windows) {
    const acc = computeAccounting(shifts, window)
    let row = rowByStart.get(window.start) || null
    const included = row ? Number(row.hours_included) : params.currentTierHoursIncluded
    const overage = totalOverageHours(included, acc)
    const cancelsRemaining = Math.max(0, params.freeCancelsPerPeriod - acc.freeCancelsUsed)

    if (!row) {
      const { data: inserted, error: insertError } = await svc
        .from('billing_periods')
        .insert({
          client_id: params.clientId,
          period_start: window.start,
          period_end: window.endInclusive,
          hours_included: included,
          hours_used: acc.hoursUsed,
          overage_hours: overage,
          weekend_hours: acc.weekendHours,
          free_cancels_remaining: cancelsRemaining,
        })
        .select('id, period_start, period_end, hours_included, hours_used, overage_hours, weekend_hours, free_cancels_remaining')
        .single()

      if (inserted) {
        row = inserted as PeriodRow
      } else if (insertError && insertError.code === '23505') {
        const { data: reread } = await svc
          .from('billing_periods')
          .select('id, period_start, period_end, hours_included, hours_used, overage_hours, weekend_hours, free_cancels_remaining')
          .eq('client_id', params.clientId)
          .eq('period_start', window.start)
          .single()
        row = (reread as PeriodRow) || null
      }
    } else {
      const drifted =
        Number(row.hours_used) !== acc.hoursUsed ||
        Number(row.overage_hours) !== overage ||
        Number(row.weekend_hours) !== acc.weekendHours ||
        Number(row.free_cancels_remaining) !== cancelsRemaining
      if (drifted) {
        await svc
          .from('billing_periods')
          .update({
            hours_used: acc.hoursUsed,
            overage_hours: overage,
            weekend_hours: acc.weekendHours,
            free_cancels_remaining: cancelsRemaining,
          })
          .eq('id', row.id)
      }
    }

    displays.push({
      periodStart: window.start,
      periodEndInclusive: window.endInclusive,
      current: params.today >= window.start && params.today < window.endExclusive,
      hoursIncluded: included,
      hoursUsed: acc.hoursUsed,
      hoursRemaining: Math.max(0, included - acc.hoursUsed),
      committedHours: acc.committedHours,
      overageHours: overage,
      weekendHours: acc.weekendHours,
      committedWeekendHours: acc.committedWeekendHours,
      freeCancelsRemaining: cancelsRemaining,
    })
  }

  displays.reverse()
  return displays
}
