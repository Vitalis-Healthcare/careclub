import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe/server'

// Saves the card from a succeeded SetupIntent onto the member's record.
// Called from two places — the on-session confirm route (member just entered
// the card) and the webhook (Stripe's asynchronous confirmation). Both paths
// are idempotent: writing the same payment method twice is harmless.

export interface SavedCard {
  payment_method_id: string
  brand: string | null
  last4: string | null
  exp_month: number | null
  exp_year: number | null
}

export async function saveCardFromSetupIntent(
  setupIntentId: string,
  expectedClientId?: string
): Promise<{ saved: SavedCard | null; error: string | null }> {
  const stripe = getStripe()

  let si: Stripe.SetupIntent
  try {
    si = await stripe.setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] })
  } catch {
    return { saved: null, error: 'Could not look up the card setup with Stripe.' }
  }

  if (si.status !== 'succeeded') {
    return { saved: null, error: 'The card setup has not completed yet.' }
  }

  const customerId = typeof si.customer === 'string' ? si.customer : si.customer?.id || null
  const pm = si.payment_method
  if (!customerId || !pm || typeof pm === 'string') {
    return { saved: null, error: 'The card setup is missing its customer or payment method.' }
  }

  const svc = createServiceClient()
  const { data: client } = await svc
    .from('clients')
    .select('id, stripe_customer_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!client) {
    return { saved: null, error: 'No Club member matches this Stripe customer.' }
  }
  if (expectedClientId && client.id !== expectedClientId) {
    return { saved: null, error: 'This card setup belongs to a different member.' }
  }

  const saved: SavedCard = {
    payment_method_id: pm.id,
    brand: pm.card?.brand || null,
    last4: pm.card?.last4 || null,
    exp_month: pm.card?.exp_month ?? null,
    exp_year: pm.card?.exp_year ?? null,
  }

  const { error: dbError } = await svc
    .from('clients')
    .update({
      stripe_payment_method_id: saved.payment_method_id,
      card_brand: saved.brand,
      card_last4: saved.last4,
      card_exp_month: saved.exp_month,
      card_exp_year: saved.exp_year,
    })
    .eq('id', client.id)

  if (dbError) {
    return { saved: null, error: 'Could not record the card on the member profile.' }
  }

  // Set as the customer's default for future off-session charges. Best-effort:
  // the charge path passes the payment method explicitly anyway.
  try {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: saved.payment_method_id },
    })
  } catch {
    // Non-fatal.
  }

  return { saved, error: null }
}
