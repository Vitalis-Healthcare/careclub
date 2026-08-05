import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseLinkRequest } from '@/lib/auth/validate'
import { sendSignInLinkEmail } from '@/lib/email/resend'

// Public by design, like POST /api/leads: strict validation and a
// non-revealing response. Whether or not the address belongs to a team
// account, the caller sees { ok: true } — account existence is never
// disclosed. Supabase only verifies the token we mint here; the email,
// the link, and the landing page are all ours.

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { email, error } = parseLinkRequest(body)
  if (!email) {
    return NextResponse.json({ error }, { status: 400 })
  }

  const svc = createServiceClient()

  const { data: profile } = await svc
    .from('profiles')
    .select('id, full_name')
    .eq('email', email)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ ok: true })
  }

  const { data: linkData, error: linkError } = await svc.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  const tokenHash = linkData?.properties?.hashed_token
  if (linkError || !tokenHash) {
    // Degrade silently: the caller message already says "if the address
    // belongs to a team account" — a minting failure must not reveal more.
    return NextResponse.json({ ok: true })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://careclub.vitalishealthcare.com'
  const confirmUrl = `${appUrl}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}`

  await sendSignInLinkEmail({
    to: email,
    name: profile.full_name || 'there',
    confirmUrl,
    appUrl,
  })

  return NextResponse.json({ ok: true })
}
