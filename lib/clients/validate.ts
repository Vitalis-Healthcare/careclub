// Validation rules for Club member (clients table) enroll/edit, shared by
// both API routes so the rules cannot drift. The interface says "Club
// members"; the database keeps the clients table name.
//
// Coordinates are optional (geocoding degrades gracefully without the Maps
// key) but when provided must pass the same Maryland sanity fence as zones.

export type ClientStatus = 'waitlist' | 'active' | 'paused' | 'canceled'

export const CLIENT_STATUSES: readonly ClientStatus[] = ['waitlist', 'active', 'paused', 'canceled']

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ClientEnrollInput {
  name: string
  address: string
  lat: number | null
  lng: number | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_email: string | null
  cluster_id: string | null
  tier_id: string
  status: 'waitlist'
  billing_start_date: null
}

export interface ClientUpdateInput {
  name: string
  address: string
  lat: number | null
  lng: number | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_email: string | null
  cluster_id: string | null
  tier_id: string
  status: ClientStatus
  billing_start_date: string | null
}

interface CommonFields {
  name: string
  address: string
  lat: number | null
  lng: number | null
  phone: string | null
  email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_email: string | null
  cluster_id: string | null
  tier_id: string
}

function parseCommon(b: Record<string, unknown>): { fields: CommonFields | null; error: string | null } {
  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (!name) return { fields: null, error: 'Member name is required.' }
  if (name.length > 100) return { fields: null, error: 'Name must be 100 characters or fewer.' }

  const address = typeof b.address === 'string' ? b.address.trim() : ''
  if (!address) return { fields: null, error: 'Home address is required — care happens at the member\u2019s home.' }
  if (address.length > 200) return { fields: null, error: 'Address must be 200 characters or fewer.' }

  const phone = typeof b.phone === 'string' && b.phone.trim() !== '' ? b.phone.trim() : null
  const email = typeof b.email === 'string' && b.email.trim() !== '' ? b.email.trim() : null
  if (!phone && !email) {
    return { fields: null, error: 'Provide at least a phone number or an email address.' }
  }
  if (email && !EMAIL_RE.test(email)) {
    return { fields: null, error: 'That email address does not look valid.' }
  }

  // Coordinates: both-or-neither; Maryland sanity fence when present.
  const rawLat = b.lat
  const rawLng = b.lng
  const hasLat = rawLat !== null && rawLat !== undefined
  const hasLng = rawLng !== null && rawLng !== undefined
  let lat: number | null = null
  let lng: number | null = null
  if (hasLat !== hasLng) {
    return { fields: null, error: 'Provide both latitude and longitude, or leave both blank.' }
  }
  if (hasLat && hasLng) {
    lat = typeof rawLat === 'number' ? rawLat : NaN
    lng = typeof rawLng === 'number' ? rawLng : NaN
    if (!Number.isFinite(lat) || lat < 38 || lat > 40) {
      return { fields: null, error: 'Latitude must be between 38 and 40 (the Maryland service area).' }
    }
    if (!Number.isFinite(lng) || lng < -78 || lng > -76) {
      return { fields: null, error: 'Longitude must be between -78 and -76 (the Maryland service area).' }
    }
  }

  const emergencyName = typeof b.emergency_contact_name === 'string' && b.emergency_contact_name.trim() !== ''
    ? b.emergency_contact_name.trim()
    : null
  const emergencyPhone = typeof b.emergency_contact_phone === 'string' && b.emergency_contact_phone.trim() !== ''
    ? b.emergency_contact_phone.trim()
    : null
  const emergencyEmail = typeof b.emergency_contact_email === 'string' && b.emergency_contact_email.trim() !== ''
    ? b.emergency_contact_email.trim()
    : null
  if (emergencyEmail && !EMAIL_RE.test(emergencyEmail)) {
    return { fields: null, error: 'The emergency contact email does not look valid.' }
  }

  const tierId = typeof b.tier_id === 'string' ? b.tier_id.trim() : ''
  if (!tierId) return { fields: null, error: 'Pick a membership tier.' }

  const clusterId = typeof b.cluster_id === 'string' && b.cluster_id.trim() !== ''
    ? b.cluster_id.trim()
    : null

  return {
    fields: {
      name,
      address,
      lat,
      lng,
      phone,
      email,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      emergency_contact_email: emergencyEmail,
      cluster_id: clusterId,
      tier_id: tierId,
    },
    error: null,
  }
}

// Enroll: new members always start on the waitlist with no billing date.
export function parseEnrollInput(body: unknown): { input: ClientEnrollInput | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const { fields, error } = parseCommon(body as Record<string, unknown>)
  if (!fields) return { input: null, error }

  return {
    input: { ...fields, status: 'waitlist', billing_start_date: null },
    error: null,
  }
}

// Edit: full record update including status transitions. Activating requires
// a billing start date; pausing/canceling keeps the existing date as history.
export function parseUpdateInput(body: unknown): { input: ClientUpdateInput | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>
  const { fields, error } = parseCommon(b)
  if (!fields) return { input: null, error }

  const status = b.status
  if (typeof status !== 'string' || !(CLIENT_STATUSES as readonly string[]).includes(status)) {
    return { input: null, error: 'Status must be waitlist, active, paused, or canceled.' }
  }

  let billingStartDate: string | null = null
  const rawDate = b.billing_start_date
  if (typeof rawDate === 'string' && rawDate.trim() !== '') {
    const trimmed = rawDate.trim()
    if (!DATE_RE.test(trimmed)) {
      return { input: null, error: 'Billing start date must be in YYYY-MM-DD format.' }
    }
    billingStartDate = trimmed
  }

  if (status === 'active' && !billingStartDate) {
    return { input: null, error: 'Set a billing start date to activate this membership.' }
  }

  return {
    input: { ...fields, status: status as ClientStatus, billing_start_date: billingStartDate },
    error: null,
  }
}
