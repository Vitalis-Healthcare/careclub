import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { parseSignInput } from '@/lib/agreements/validate'

// Public: the token is the authentication. One token, one signature — once
// signed, the token renders the executed record and cannot sign again.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!token || token.length < 20) {
    return NextResponse.json({ error: 'Invalid signing link.' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { input, error } = parseSignInput(body)
  if (!input) {
    return NextResponse.json({ error }, { status: 400 })
  }

  const svc = createServiceClient()

  try {
    const { data: agreement } = await svc
      .from('agreements')
      .select('id, status')
      .eq('token', token)
      .single()

    if (!agreement) {
      return NextResponse.json({ error: 'This signing link is not valid.' }, { status: 404 })
    }
    if (agreement.status === 'signed') {
      return NextResponse.json({ error: 'This agreement has already been signed.' }, { status: 409 })
    }
    if (agreement.status === 'void') {
      return NextResponse.json({ error: 'This signing link is no longer active. Please contact Vitalis for a fresh one.' }, { status: 410 })
    }

    const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
    const userAgent = request.headers.get('user-agent')?.slice(0, 300) || null

    const { data, error: dbError } = await svc
      .from('agreements')
      .update({
        status: 'signed',
        signer_name: input.signer_name,
        signature_data: input.signature_data,
        directive_choices: input.directive_choices,
        signed_ip: ip,
        signed_user_agent: userAgent,
        signed_at: new Date().toISOString(),
      })
      .eq('id', agreement.id)
      .eq('status', agreement.status) // guard against a race with a concurrent void/sign
      .select('id, status, signed_at')
      .single()

    if (dbError || !data) {
      return NextResponse.json({ error: 'Could not record the signature. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ signed: true })
  } catch {
    return NextResponse.json({ error: 'Could not record the signature. Please try again.' }, { status: 500 })
  }
}
