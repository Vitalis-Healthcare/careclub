import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseUpdateInput } from '@/lib/clients/validate'
import { stripeConfigured } from '@/lib/stripe/server'
import { chargeFirstMonth } from '@/lib/stripe/charges'

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
      .select('id, name, status, stripe_customer_id, stripe_payment_method_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }

    const { data: tier } = await svc
      .from('tiers')
      .select('id, name, monthly_price_cents')
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

    // The first-month charge fires on the TRANSITION into active \u2014 members
    // already active (including anyone activated before card billing shipped)
    // are never re-charged by an edit. A decline or a missing card BLOCKS the
    // activation by ruling: no member goes active unpaid.
    const activating = existing.status !== 'active' && input.status === 'active'
    if (activating) {
      if (!existing.stripe_payment_method_id || !existing.stripe_customer_id) {
        return NextResponse.json(
          { error: 'No payment card on file, so the first month cannot be charged. The member saves a card from their signing link \u2014 copy it from the Membership agreement card \u2014 then activate.' },
          { status: 400 }
        )
      }
      if (!stripeConfigured()) {
        return NextResponse.json(
          { error: 'Card payments are not configured, so the first month cannot be charged. Activation is blocked until Stripe is set up.' },
          { status: 503 }
        )
      }
      const charge = await chargeFirstMonth({
        clientId: existing.id,
        clientName: existing.name,
        customerId: existing.stripe_customer_id,
        paymentMethodId: existing.stripe_payment_method_id,
        amountCents: tier.monthly_price_cents,
        tierName: tier.name,
      })
      if (!charge.ok) {
        return NextResponse.json({ error: charge.error }, { status: charge.status })
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
