import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseUpdateInput } from '@/lib/clients/validate'

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
    return NextResponse.json({ error: 'Only Vitalis staff can edit memberships.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { input, error } = parseUpdateInput(body)
  if (!input) {
    return NextResponse.json({ error }, { status: 400 })
  }

  try {
    const { data: existing } = await svc
      .from('clients')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }

    const { data: tier } = await svc
      .from('tiers')
      .select('id')
      .eq('id', input.tier_id)
      .single()

    if (!tier) {
      return NextResponse.json({ error: 'That membership tier was not found.' }, { status: 404 })
    }

    if (input.cluster_id) {
      const { data: cluster } = await svc
        .from('clusters')
        .select('id, name, status')
        .eq('id', input.cluster_id)
        .single()

      if (!cluster) {
        return NextResponse.json({ error: 'That cluster was not found.' }, { status: 404 })
      }
      // Canceled members may keep their historical cluster reference even if
      // the cluster has since been deactivated; anyone still counted must sit
      // in a forming or active cluster.
      if (cluster.status === 'inactive' && input.status !== 'canceled') {
        return NextResponse.json(
          { error: `${cluster.name} is inactive. Place the member in a forming or active cluster, or move them to the waitlist.` },
          { status: 400 }
        )
      }
    }

    const { data, error: dbError } = await svc
      .from('clients')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Could not save the membership. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ client: data })
  } catch {
    return NextResponse.json({ error: 'Could not save the membership. Please try again.' }, { status: 500 })
  }
}
