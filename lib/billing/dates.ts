// Anniversary date arithmetic for the billing model: renewals fall on the
// same day-of-month as the billing start date, clamped to the last day of
// shorter months (a Jan 31 anniversary bills Feb 28/29, Mar 31, Apr 30...).
// Pure string math on yyyy-mm-dd — no Date timezone surprises.

function daysInMonth(year: number, month: number): number {
  // month is 1-12
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function addMonthsClamped(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split('T')[0].split('-').map((v) => parseInt(v, 10))
  if (!y || !m || !d) return isoDate
  const zeroBased = m - 1 + months
  const targetYear = y + Math.floor(zeroBased / 12)
  const targetMonth = (zeroBased % 12) + 1
  const targetDay = Math.min(d, daysInMonth(targetYear, targetMonth))
  const mm = String(targetMonth).padStart(2, '0')
  const dd = String(targetDay).padStart(2, '0')
  return `${targetYear}-${mm}-${dd}`
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('T')[0].split('-').map((v) => parseInt(v, 10))
  if (!y || !m || !d) return isoDate
  const t = new Date(Date.UTC(y, m - 1, d + days))
  const mm = String(t.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(t.getUTCDate()).padStart(2, '0')
  return `${t.getUTCFullYear()}-${mm}-${dd}`
}

// Whole days from `fromIso` to `toIso` (positive when toIso is later).
export function daysBetween(fromIso: string, toIso: string): number {
  const parse = (s: string) => {
    const [y, m, d] = s.split('T')[0].split('-').map((v) => parseInt(v, 10))
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((parse(toIso) - parse(fromIso)) / 86400000)
}

// Today as yyyy-mm-dd in the agency's timezone. The cron runs on UTC servers;
// anniversaries are Maryland dates.
export function todayInEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}
