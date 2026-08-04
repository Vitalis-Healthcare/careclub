import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { stripeConfigured } from '@/lib/stripe/server'
import { chargeRenewal, chargeHourBank } from '@/lib/stripe/charges'
import { sendRenewalReminderEmail } from '@/lib/email/resend'
import { addMonthsClamped, daysBetween, todayInEastern } from '@/lib/billing/dates'
import { ensureAndSyncPeriods } from '@/lib/billing/periods'
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

function formatPeriodRange(startIso: string, endIso: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const fmt = (iso: string): string => {
    const [y, m, d] = iso.split('T')[0].split('-')
    const idx = parseInt(m, 10) - 1
    if (!y || idx < 0 || idx > 11 || !d) return iso
    return `${months[idx]} ${parseInt(d, 10)}`
  }
  return `${fmt(startIso)} – ${fmt(endIso)}`
}

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
    hour_bank_charged: [] as string[],
    hour_bank_declined: [] as string[],
    hour_bank_errors: [] as string[],
    hour_bank_skipped_recent_attempt: [] as string[],
    hour_bank_flags: [] as string[],
  }

  try {
    const { data: members } = await svc
      .from('clients')
      .select('id, name, email, status, billing_start_date, tier_id, stripe_customer_id, stripe_payment_method_id, card_brand, card_last4')
      .eq('status', 'active')
      .is('archived_at', null)
      .not('billing_start_date', 'is', null)
      .not('stripe_payment_method_id', 'is', null)

    const { data: tiers } = await svc
      .from('tiers')
      .select('id, name, monthly_price_cents, hours_per_month, overage_rate_cents, weekend_rate_cents, free_cancels_per_period')

    const list = members || []
    const tierById = new Map((tiers || []).map((t) => [t.id, t]))

    for (const member of list) {
      const tier = tierById.get(member.tier_id)
      if (!tier) continue

      const { data: paid } = await svc
        .from('payments')
        .select('id, status, kind, period_start, created_at')
        .eq('client_id', member.id)
        .order('created_at', { ascending: false })

      const rows = paid || []
      const succeededCount = rows.filter((p) => p.status === 'succeeded').length
      if (succeededCount === 0) {
        summary.skipped_legacy_no_payments.push(member.name)
        continue
      }

      // The hour-bank pass (v0.1.9-c): bill every CLOSED period with accrued
      // overage/weekend hours and no succeeded hour_bank payment yet. Runs
      // before the renewal branching so its continues cannot skip it, and
      // independently of the renewal outcome by design: a recovered card
      // still pays a closed period, and a declined accrual charge retries
      // on 3-day spacing without holding the renewal hostage. The sync call
      // also keeps period rows fresh server-side every day.
      const periods = await ensureAndSyncPeriods(svc, {
        clientId: member.id,
        billingStart: member.billing_start_date,
        currentTierHoursIncluded: Number(tier.hours_per_month),
        freeCancelsPerPeriod: Number(tier.free_cancels_per_period),
        today,
      })
      for (const period of periods) {
        if (period.current) continue
        const amountCents = Math.round(
          period.overageHours * Number(tier.overage_rate_cents) +
          period.weekendHours * Number(tier.weekend_rate_cents)
        )
        if (amountCents <= 0) continue
        const periodPayments = rows.filter(
          (p) => p.kind === 'hour_bank' && String(p.period_start || '').split('T')[0] === period.periodStart
        )
        if (periodPayments.some((p) => p.status === 'succeeded')) continue
        const lastTry = periodPayments[0]?.created_at || null
        if (lastTry && daysBetween(lastTry.split('T')[0], today) < 3) {
          summary.hour_bank_skipped_recent_attempt.push(`${member.name} (${period.periodStart})`)
          continue
        }
        const unresolvedHours = period.committedHours + period.committedWeekendHours
        if (unresolvedHours > 0) {
          summary.hour_bank_flags.push(
            `${member.name}: ${unresolvedHours} hrs of scheduled visits were never resolved in the closed period starting ${period.periodStart} — hour bank billed without them`
          )
        }
        const pieces: string[] = []
        if (period.overageHours > 0) {
          pieces.push(`${period.overageHours} ${period.overageHours === 1 ? 'hr' : 'hrs'} overage`)
        }
        if (period.weekendHours > 0) {
          pieces.push(`${period.weekendHours} ${period.weekendHours === 1 ? 'hr' : 'hrs'} weekend`)
        }
        const label = `Hour bank — ${formatPeriodRange(period.periodStart, period.periodEndInclusive)} · ${pieces.join(' + ')}`
        const result = await chargeHourBank({
          clientId: member.id,
          clientName: member.name,
          customerId: member.stripe_customer_id,
          paymentMethodId: member.stripe_payment_method_id,
          amountCents,
          label,
          periodStart: period.periodStart,
        })
        if (result.ok) {
          if (!result.alreadyPaid) {
            summary.hour_bank_charged.push(`${member.name} (${formatMoney(amountCents)}, period ${period.periodStart})`)
          }
        } else if (result.declined) {
          summary.hour_bank_declined.push(`${member.name} (period ${period.periodStart}): ${result.error}`)
        } else {
          summary.hour_bank_errors.push(`${member.name} (period ${period.periodStart}): ${result.error}`)
        }
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
