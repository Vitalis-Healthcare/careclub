// Validation rules for caregiver create/edit, shared by both API routes.
// Work days are stored as lowercase three-letter codes; shift times as HH:MM.

import { validateSalaryCents } from '@/lib/clusters/validate'

export const VALID_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const DEFAULT_WORK_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri']
export const DEFAULT_SHIFT_START = '08:00'
export const DEFAULT_SHIFT_END = '16:00'

export interface CaregiverInput {
  name: string
  phone: string | null
  email: string | null
  monthly_salary_cents: number
  work_days: string[]
  shift_start: string
  shift_end: string
  status: 'active' | 'inactive'
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, 5)
  return TIME_RE.test(trimmed) ? trimmed : null
}

export function parseCaregiverInput(body: unknown): { input: CaregiverInput | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (!name) return { input: null, error: 'Caregiver name is required.' }
  if (name.length > 100) return { input: null, error: 'Name must be 100 characters or fewer.' }

  const phone = typeof b.phone === 'string' && b.phone.trim() !== '' ? b.phone.trim() : null
  const email = typeof b.email === 'string' && b.email.trim() !== '' ? b.email.trim() : null
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { input: null, error: 'That email address does not look valid.' }
  }

  const { cents, error: salaryError } = validateSalaryCents(b.monthly_salary_cents)
  if (cents === null) return { input: null, error: salaryError }

  const rawDays = Array.isArray(b.work_days) ? b.work_days : null
  if (!rawDays || rawDays.length === 0) {
    return { input: null, error: 'Pick at least one work day.' }
  }
  const days: string[] = []
  for (const d of rawDays) {
    if (typeof d !== 'string' || !(VALID_DAYS as readonly string[]).includes(d)) {
      return { input: null, error: 'Invalid work day in the list.' }
    }
    if (!days.includes(d)) days.push(d)
  }

  const shiftStart = normalizeTime(b.shift_start)
  const shiftEnd = normalizeTime(b.shift_end)
  if (!shiftStart || !shiftEnd) {
    return { input: null, error: 'Shift times must be in HH:MM format.' }
  }
  if (shiftStart >= shiftEnd) {
    return { input: null, error: 'Shift start must be before shift end.' }
  }

  const status = b.status === 'inactive' ? 'inactive' as const : 'active' as const

  return {
    input: {
      name,
      phone,
      email,
      monthly_salary_cents: cents,
      work_days: days,
      shift_start: shiftStart,
      shift_end: shiftEnd,
      status,
    },
    error: null,
  }
}
