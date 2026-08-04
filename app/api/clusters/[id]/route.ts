import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseUpdateInput } from '@/lib/clusters/validate'

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
    return NextResponse.json({ error: 'Only administrators can edit clusters.' }, { status: 403 })
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
      .from('clusters')
      .select('id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Cluster not found.' }, { status: 404 })
    }

    const update: {
      monthly_salary_cents: number
      status: 'active' | 'forming' | 'inactive'
      caregiver_id?: string | null
    } = {
      monthly_salary_cents: input.monthly_salary_cents,
      status: input.status,
    }

    if ('caregiver_id' in input) {
      if (input.caregiver_id) {
        const { data: caregiver } = await svc
          .from('caregivers')
          .select('id, status')
          .eq('id', input.caregiver_id)
          .single()

        if (!caregiver) {
          return NextResponse.json({ error: 'Caregiver not found.' }, { status: 404 })
        }
        if (caregiver.status !== 'active') {
          return NextResponse.json({ error: 'Only active caregivers can be assigned to a cluster.' }, { status: 400 })
        }

        const { data: taken } = await svc
          .from('clusters')
          .select('id, name')
          .eq('caregiver_id', input.caregiver_id)
          .neq('id', id)

        if (taken && taken.length > 0) {
          return NextResponse.json(
            { error: `That caregiver is already assigned to ${taken[0].name}. Each caregiver serves one cluster.` },
            { status: 409 }
          )
        }
      }
      update.caregiver_id = input.caregiver_id ?? null
    }

    const { data, error: dbError } = await svc
      .from('clusters')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json({ error: 'Could not save the cluster. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ cluster: data })
  } catch {
    return NextResponse.json({ error: 'Could not save the cluster. Please try again.' }, { status: 500 })
  }
}
