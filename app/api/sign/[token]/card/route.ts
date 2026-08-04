import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripeConfigured } from '@/lib/stripe/server'
import { saveCardFromSetupIntent } from '@/lib/stripe/cards'

// Public: token-authenticated. After the member confirms the card on-session,
// the page posts the SetupIntent id here so the card lands on the profile
// immediately — the webhook is the asynchronous backstop, not the only path.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 20) {
    return NextResponse.json({ error: 'Invalid signing link.' }, { status: 404 })
  }

  if (!stripeConfigured()) {
    return NextResponse.json({ error: 'Card payments are not configured yet.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const setupIntentId =
    body && typeof body === 'object' && typeof (body as { setup_intent_id?: unknown }).setup_intent_id === 'string'
      ? ((body as { setup_intent_id: string }).setup_intent_id)
      : ''
  if (!setupIntentId.startsWith('seti_')) {
    return NextResponse.json({ error: 'A card setup reference is required.' }, { status: 400 })
  }

  const svc = createServiceClient()

  try {
    const { data: agreement } = await svc
      .from('agreements')
      .select('id, status, client_id')
      .eq('token', token)
      .single()

    if (!agreement) {
      return NextResponse.json({ error: 'This signing link is not valid.' }, { status: 404 })
    }
    if (agreement.status !== 'signed') {
      return NextResponse.json({ error: 'Please sign the agreement first.' }, { status: 409 })
    }

    const { saved, error } = await saveCardFromSetupIntent(setupIntentId, agreement.client_id)
    if (!saved) {
      return NextResponse.json({ error: error || 'Could not save the card.' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, brand: saved.brand, last4: saved.last4 })
  } catch {
    return NextResponse.json({ error: 'Could not save the card. Please try again.' }, { status: 500 })
  }
}
