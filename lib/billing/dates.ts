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
