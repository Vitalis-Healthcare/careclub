// Validation for the public signing submission. The token is the
// authentication; this validates only the payload shape and sizes.

import { DIRECTIVE_OPTIONS } from '@/lib/agreements/content'

const VALID_DIRECTIVE_KEYS = DIRECTIVE_OPTIONS.map(o => o.key as string)

export interface SignInput {
  signer_name: string
  signature_data: string
  directive_choices: string[]
}

export function parseSignInput(body: unknown): { input: SignInput | null; error: string | null } {
  if (typeof body !== 'object' || body === null) {
    return { input: null, error: 'Invalid request body.' }
  }
  const b = body as Record<string, unknown>

  const name = typeof b.signer_name === 'string' ? b.signer_name.trim() : ''
  if (!name) return { input: null, error: 'Type your full name (or your representative\u2019s) to sign.' }
  if (name.length > 120) return { input: null, error: 'The signed name must be 120 characters or fewer.' }

  const sig = typeof b.signature_data === 'string' ? b.signature_data : ''
  if (!sig.startsWith('data:image/png;base64,')) {
    return { input: null, error: 'Draw your signature in the box before signing.' }
  }
  if (sig.length < 200) {
    return { input: null, error: 'The signature looks empty \u2014 draw your signature in the box.' }
  }
  if (sig.length > 400000) {
    return { input: null, error: 'The signature image is too large. Clear the box and sign again.' }
  }

  const rawChoices = Array.isArray(b.directive_choices) ? b.directive_choices : []
  const choices: string[] = []
  for (const c of rawChoices) {
    if (typeof c !== 'string' || !VALID_DIRECTIVE_KEYS.includes(c)) {
      return { input: null, error: 'Invalid advance directive selection.' }
    }
    if (!choices.includes(c)) choices.push(c)
  }
  if (choices.length === 0) {
    return { input: null, error: 'Choose at least one option in the Advance Directives section (\u201cNo Advance Directive\u201d is a valid choice).' }
  }

  return { input: { signer_name: name, signature_data: sig, directive_choices: choices }, error: null }
}
