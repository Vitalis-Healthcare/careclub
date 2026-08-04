// Shift action validation, shared by the shift route and any future callers.
//
// Extension rule (Option B ruling): a visit may extend by one hour, booked as
// overage, only when the next block in the same cluster on the same day is
// free — the 30-minute buffer absorbs minutes, empty slots absorb hours.
// 8:00 extends to 11:00 (needs 10:30 free), 10:30 extends to 13:30 (needs
// 13:00 free), 13:00 extends to 16:00 (no following block; fits the workday).

import type { BlockStart } from '@/lib/patterns/validate'

export const SHIFT_ACTIONS = ['complete', 'no_show', 'cancel', 'extend', 'remove_extension', 'revert'] as const
export type ShiftAction = (typeof SHIFT_ACTIONS)[number]

export const NEXT_BLOCK: Record<BlockStart, BlockStart | null> = {
  '08:00': '10:30',
  '10:30': '13:00',
  '13:00': null,
}

export const EXTENDED_END: Record<BlockStart, string> = {
  '08:00': '11:00',
  '10:30': '13:30',
  '13:00': '16:00',
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

// True when the visit starts less than 48 hours from now (used for the
// warn-not-block cancellation notice; the count itself arrives in v0.1.7).
export function isShortNotice(shiftDate: string, startTime: string): boolean {
  const start = new Date(`${shiftDate}T${startTime.slice(0, 5)}:00Z`)
  if (Number.isNaN(start.getTime())) return false
  return start.getTime() - Date.now() < 48 * 60 * 60 * 1000
}
