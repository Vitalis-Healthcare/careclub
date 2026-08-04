import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripeConfigured } from '@/lib/stripe/server'
import { chargeRenewal } from '@/lib/stripe/charges'
import { sendRenewalReminderEmail } from '@/lib/email/resend'
import { addMonthsClamped, daysBetween, todayInEastern } from '@/lib/billing/dates'
import { formatMoney } from '@/lib/agreements/content'

// Daily renewals cron (v0.1.7-c). Runs early morning ET via Vercel cron.
// For each active member with a saved card and at least one succeeded payment:
//   - anniversary = billing_start_date + (succeeded payment count) months
//   - due (anniversary <= today ET): charge the month, unless any charge
//     attempt happened in the last 3 days — that spaces retries after a
//     decline (days ~3/6/9 of the 10-day window) instead of hammering daily
//   - 7 days out / 1 day out: send the reminder email, at most once per
//     member per anniversary per kind (renewal_reminders UNIQUE constraint)
// Members with zero succeeded payments are skipped and reported: they were
// activated outside card billing (legacy/manual) and must never be surprise-
// charged by a cron. Auth: CRON_SECRET bearer, checked in-handler.

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 })
  }
  const auth = request.headers.get('authorization') || ''
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 })
  }

  const svc = createServiceClient()
  const today = todayInEastern()

  const summary = {
    date: today,
    charged: [] as string[],
    declined: [] as string[],
    charge_errors: [] as string[],
    skipped_recent_attempt: [] as string[],
    skipped_legacy_no_payments: [] as string[],
    reminders_sent: [] as string[],
    reminders_skipped_no_email: [] as string[],
  }

  try {
    const { data: members } = await svc
      .from('clients')
      .select('id, name, email, status, billing_start_date, tier_id, stripe_customer_id, stripe_payment_method_id, card_brand, card_last4')
      .eq('status', 'active')
      .not('billing_start_date', 'is', null)
      .not('stripe_payment_method_id', 'is', null)

    const { data: tiers } = await svc
      .from('tiers')
      .select('id, name, monthly_price_cents')

    const list = members || []
    const tierById = new Map((tiers || []).map((t) => [t.id, t]))

    for (const member of list) {
      const tier = tierById.get(member.tier_id)
      if (!tier) continue

      const { data: paid } = await svc
        .from('payments')
        .select('id, status, created_at')
        .eq('client_id', member.id)
        .order('created_at', { ascending: false })

      const rows = paid || []
      const succeededCount = rows.filter((p) => p.status === 'succeeded').length
      if (succeededCount === 0) {
        summary.skipped_legacy_no_payments.push(member.name)
        continue
      }

      const anniversary = addMonthsClamped(member.billing_start_date, succeededCount)
      const daysOut = daysBetween(today, anniversary)

      if (daysOut <= 0) {
        // Due (or overdue). Space attempts by 3 days.
        const lastAttempt = rows[0]?.created_at || null
        const attemptedRecently = lastAttempt
          ? daysBetween(lastAttempt.split('T')[0], today) < 3
          : false
        if (attemptedRecently) {
          summary.skipped_recent_attempt.push(member.name)
          continue
        }
        const result = await chargeRenewal({
          clientId: member.id,
          clientName: member.name,
          customerId: member.stripe_customer_id,
          paymentMethodId: member.stripe_payment_method_id,
          amountCents: tier.monthly_price_cents,
          tierName: tier.name,
          anniversaryDate: anniversary,
        })
        if (result.ok) {
          summary.charged.push(`${member.name} (${formatMoney(tier.monthly_price_cents)})`)
        } else if (result.declined) {
          summary.declined.push(`${member.name}: ${result.error}`)
        } else {
          summary.charge_errors.push(`${member.name}: ${result.error}`)
        }
        continue
      }

      if (daysOut === 7 || daysOut === 1) {
        const kind = daysOut === 7 ? 'week_before' : 'day_before'
        if (!member.email) {
          summary.reminders_skipped_no_email.push(`${member.name} (${kind})`)
          continue
        }
        // Insert first: the UNIQUE constraint is the duplicate guard. 23505
        // means this reminder already went out for this anniversary.
        const { error: insertError } = await svc.from('renewal_reminders').insert({
          client_id: member.id,
          anniversary_date: anniversary,
          reminder_kind: kind,
        })
        if (insertError) {
          continue
        }
        const [y, m, d] = anniversary.split('-')
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const renewalDate = `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`
        const cardLabel = member.card_brand && member.card_last4
          ? `${String(member.card_brand).toUpperCase()} \u2022\u2022\u2022\u2022 ${member.card_last4}`
          : 'your saved card'
        await sendRenewalReminderEmail({
          to: member.email,
          memberName: member.name,
          renewalDate,
          amountLabel: formatMoney(tier.monthly_price_cents),
          cardLabel,
        })
        summary.reminders_sent.push(`${member.name} (${kind})`)
      }
    }

    return NextResponse.json(summary)
  } catch {
    return NextResponse.json({ error: 'The renewals run failed part-way. Re-running is safe.' }, { status: 500 })
  }
}
