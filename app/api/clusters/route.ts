import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseCreateInput, nextClusterName } from '@/lib/clusters/validate'

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
    return NextResponse.json({ error: 'Only administrators can create clusters.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { input, error } = parseCreateInput(body)
  if (!input) {
    return NextResponse.json({ error }, { status: 400 })
  }

  try {
    const { data: zone } = await svc
      .from('zones')
      .select('id, abbreviation, status')
      .eq('id', input.zone_id)
      .single()

    if (!zone) {
      return NextResponse.json({ error: 'Zone not found.' }, { status: 404 })
    }
    if (zone.status !== 'active') {
      return NextResponse.json({ error: 'Clusters can only be added to active zones.' }, { status: 400 })
    }
    if (!zone.abbreviation) {
      return NextResponse.json(
        { error: 'This zone has no abbreviation yet. Edit the zone and set one first — cluster names are built from it.' },
        { status: 400 }
      )
    }

    const { data: existing } = await svc
      .from('clusters')
      .select('name')
      .eq('zone_id', zone.id)

    const name = nextClusterName(zone.abbreviation, (existing || []).map(c => c.name as string))

    const { data, error: dbError } = await svc
      .from('clusters')
      .insert({
        zone_id: zone.id,
        name,
        status: 'forming',
        monthly_salary_cents: input.monthly_salary_cents,
        payroll_burden_pct: 25,
      })
      .select()
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        return NextResponse.json(
          { error: 'A cluster with that name was just created. Please try again.' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Could not create the cluster. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ cluster: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not create the cluster. Please try again.' }, { status: 500 })
  }
}
