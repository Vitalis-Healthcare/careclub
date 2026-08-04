import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe, stripeConfigured } from '@/lib/stripe/server'
import { formatMemberNumber } from '@/lib/clients/options'

// Public: the signing token is the authentication, same as the sign route.
// Only a SIGNED agreement may start card capture — the card step follows the
// signature. Creates the member's Stripe customer on first use, then a
// SetupIntent (card saved, never charged here).

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 20) {
    return NextResponse.json({ error: 'Invalid signing link.' }, { status: 404 })
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: 'Card payments are not configured yet. Vitalis will contact you about payment.' },
      { status: 503 }
    )
  }

  const svc = createServiceClient()

  try {
    const { data: agreement } = await svc
      .from('agreements')
      .select('id, status, client_id, clients(id, name, email, member_number, stripe_customer_id, stripe_payment_method_id)')
      .eq('token', token)
      .single()

    if (!agreement) {
      return NextResponse.json({ error: 'This signing link is not valid.' }, { status: 404 })
    }
    if (agreement.status === 'void') {
      return NextResponse.json({ error: 'This signing link is no longer active.' }, { status: 410 })
    }
    if (agreement.status !== 'signed') {
      return NextResponse.json({ error: 'Please sign the agreement first.' }, { status: 409 })
    }

    const memberRel = Array.isArray(agreement.clients) ? agreement.clients[0] : agreement.clients
    if (!memberRel) {
      return NextResponse.json({ error: 'No Club member is attached to this agreement.' }, { status: 404 })
    }
    if (memberRel.stripe_payment_method_id) {
      return NextResponse.json({ error: 'A payment card is already on file.' }, { status: 409 })
    }

    const stripe = getStripe()

    let customerId: string | null = memberRel.stripe_customer_id || null
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: memberRel.name,
        email: memberRel.email || undefined,
        metadata: {
          careclub_client_id: memberRel.id,
          member_number: formatMemberNumber(memberRel.member_number),
        },
      })
      customerId = customer.id
      const { error: dbError } = await svc
        .from('clients')
        .update({ stripe_customer_id: customerId })
        .eq('id', memberRel.id)
      if (dbError) {
        return NextResponse.json({ error: 'Could not attach the payment account to the member.' }, { status: 500 })
      }
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { careclub_client_id: memberRel.id },
    })

    return NextResponse.json({ client_secret: setupIntent.client_secret })
  } catch {
    return NextResponse.json(
      { error: 'Could not start the card setup. Please try again.' },
      { status: 500 }
    )
  }
}
