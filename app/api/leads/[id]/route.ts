import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Lead status updates for the Sign-ups inbox (v0.1.13). Auth-gated,
// unlike the public POST one folder up: signed-in Staff or admin only,
// checked in-handler. Status is the ONLY mutable field — the lead's
// substance is what the person submitted, and it stays as submitted.

const LEAD_STATUSES = ['new', 'contacted', 'converted', 'closed'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Missing lead id.' }, { status: 400 })
  }

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
    return NextResponse.json({ error: 'Not permitted.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const status = (body as Record<string, unknown>)?.status
  if (typeof status !== 'string' || !(LEAD_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'Unknown status.' }, { status: 400 })
  }

  try {
    const { data: updated, error } = await svc
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select('id, status')
      .single()

    if (error || !updated) {
      return NextResponse.json({ error: 'Could not update the sign-up.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
  } catch {
    return NextResponse.json({ error: 'Could not update the sign-up.' }, { status: 500 })
  }
}
