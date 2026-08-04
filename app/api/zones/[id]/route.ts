import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseZoneInput, uniqueViolationMessage } from '@/lib/zones/validate'

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
    return NextResponse.json({ error: 'Only administrators can edit zones.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { input, error } = parseZoneInput(body)
  if (!input) {
    return NextResponse.json({ error }, { status: 400 })
  }

  try {
    const { data: existing } = await svc
      .from('zones')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Zone not found.' }, { status: 404 })
    }

    const { data, error: dbError } = await svc
      .from('zones')
      .update({
        name: input.name,
        abbreviation: input.abbreviation,
        center_address: input.center_address,
        center_lat: input.center_lat,
        center_lng: input.center_lng,
        radius_miles: input.radius_miles,
        notes: input.notes,
        status: input.status || 'active',
      })
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      const friendly = uniqueViolationMessage(dbError.code, dbError.message || '')
      return NextResponse.json(
        { error: friendly || 'Could not save the zone. Please try again.' },
        { status: friendly ? 409 : 500 }
      )
    }

    return NextResponse.json({ zone: data })
  } catch {
    return NextResponse.json({ error: 'Could not save the zone. Please try again.' }, { status: 500 })
  }
}
