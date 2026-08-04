import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe, stripeConfigured } from '@/lib/stripe/server'
import { saveCardFromSetupIntent } from '@/lib/stripe/cards'

// Stripe webhook receiver — a NEW pattern for this repo. Signature-verified
// with STRIPE_WEBHOOK_SECRET against the RAW request body (never parse JSON
// before verification). Idempotent: every event id is inserted into
// stripe_events first; a duplicate delivery hits the primary key and is
// acknowledged without re-processing.
//
// v0.1.7 acts on setup_intent.succeeded (card saved at signing). Payment
// events are recorded for the ledger and handled in v0.1.7-b.

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeConfigured() || !secret) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 400 })
  }

  const rawBody = await request.text()

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret)
  } catch {
    return NextResponse.json({ error: 'Signature verification failed.' }, { status: 400 })
  }

  const svc = createServiceClient()

  // Idempotency gate: first delivery inserts, re-deliveries conflict (23505).
  try {
    const { error: insertError } = await svc
      .from('stripe_events')
      .insert({ id: event.id, type: event.type })
    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ received: true, duplicate: true })
      }
      return NextResponse.json({ error: 'Could not record the event.' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Could not record the event.' }, { status: 500 })
  }

  try {
    if (event.type === 'setup_intent.succeeded') {
      const si = event.data.object as Stripe.SetupIntent
      await saveCardFromSetupIntent(si.id)
    }
    // payment_intent.succeeded / payment_intent.payment_failed: recorded in
    // stripe_events above; charge handling ships in v0.1.7-b.
  } catch {
    // The event is recorded; processing failures must not make Stripe retry
    // forever against a poison event. Acknowledge and surface via the profile.
  }

  return NextResponse.json({ received: true })
}
