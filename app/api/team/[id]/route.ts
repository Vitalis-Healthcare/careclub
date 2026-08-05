import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseRolePatch } from '@/lib/team/validate'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
    return NextResponse.json({ error: 'Only administrators can change roles.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { role, error } = parseRolePatch(body)
  if (!role) {
    return NextResponse.json({ error }, { status: 400 })
  }

  const { data: target } = await svc
    .from('profiles')
    .select('id, role')
    .eq('id', id)
    .single()

  if (!target) {
    return NextResponse.json({ error: 'That account was not found.' }, { status: 404 })
  }

  // The portal can never lock itself out: the last remaining admin
  // cannot be made Staff.
  if (target.role === 'admin' && role === 'scheduler') {
    const { count } = await svc
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'The portal needs at least one administrator. Make someone else an Admin first.' },
        { status: 409 }
      )
    }
  }

  const { error: updateError } = await svc
    .from('profiles')
    .update({ role })
    .eq('id', id)

  if (updateError) {
    return NextResponse.json({ error: 'Could not change the role. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ id, role })
}
