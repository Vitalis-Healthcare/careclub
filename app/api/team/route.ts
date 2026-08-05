import { randomInt } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseTeammateInput } from '@/lib/team/validate'

// Unambiguous alphabet: no 0/O, 1/l/I. Three groups of four gives a
// password that is strong and still readable over the phone.
const PW_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

function generateTempPassword(): string {
  const group = () =>
    Array.from({ length: 4 }, () => PW_ALPHABET[randomInt(PW_ALPHABET.length)]).join('')
  return `${group()}-${group()}-${group()}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can add teammates.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { input, error } = parseTeammateInput(body)
  if (!input) {
    return NextResponse.json({ error }, { status: 400 })
  }

  const tempPassword = generateTempPassword()

  // Auto Confirm ON (email_confirm: true) — admin-created accounts sign in
  // immediately with the temporary password; no confirmation email dance.
  const { data: created, error: createError } = await svc.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  })

  if (createError || !created?.user) {
    const message = createError?.message || ''
    if (/already/i.test(message)) {
      return NextResponse.json(
        { error: 'An account with that email already exists.' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Could not create the account. Please try again.' },
      { status: 500 }
    )
  }

  // The on_auth_user_created trigger has already inserted the profile row;
  // apply the chosen name and role on top of it.
  const { error: profileError } = await svc
    .from('profiles')
    .update({ full_name: input.full_name, role: input.role })
    .eq('id', created.user.id)

  if (profileError) {
    return NextResponse.json(
      { error: 'The account was created but the role could not be set. Refresh and adjust the role from the list.' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    id: created.user.id,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
    tempPassword,
  })
}
