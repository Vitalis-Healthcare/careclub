// Validation rules for team account creation and role changes. Shared by
// both API routes so the rules cannot drift.

import type { UserRole } from '@/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface TeammateInput {
  full_name: string
  email: string
  role: UserRole
}

export function parseTeammateInput(body: unknown): { input: TeammateInput | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  const fullName = typeof b.full_name === 'string' ? b.full_name.trim() : ''
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  const role = b.role === 'admin' || b.role === 'scheduler' ? (b.role as UserRole) : null

  if (fullName.length < 2) {
    return { input: null, error: 'A full name is required.' }
  }
  if (!EMAIL_RE.test(email)) {
    return { input: null, error: 'A valid email address is required.' }
  }
  if (!role) {
    return { input: null, error: 'Role must be Admin or Staff.' }
  }

  return { input: { full_name: fullName, email, role }, error: null }
}

export function parseRolePatch(body: unknown): { role: UserRole | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { role: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>
  if (b.role !== 'admin' && b.role !== 'scheduler') {
    return { role: null, error: 'Role must be Admin or Staff.' }
  }
  return { role: b.role as UserRole, error: null }
}
