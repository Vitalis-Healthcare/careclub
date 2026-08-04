import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseZoneInput, uniqueViolationMessage } from '@/lib/zones/validate'

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
    return NextResponse.json({ error: 'Only administrators can create zones.' }, { status: 403 })
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
    const { data, error: dbError } = await svc
      .from('zones')
      .insert({
        name: input.name,
        abbreviation: input.abbreviation,
        center_address: input.center_address,
        center_lat: input.center_lat,
        center_lng: input.center_lng,
        radius_miles: input.radius_miles,
        notes: input.notes,
        status: 'active',
      })
      .select()
      .single()

    if (dbError) {
      const friendly = uniqueViolationMessage(dbError.code, dbError.message || '')
      return NextResponse.json(
        { error: friendly || 'Could not create the zone. Please try again.' },
        { status: friendly ? 409 : 500 }
      )
    }

    return NextResponse.json({ zone: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not create the zone. Please try again.' }, { status: 500 })
  }
}
