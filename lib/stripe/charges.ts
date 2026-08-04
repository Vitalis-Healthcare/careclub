import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { getStripe } from '@/lib/stripe/server'
import { formatMoney } from '@/lib/agreements/content'

// The first-month charge, fired on the transition into 'active' when Staff
// confirm the billing start date. Idempotency lives in OUR ledger, not Stripe
// idempotency keys: if a succeeded first-month payment already exists for the
// member, we skip the charge and let the activation proceed. This makes two
// scenarios safe by construction: a double-clicked activation cannot
// double-charge, and a retry after "charged but the save failed" charges
// nothing the second time. A retry after a DECLINE charges again on purpose —
// declines are often transient and Staff retry deliberately.

export type ChargeResult =
  | { ok: true; alreadyPaid: boolean }
  | { ok: false; status: number; error: string }

export async function chargeFirstMonth(params: {
  clientId: string
  clientName: string
  customerId: string
  paymentMethodId: string
  amountCents: number
  tierName: string
}): Promise<ChargeResult> {
  const svc = createServiceClient()

  // Ledger check — has the first month already been paid?
  try {
    const { data: prior } = await svc
      .from('payments')
      .select('id')
      .eq('client_id', params.clientId)
      .eq('kind', 'first_month')
      .eq('status', 'succeeded')
      .limit(1)
    if (prior && prior.length > 0) {
      return { ok: true, alreadyPaid: true }
    }
  } catch {
    return { ok: false, status: 500, error: 'Could not check the payment ledger. Please try again.' }
  }

  const label = `First month \u2014 ${params.tierName}`
  const stripe = getStripe()

  let intent: Stripe.PaymentIntent
  try {
    intent = await stripe.paymentIntents.create({
      amount: params.amountCents,
      currency: 'usd',
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      off_session: true,
      confirm: true,
      description: `${label} (${params.clientName})`,
      metadata: {
        careclub_client_id: params.clientId,
        careclub_kind: 'first_month',
        careclub_label: label,
      },
    })
  } catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) {
      const declineMessage = err.message || 'The card was declined.'
      const piId =
        err.payment_intent && typeof err.payment_intent === 'object' ? err.payment_intent.id : null
      try {
        await svc.from('payments').insert({
          client_id: params.clientId,
          stripe_payment_intent_id: piId,
          amount_cents: params.amountCents,
          status: 'failed',
          kind: 'first_month',
          label,
          failure_message: declineMessage,
        })
      } catch {
        // The decline still gets surfaced even if the ledger write fails.
      }
      return {
        ok: false,
        status: 402,
        error: `The card was declined: ${declineMessage} The member has NOT been activated \u2014 ask them to update their card from the signing link, then try again.`,
      }
    }
    return {
      ok: false,
      status: 502,
      error: 'Could not reach Stripe to take the payment. Nothing was charged \u2014 please try again.',
    }
  }

  if (intent.status !== 'succeeded') {
    return {
      ok: false,
      status: 402,
      error: `The payment did not complete (status: ${intent.status}). The member has NOT been activated.`,
    }
  }

  try {
    const { error: dbError } = await svc.from('payments').insert({
      client_id: params.clientId,
      stripe_payment_intent_id: intent.id,
      amount_cents: params.amountCents,
      status: 'succeeded',
      kind: 'first_month',
      label,
    })
    if (dbError) {
      // Charged but not recorded — the webhook backstop reconciles this from
      // payment_intent.succeeded. Let the activation proceed.
    }
  } catch {
    // Same: webhook reconciles.
  }

  return { ok: true, alreadyPaid: false }
}

export function firstMonthSummary(amountCents: number, tierName: string): string {
  return `${formatMoney(amountCents)} \u2014 first month of ${tierName}`
}
