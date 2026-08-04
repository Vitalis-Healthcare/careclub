// Standing pattern validation, shared by the patterns route and the week
// generator so the rules cannot drift.
//
// The scheduling grid (Option B ruling, 4 Aug 2026): visits are 2 billed
// hours inside 2.5-hour blocks. Block starts 8:00 / 10:30 / 13:00 give a
// caregiver three buffer-clean visits inside the 8:00-16:00 workday.
// day_of_week uses the JavaScript convention: 0=Sun ... 6=Sat. Phase 1
// patterns are weekday-only (1-5); weekend scheduling arrives later.

export const BLOCK_STARTS = ['08:00', '10:30', '13:00'] as const
export type BlockStart = (typeof BLOCK_STARTS)[number]

export const BLOCK_END: Record<BlockStart, string> = {
  '08:00': '10:00',
  '10:30': '12:30',
  '13:00': '15:00',
}

export const BLOCK_LABELS: Record<BlockStart, string> = {
  '08:00': '8:00 AM',
  '10:30': '10:30 AM',
  '13:00': '1:00 PM',
}

export const PATTERN_DAYS = [1, 2, 3, 4, 5] as const // Mon-Fri
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const VISIT_HOURS = 2.0

export interface PatternInput {
  day_of_week: number
  start_time: BlockStart
}

export function parsePatternSet(body: unknown): { patterns: PatternInput[] | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { patterns: null, error: 'Invalid request body.' }
  }
  const raw = (body as Record<string, unknown>).patterns
  if (!Array.isArray(raw)) {
    return { patterns: null, error: 'Send a patterns array (it may be empty to clear the week).' }
  }
  if (raw.length > 15) {
    return { patterns: null, error: 'A standing week cannot hold more than 15 visits.' }
  }

  const seen = new Set<string>()
  const patterns: PatternInput[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) {
      return { patterns: null, error: 'Invalid pattern entry.' }
    }
    const p = item as Record<string, unknown>
    const day = typeof p.day_of_week === 'number' ? Math.round(p.day_of_week) : NaN
    if (!Number.isFinite(day) || !(PATTERN_DAYS as readonly number[]).includes(day)) {
      return { patterns: null, error: 'Visits can be placed Monday through Friday for now.' }
    }
    const start = typeof p.start_time === 'string' ? p.start_time.slice(0, 5) : ''
    if (!(BLOCK_STARTS as readonly string[]).includes(start)) {
      return { patterns: null, error: 'Visit times must be one of the standard blocks: 8:00 AM, 10:30 AM, or 1:00 PM.' }
    }
    const key = `${day}-${start}`
    if (seen.has(key)) continue
    seen.add(key)
    patterns.push({ day_of_week: day, start_time: start as BlockStart })
  }
  return { patterns, error: null }
}

// Week helpers: the board and the generator both anchor on a Monday.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseMonday(value: unknown): string | null {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return null
  const d = new Date(value + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return null
  if (d.getUTCDay() !== 1) return null
  return value
}

export function currentMonday(): string {
  const now = new Date()
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const back = (utc.getUTCDay() + 6) % 7
  utc.setUTCDate(utc.getUTCDate() - back)
  return utc.toISOString().slice(0, 10)
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
