// Validation rules for cluster create/edit, shared by both API routes.
// Salary is stored in cents. Bounds: $1,000 - $20,000 per month.

export const MIN_SALARY_CENTS = 100000
export const MAX_SALARY_CENTS = 2000000
export const DEFAULT_SALARY_CENTS = 375000

export function validateSalaryCents(value: unknown): { cents: number | null; error: string | null } {
  const cents = typeof value === 'number' ? Math.round(value) : NaN
  if (!Number.isFinite(cents)) {
    return { cents: null, error: 'Monthly salary is required.' }
  }
  if (cents < MIN_SALARY_CENTS || cents > MAX_SALARY_CENTS) {
    return { cents: null, error: 'Monthly salary must be between $1,000 and $20,000.' }
  }
  return { cents, error: null }
}

export function parseCreateInput(body: unknown): {
  input: { zone_id: string; monthly_salary_cents: number } | null
  error: string | null
} {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>
  const zoneId = typeof b.zone_id === 'string' ? b.zone_id.trim() : ''
  if (!zoneId) return { input: null, error: 'Pick a zone for the cluster.' }

  const { cents, error } = validateSalaryCents(b.monthly_salary_cents)
  if (cents === null) return { input: null, error }

  return { input: { zone_id: zoneId, monthly_salary_cents: cents }, error: null }
}

export function parseUpdateInput(body: unknown): {
  input: {
    monthly_salary_cents: number
    status: 'active' | 'forming' | 'inactive'
    caregiver_id?: string | null
  } | null
  error: string | null
} {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  const { cents, error } = validateSalaryCents(b.monthly_salary_cents)
  if (cents === null) return { input: null, error }

  const status = b.status
  if (status !== 'active' && status !== 'forming' && status !== 'inactive') {
    return { input: null, error: 'Status must be active, forming, or inactive.' }
  }

  // caregiver_id is optional: absent means leave unchanged, null means unassign,
  // a string means assign that caregiver (server verifies availability).
  if ('caregiver_id' in b) {
    const cgId = b.caregiver_id
    if (cgId !== null && typeof cgId !== 'string') {
      return { input: null, error: 'Invalid caregiver reference.' }
    }
    return {
      input: { monthly_salary_cents: cents, status, caregiver_id: cgId === null ? null : cgId },
      error: null,
    }
  }

  return { input: { monthly_salary_cents: cents, status }, error: null }
}

// Given existing cluster names in a zone, produce the next name per the
// [ABBREV]-[number] convention (SSC-1, SSC-2, ...).
export function nextClusterName(abbreviation: string, existingNames: string[]): string {
  const prefix = abbreviation.toUpperCase() + '-'
  let highest = 0
  for (const name of existingNames) {
    if (name.toUpperCase().startsWith(prefix)) {
      const suffix = parseInt(name.slice(prefix.length), 10)
      if (Number.isFinite(suffix) && suffix > highest) highest = suffix
    }
  }
  return `${abbreviation.toUpperCase()}-${highest + 1}`
}
