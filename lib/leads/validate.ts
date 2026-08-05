// Validation for public sign-up leads (v0.1.12). The form is public by
// design, so validation is strict: length caps on everything, constrained
// enums, at least one way to reach the person, and a honeypot signal the
// route uses to discard bot submissions silently.

export const LEAD_AREAS = ['silver_spring', 'rockville_germantown', 'annapolis', 'baltimore_county'] as const
export const LEAD_CARE_FOR = ['myself', 'parent', 'spouse_partner', 'other'] as const

export type LeadArea = (typeof LEAD_AREAS)[number]
export type LeadCareFor = (typeof LEAD_CARE_FOR)[number]

export const LEAD_AREA_LABELS: Record<LeadArea, string> = {
  silver_spring: 'Silver Spring',
  rockville_germantown: 'Rockville / Germantown',
  annapolis: 'Annapolis',
  baltimore_county: 'Baltimore County',
}

export const LEAD_CARE_FOR_LABELS: Record<LeadCareFor, string> = {
  myself: 'Myself',
  parent: 'A parent',
  spouse_partner: 'A spouse or partner',
  other: 'Someone else',
}

export interface ValidatedLead {
  name: string
  phone: string | null
  email: string | null
  area: LeadArea
  care_for: LeadCareFor | null
  care_recipient_name: string | null
  note: string | null
}

type ValidationResult = { error: string } | { honeypot: boolean; lead: ValidatedLead }

function asTrimmedString(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function validateLead(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null) {
    return { error: 'Invalid request.' }
  }
  const raw = body as Record<string, unknown>

  // Honeypot: a real person never sees this field. A non-empty value means
  // the caller should accept and discard silently.
  const honeypot = typeof raw.company === 'string' && raw.company.trim().length > 0

  const name = asTrimmedString(raw.name, 120)
  if (!name) return { error: 'Please tell us your name.' }

  const emailInput = asTrimmedString(raw.email, 254).toLowerCase()
  let email: string | null = null
  if (emailInput) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      return { error: 'That email address does not look right — please check it.' }
    }
    email = emailInput
  }

  const phoneInput = asTrimmedString(raw.phone, 25)
  let phone: string | null = null
  if (phoneInput) {
    const digits = phoneInput.replace(/[^0-9]/g, '')
    if (digits.length < 7 || digits.length > 15) {
      return { error: 'That phone number does not look right — please check it.' }
    }
    phone = digits
  }

  if (!phone && !email) {
    return { error: 'Please share a phone number or an email so we can reach you.' }
  }

  const areaInput = asTrimmedString(raw.area, 40)
  if (!(LEAD_AREAS as readonly string[]).includes(areaInput)) {
    return { error: 'Please choose where visits would happen.' }
  }
  const area = areaInput as LeadArea

  const careForInput = asTrimmedString(raw.care_for, 40)
  let care_for: LeadCareFor | null = null
  if (careForInput) {
    if (!(LEAD_CARE_FOR as readonly string[]).includes(careForInput)) {
      return { error: 'Invalid request.' }
    }
    care_for = careForInput as LeadCareFor
  }

  const recipientInput = asTrimmedString(raw.care_recipient_name, 120)
  const care_recipient_name = care_for && care_for !== 'myself' && recipientInput ? recipientInput : null

  const noteInput = asTrimmedString(raw.note, 2000)
  const note = noteInput || null

  return {
    honeypot,
    lead: { name, phone, email, area, care_for, care_recipient_name, note },
  }
}
