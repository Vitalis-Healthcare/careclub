import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parsePatternSet } from '@/lib/patterns/validate'

// Replaces the member's entire standing week in one call, so the editor's
// saved state and the database can never partially diverge.

export async function PUT(
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
    return NextResponse.json({ error: 'Only Vitalis staff can edit standing schedules.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { patterns, error } = parsePatternSet(body)
  if (!patterns) {
    return NextResponse.json({ error }, { status: 400 })
  }

  try {
    const { data: member } = await svc
      .from('clients')
      .select('id')
      .eq('id', id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }

    const { error: deleteError } = await svc
      .from('standing_patterns')
      .delete()
      .eq('client_id', id)

    if (deleteError) {
      return NextResponse.json({ error: 'Could not save the standing week. Please try again.' }, { status: 500 })
    }

    if (patterns.length > 0) {
      const rows = patterns.map(p => ({
        client_id: id,
        day_of_week: p.day_of_week,
        start_time: p.start_time,
      }))
      const { error: insertError } = await svc
        .from('standing_patterns')
        .insert(rows)

      if (insertError) {
        return NextResponse.json({ error: 'Could not save the standing week. Please try again.' }, { status: 500 })
      }
    }

    return NextResponse.json({ saved: patterns.length })
  } catch {
    return NextResponse.json({ error: 'Could not save the standing week. Please try again.' }, { status: 500 })
  }
}
