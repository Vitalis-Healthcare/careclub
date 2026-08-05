// Validation for the Club sign-in link request. Shared shape with the other
// validate modules so the rules cannot drift.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseLinkRequest(body: unknown): { email: string | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { email: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email)) {
    return { email: null, error: 'A valid email address is required.' }
  }
  return { email, error: null }
}
