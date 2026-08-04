// Shift action validation, shared by the shift route and any future callers.
//
// Extension rule (Option B ruling): a visit may extend by one hour, booked as
// overage, only when the next block in the same cluster on the same day is
// free — the buffer absorbs minutes, empty slots absorb hours.
// 8:00 extends to 11:00 (needs 11:00 free — the extension ends exactly at
// the next block's start), 11:00 extends to 14:00 (same, needs 14:00 free),
// and 14:00 extends to 17:00: the last block has no following visit, and by
// Okezie's ruling (4 Aug 2026) paid overage may run one hour past the 16:00
// caregiver day end, with the aide's consent confirmed by Staff before the
// extension is recorded.

import type { BlockStart } from '@/lib/patterns/validate'

export const SHIFT_ACTIONS = ['complete', 'no_show', 'cancel', 'extend', 'remove_extension', 'revert'] as const
export type ShiftAction = (typeof SHIFT_ACTIONS)[number]

export const NEXT_BLOCK: Record<BlockStart, BlockStart | null> = {
  '08:00': '11:00',
  '11:00': '14:00',
  '14:00': null,
}

export const EXTENDED_END: Record<BlockStart, string> = {
  '08:00': '11:00',
  '11:00': '14:00',
  '14:00': '17:00',
}

export interface ShiftActionInput {
  action: ShiftAction
  cancel_type: 'free' | 'forfeit' | null
}

export function parseShiftAction(body: unknown): { input: ShiftActionInput | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>
  const action = b.action
  if (typeof action !== 'string' || !(SHIFT_ACTIONS as readonly string[]).includes(action)) {
    return { input: null, error: 'Unknown visit action.' }
  }
  let cancelType: 'free' | 'forfeit' | null = null
  if (action === 'cancel') {
    if (b.cancel_type !== 'free' && b.cancel_type !== 'forfeit') {
      return { input: null, error: 'Choose whether the cancellation is free or a forfeit.' }
    }
    cancelType = b.cancel_type
  }
  return { input: { action: action as ShiftAction, cancel_type: cancelType }, error: null }
}

// True when the visit starts less than 48 hours from now. 48-hour notice is
// a Maryland promise, so both sides of the comparison are Eastern wall
// clocks (v0.1.9-b; the old form compared against a UTC-constructed time
// and misjudged by several hours near the boundary).
export function isShortNotice(shiftDate: string, startTime: string): boolean {
  const nowEastern = new Date().toLocaleString('en-CA', {
    timeZone: 'America/New_York',
    hour12: false,
  })
  const [nowDate, nowTime] = nowEastern.split(', ')
  if (!nowDate || !nowTime) return false
  const wallClockMs = (d: string, t: string): number => {
    const [y, m, day] = d.split('-').map((n: string) => parseInt(n, 10))
    const [h, min] = t.split(':').map((n: string) => parseInt(n, 10))
    if (!y || !m || !day || Number.isNaN(h) || Number.isNaN(min)) return NaN
    return Date.UTC(y, m - 1, day, h, min)
  }
  const visit = wallClockMs(shiftDate.split('T')[0], startTime.slice(0, 5))
  const now = wallClockMs(nowDate, nowTime)
  if (Number.isNaN(visit) || Number.isNaN(now)) return false
  return visit - now < 48 * 60 * 60 * 1000
}
