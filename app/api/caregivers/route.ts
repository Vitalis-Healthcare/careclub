import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseCaregiverInput } from '@/lib/caregivers/validate'

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
    return NextResponse.json({ error: 'Only administrators can add caregivers.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { input, error } = parseCaregiverInput(body)
  if (!input) {
    return NextResponse.json({ error }, { status: 400 })
  }

  try {
    const { data, error: dbError } = await svc
      .from('caregivers')
      .insert(input)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Could not add the caregiver. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ caregiver: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not add the caregiver. Please try again.' }, { status: 500 })
  }
}
