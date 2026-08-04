import { randomBytes } from 'crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { AGREEMENT_VERSION } from '@/lib/agreements/content'
import { sendAgreementEmail } from '@/lib/email/resend'

// Sends the membership agreement: snapshots the member's tier terms, applies
// the signed-in staff member's countersignature, voids any earlier unsigned
// agreement (one live link at a time), and emails the signing link. Signed
// agreements are immutable and are never voided by a re-send.

export async function POST(
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
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'scheduler') {
    return NextResponse.json({ error: 'Only Vitalis staff can send agreements.' }, { status: 403 })
  }

  try {
    const { data: member } = await svc
      .from('clients')
      .select('id, name, email, tier_id, status')
      .eq('id', id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Member not found.' }, { status: 404 })
    }

    const { data: signedExisting } = await svc
      .from('agreements')
      .select('id')
      .eq('client_id', id)
      .eq('status', 'signed')
      .limit(1)

    if (signedExisting && signedExisting.length > 0) {
      return NextResponse.json(
        { error: 'This member already has a signed agreement. Void it from the agreement card first if it must be replaced.' },
        { status: 409 }
      )
    }

    const { data: tier } = await svc
      .from('tiers')
      .select('name, monthly_price_cents, shifts_per_month, hours_per_month, overage_rate_cents, weekend_rate_cents')
      .eq('id', member.tier_id)
      .single()

    if (!tier) {
      return NextResponse.json({ error: 'The member\u2019s tier could not be found.' }, { status: 404 })
    }

    // One live link at a time: void earlier sent/viewed agreements.
    await svc
      .from('agreements')
      .update({ status: 'void', voided_at: new Date().toISOString() })
      .eq('client_id', id)
      .in('status', ['sent', 'viewed'])

    const token = randomBytes(24).toString('hex')
    const staffName = profile.full_name || profile.email || 'Vitalis Staff'
    const staffRole = profile.role === 'admin' ? 'Administrator' : 'Staff'

    const { data: agreement, error: insertError } = await svc
      .from('agreements')
      .insert({
        client_id: id,
        token,
        status: 'sent',
        version: AGREEMENT_VERSION,
        tier_name: tier.name,
        monthly_price_cents: tier.monthly_price_cents,
        shifts_per_month: tier.shifts_per_month,
        hours_per_month: tier.hours_per_month,
        overage_rate_cents: tier.overage_rate_cents,
        weekend_rate_cents: tier.weekend_rate_cents,
        staff_name: staffName,
        staff_role: staffRole,
      })
      .select()
      .single()

    if (insertError || !agreement) {
      return NextResponse.json({ error: 'Could not create the agreement. Please try again.' }, { status: 500 })
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
    const signUrl = `${appUrl}/sign/${token}`

    let emailNote = ''
    if (member.email) {
      const emailResult = await sendAgreementEmail({
        to: member.email,
        memberName: member.name,
        signUrl,
        appUrl,
      })
      if (emailResult.sent) {
        emailNote = `Emailed to ${member.email}.`
      } else if (!emailResult.configured) {
        emailNote = 'Email is not configured yet \u2014 share the signing link below directly.'
      } else {
        emailNote = emailResult.error || 'The email could not be sent \u2014 share the signing link below directly.'
      }
    } else {
      emailNote = 'This member has no email on file \u2014 share the signing link below directly.'
    }

    return NextResponse.json({ agreement, sign_url: signUrl, email_note: emailNote }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not send the agreement. Please try again.' }, { status: 500 })
  }
}
