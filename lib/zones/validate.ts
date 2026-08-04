// Validation rules for zone create/edit. Shared by both API routes so the
// rules cannot drift. Bounds form a sanity fence around the Maryland
// service area to catch transposed signs and swapped lat/lng pairs.

export interface ZoneInput {
  name: string
  abbreviation: string
  center_address: string | null
  center_lat: number
  center_lng: number
  radius_miles: number
  notes: string | null
  status?: 'active' | 'inactive'
}

export function parseZoneInput(body: unknown): { input: ZoneInput | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  const name = typeof b.name === 'string' ? b.name.trim() : ''
  const abbreviation = typeof b.abbreviation === 'string' ? b.abbreviation.trim().toUpperCase() : ''
  const centerAddress = typeof b.center_address === 'string' && b.center_address.trim() !== ''
    ? b.center_address.trim()
    : null
  const notes = typeof b.notes === 'string' && b.notes.trim() !== '' ? b.notes.trim() : null
  const lat = typeof b.center_lat === 'number' ? b.center_lat : NaN
  const lng = typeof b.center_lng === 'number' ? b.center_lng : NaN
  const radius = typeof b.radius_miles === 'number' ? b.radius_miles : NaN
  const status = b.status === 'inactive' ? 'inactive' as const : b.status === 'active' ? 'active' as const : undefined

  if (!name) return { input: null, error: 'Zone name is required.' }
  if (name.length > 80) return { input: null, error: 'Zone name must be 80 characters or fewer.' }
  if (!abbreviation) return { input: null, error: 'Abbreviation is required.' }
  if (abbreviation.length > 6) return { input: null, error: 'Abbreviation must be 6 characters or fewer.' }
  if (!/^[A-Z0-9]+$/.test(abbreviation)) return { input: null, error: 'Abbreviation may only contain letters and numbers.' }
  if (!Number.isFinite(lat) || lat < 38 || lat > 40) {
    return { input: null, error: 'Latitude must be between 38 and 40 (the Maryland service area).' }
  }
  if (!Number.isFinite(lng) || lng < -78 || lng > -76) {
    return { input: null, error: 'Longitude must be between -78 and -76 (the Maryland service area).' }
  }
  if (!Number.isFinite(radius) || radius < 0.5 || radius > 25) {
    return { input: null, error: 'Radius must be between 0.5 and 25 miles.' }
  }

  return {
    input: {
      name,
      abbreviation,
      center_address: centerAddress,
      center_lat: lat,
      center_lng: lng,
      radius_miles: radius,
      notes,
      status,
    },
    error: null,
  }
}

// Postgres unique_violation
export function uniqueViolationMessage(code: string | undefined, constraintHint: string): string | null {
  if (code !== '23505') return null
  if (constraintHint.includes('abbreviation')) return 'That abbreviation is already used by another zone.'
  if (constraintHint.includes('name')) return 'That zone name is already in use.'
  return 'A zone with those details already exists.'
}
