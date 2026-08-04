import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Voids an agreement. Voiding a signed agreement is deliberate and rare
// (a correction before re-sending); the record itself is never deleted.

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

  if (profile?.role !== 'admin' && profile?.role !== 'scheduler') {
    return NextResponse.json({ error: 'Only Vitalis staff can void agreements.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if ((body as Record<string, unknown>)?.action !== 'void') {
    return NextResponse.json({ error: 'Unknown agreement action.' }, { status: 400 })
  }

  try {
    const { data: existing } = await svc
      .from('agreements')
      .select('id, status')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Agreement not found.' }, { status: 404 })
    }
    if (existing.status === 'void') {
      return NextResponse.json({ error: 'This agreement is already void.' }, { status: 400 })
    }

    const { data, error: dbError } = await svc
      .from('agreements')
      .update({ status: 'void', voided_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Could not void the agreement. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ agreement: data })
  } catch {
    return NextResponse.json({ error: 'Could not void the agreement. Please try again.' }, { status: 500 })
  }
}
