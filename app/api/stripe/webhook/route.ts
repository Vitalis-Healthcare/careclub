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

    // Payment reconciliation backstop (v0.1.7-b). The charge path records
    // outcomes synchronously; these handlers cover the rare gap where the
    // charge succeeded but the ledger insert failed. Only events carrying
    // our careclub_client_id metadata are ours to record.
    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      const clientId = pi.metadata?.careclub_client_id
      if (clientId) {
        const { data: existingRow } = await svc
          .from('payments')
          .select('id, status')
          .eq('stripe_payment_intent_id', pi.id)
          .limit(1)
        const row = (existingRow || [])[0]
        const succeeded = event.type === 'payment_intent.succeeded'
        if (!row) {
          await svc.from('payments').insert({
            client_id: clientId,
            stripe_payment_intent_id: pi.id,
            amount_cents: pi.amount,
            status: succeeded ? 'succeeded' : 'failed',
            kind:
              pi.metadata?.careclub_kind === 'hour_bank'
                ? 'hour_bank'
                : pi.metadata?.careclub_kind === 'renewal'
                  ? 'renewal'
                  : 'first_month',
            label: pi.metadata?.careclub_label || 'Membership payment',
            failure_message: succeeded ? null : pi.last_payment_error?.message || 'The payment failed.',
            period_start: pi.metadata?.careclub_period_start || null,
          })
        } else if (succeeded && row.status !== 'succeeded') {
          await svc
            .from('payments')
            .update({ status: 'succeeded', failure_message: null })
            .eq('id', row.id)
        }
      }
    }
  } catch {
    // The event is recorded; processing failures must not make Stripe retry
    // forever against a poison event. Acknowledge and surface via the profile.
  }

  return NextResponse.json({ received: true })
}
