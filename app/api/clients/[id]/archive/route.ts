import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// The member archive (v0.1.10). Archive is NOT a status: it is a reversible
// statement that this record belongs to the past, kept in full forever (a
// licensed agency retains records; the archive hides, it never destroys).
// Only canceled or waitlist members can be archived; active and paused
// memberships must be canceled first. Admin-only in both directions.

export async function POST(
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
    return NextResponse.json({ error: 'Only an administrator can archive or restore members.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const action = (body as Record<string, unknown>)?.action
  if (action !== 'archive' && action !== 'restore') {
    return NextResponse.json({ error: 'Unknown archive action.' }, { status: 400 })
  }

  try {
    const { data: member } = await svc
      .from('clients')
      .select('id, name, status, archived_at')
      .eq('id', id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }

    if (action === 'archive') {
      if (member.archived_at) {
        return NextResponse.json({ error: 'This member is already archived.' }, { status: 400 })
      }
      if (member.status === 'active' || member.status === 'paused') {
        return NextResponse.json(
          { error: 'Active and paused memberships cannot be archived. Cancel the membership first, then archive the record.' },
          { status: 400 }
        )
      }
    }
    if (action === 'restore' && !member.archived_at) {
      return NextResponse.json({ error: 'This member is not archived.' }, { status: 400 })
    }

    const { data, error: dbError } = await svc
      .from('clients')
      .update({ archived_at: action === 'archive' ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id, name, status, archived_at')
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Could not update the archive. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ client: data })
  } catch {
    return NextResponse.json({ error: 'Could not update the archive. Please try again.' }, { status: 500 })
  }
}
