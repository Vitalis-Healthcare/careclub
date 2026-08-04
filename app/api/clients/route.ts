import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseEnrollInput } from '@/lib/clients/validate'

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
    return NextResponse.json({ error: 'Only administrators can enroll members.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { input, error } = parseEnrollInput(body)
  if (!input) {
    return NextResponse.json({ error }, { status: 400 })
  }

  try {
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
      if (cluster.status === 'inactive') {
        return NextResponse.json(
          { error: `${cluster.name} is inactive. Place the member in a forming or active cluster, or leave them on the waitlist.` },
          { status: 400 }
        )
      }
    }

    const { data, error: dbError } = await svc
      .from('clients')
      .insert(input)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Could not enroll the member. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ client: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not enroll the member. Please try again.' }, { status: 500 })
  }
}
