import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateLead } from '@/lib/leads/validate'
import { sendLeadThankYouEmail, sendLeadNotificationEmail } from '@/lib/email/resend'

// Public sign-up endpoint (v0.1.12). Public by design, like /sign/[token]:
// its protections are its own — strict validation, a honeypot that discards
// bot submissions silently, and a 24-hour duplicate guard so a double-click
// or an impatient resubmit never creates a second lead or a second round of
// emails. The lead row is written FIRST; both emails are best-effort after
// it and degrade gracefully — an email failure can never lose a lead.

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const result = validateLead(body)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  // Honeypot tripped: pretend success, write nothing, send nothing.
  if (result.honeypot) {
    return NextResponse.json({ ok: true })
  }

  const lead = result.lead
  const svc = createServiceClient()

  // Duplicate guard: same email or phone within 24 hours means we already
  // have this person — succeed silently without a second row or emails.
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const conditions: string[] = []
    if (lead.email) conditions.push(`email.eq.${lead.email}`)
    if (lead.phone) conditions.push(`phone.eq.${lead.phone}`)
    if (conditions.length > 0) {
      const { data: existing, error: dupError } = await svc
        .from('leads')
        .select('id')
        .gte('created_at', since)
        .or(conditions.join(','))
        .limit(1)
      if (!dupError && existing && existing.length > 0) {
        return NextResponse.json({ ok: true })
      }
    }
  } catch {
    // If the guard itself fails, proceed to the insert — a rare duplicate
    // is better than a lost lead.
  }

  try {
    const { data: inserted, error } = await svc
      .from('leads')
      .insert({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        area: lead.area,
        care_for: lead.care_for,
        care_recipient_name: lead.care_recipient_name,
        note: lead.note,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      return NextResponse.json(
        { error: 'We could not save your request. Please try again, or call us at (240) 290-5143.' },
        { status: 500 }
      )
    }
  } catch {
    return NextResponse.json(
      { error: 'We could not save your request. Please try again, or call us at (240) 290-5143.' },
      { status: 500 }
    )
  }

  // Best-effort sends; both helpers degrade gracefully and never throw.
  if (lead.email) {
    const firstName = lead.name.split(/\s+/)[0] || lead.name
    await sendLeadThankYouEmail({ to: lead.email, firstName })
  }
  await sendLeadNotificationEmail({ lead })

  return NextResponse.json({ ok: true })
}
