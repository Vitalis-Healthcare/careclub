import Stripe from 'stripe'

// Server-side Stripe access. Lazy so builds and unconfigured environments
// never crash at import time: routes check stripeConfigured() and return a
// friendly 503 when the key is absent (same graceful-degradation pattern as
// Resend and geocoding).

let cached: Stripe | null = null

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function getStripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not configured.')
    }
    cached = new Stripe(key)
  }
  return cached
}
