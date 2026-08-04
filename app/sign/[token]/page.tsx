import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import SignaturePanel from '@/components/agreements/SignaturePanel'
import { agreementSections, DIRECTIVE_OPTIONS, VITALIS_LEGAL, formatMoney, START_OF_CARE_MIN_DAYS } from '@/lib/agreements/content'
import { formatMemberNumber } from '@/lib/clients/options'
import type { TermsSnapshot } from '@/lib/agreements/content'

// Public signing page. Deliberately pinned to the LIGHT palette regardless of
// device theme: this is a legal document members may print. The pin is done
// by redefining the design tokens on a local wrapper, so children still
// consume tokens per convention — the values are the light theme's.

const LIGHT_PIN: React.CSSProperties & Record<string, string> = {
  '--bg': '#F5F2EA',
  '--surface': '#FDFCF8',
  '--surface-raised': '#FFFFFF',
  '--border': '#E2DDCE',
  '--border-soft': '#EBE7DA',
  '--text': '#1D2A22',
  '--text-dim': '#64705F',
  '--text-faint': '#A3AC9C',
  '--green-bright': '#5E9420',
  '--green-dark': '#2D5A1B',
  '--green-glow': 'rgba(94, 148, 32, 0.10)',
  '--champagne': '#A8863F',
  '--champagne-glow': 'rgba(168, 134, 63, 0.12)',
  '--amber': '#B7841D',
  '--amber-glow': 'rgba(183, 132, 29, 0.12)',
  '--red': '#B05246',
  '--red-glow': 'rgba(176, 82, 70, 0.10)',
  '--ring-track': '#E8E3D4',
  '--on-accent': '#FFFFFF',
  '--shadow': '0 1px 2px rgba(29,42,34,0.06), 0 8px 28px rgba(29,42,34,0.07)',
  background: '#F5F2EA',
  minHeight: '100vh',
  color: '#1D2A22',
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!token || token.length < 20) notFound()

  const svc = createServiceClient()
  const { data: agreement } = await svc
    .from('agreements')
    .select('*, clients(name, address, member_number)')
    .eq('token', token)
    .single()

  if (!agreement || agreement.status === 'void') notFound()

  // First open of a fresh link marks it viewed.
  if (agreement.status === 'sent') {
    try {
      await svc
        .from('agreements')
        .update({ status: 'viewed', viewed_at: new Date().toISOString() })
        .eq('id', agreement.id)
        .eq('status', 'sent')
    } catch {
      // Non-fatal: the member can still read and sign.
    }
  }

  const memberRel = Array.isArray(agreement.clients) ? agreement.clients[0] : agreement.clients
  const memberName = memberRel?.name || 'the Member'
  const memberAddress = memberRel?.address || ''
  const signed = agreement.status === 'signed'
  const startOfCareEarliest = agreement.signed_at
    ? new Date(new Date(agreement.signed_at).getTime() + START_OF_CARE_MIN_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null

  const snapshot: TermsSnapshot = {
    tier_name: agreement.tier_name,
    monthly_price_cents: agreement.monthly_price_cents,
    shifts_per_month: agreement.shifts_per_month,
    hours_per_month: Number(agreement.hours_per_month),
    overage_rate_cents: agreement.overage_rate_cents,
    weekend_rate_cents: agreement.weekend_rate_cents,
  }
  const sections = agreementSections(snapshot, memberName)

  const chosen = new Set<string>(Array.isArray(agreement.directive_choices) ? agreement.directive_choices as string[] : [])

  return (
    <div style={LIGHT_PIN}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: 'var(--shadow)',
            padding: '48px 48px 40px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <Image src="/vitalis-lockup.png" alt="Vitalis HealthCare" width={280} height={89} style={{ margin: '0 auto 18px', height: 'auto', maxWidth: '100%' }} />
            <div style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--green-bright)', fontWeight: 700, marginBottom: 8 }}>
              Vitalis Care Club
            </div>
            <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 30, fontWeight: 600, margin: '0 0 12px' }}>
              Membership Agreement &amp; Consent
            </h1>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.7 }}>
              {VITALIS_LEGAL.companyName} · {VITALIS_LEGAL.address}
              <br />
              Tel: {VITALIS_LEGAL.phone} · Fax: {VITALIS_LEGAL.fax}
              <br />
              {VITALIS_LEGAL.ohcqLicense}
            </div>
          </div>

          {signed && (
            <div
              style={{
                background: 'var(--green-glow)',
                border: '1px solid var(--green-bright)',
                borderRadius: 10,
                padding: '14px 18px',
                fontSize: 13.5,
                color: 'var(--green-dark)',
                fontWeight: 600,
                marginBottom: 28,
                textAlign: 'center',
              }}
            >
              Signed by {agreement.signer_name} on {formatDateTime(agreement.signed_at)}. This is the executed record.
            </div>
          )}

          <div
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-soft)',
              borderRadius: 12,
              padding: '20px 24px',
              marginBottom: 32,
              display: 'flex',
              gap: 30,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>Member</div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{memberName}</div>
              <div style={{ fontSize: 12.5, color: 'var(--champagne)', fontWeight: 600 }}>Member No. {formatMemberNumber(memberRel?.member_number)}</div>
              {memberAddress && <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>{memberAddress}</div>}
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>Membership</div>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: agreement.tier_name === 'Signature' ? 'var(--champagne)' : 'var(--text)' }}>
                {agreement.tier_name}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                {agreement.shifts_per_month} visits · {Number(agreement.hours_per_month)} hrs · {formatMoney(agreement.monthly_price_cents)}/month
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>Agreement</div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>Version {agreement.version}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Sent {formatDateTime(agreement.sent_at)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>Start of care</div>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>
                {signed ? `No earlier than ${formatDateTime(startOfCareEarliest)}` : `At least ${START_OF_CARE_MIN_DAYS} days after signing`}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>Confirmed after payment and nurse assessment</div>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.heading} style={{ marginBottom: 26 }}>
              <h2 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 19, fontWeight: 600, margin: '0 0 10px' }}>
                {section.heading}
              </h2>
              {section.blocks.map((block, i) =>
                block.type === 'p' ? (
                  <p key={i} style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--text)', margin: '0 0 10px' }}>
                    {block.text}
                  </p>
                ) : (
                  <div
                    key={i}
                    style={{
                      background: 'var(--green-glow)',
                      border: '1px solid var(--green-bright)',
                      borderRadius: 10,
                      padding: '16px 20px',
                      margin: '0 0 12px',
                    }}
                  >
                    {block.items.map((item, j) => (
                      <div key={j} style={{ display: 'flex', gap: 10, fontSize: 14, lineHeight: 1.7, color: 'var(--text)', fontWeight: 600, marginBottom: j < block.items.length - 1 ? 6 : 0 }}>
                        <span style={{ color: 'var(--green-bright)' }}>●</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )
              )}
              {section.heading === 'Advance Directives' && signed && (
                <div style={{ marginTop: 4 }}>
                  {DIRECTIVE_OPTIONS.map((o) => (
                    <div key={o.key} style={{ fontSize: 13.5, color: 'var(--text)', marginBottom: 4 }}>
                      <span style={{ display: 'inline-block', width: 18, fontWeight: 700, color: chosen.has(o.key) ? 'var(--green-bright)' : 'var(--text-faint)' }}>
                        {chosen.has(o.key) ? '☑' : '☐'}
                      </span>
                      {o.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 28, marginTop: 8 }}>
            <h2 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 19, fontWeight: 600, margin: '0 0 16px' }}>
              Signatures
            </h2>

            {signed ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 8 }}>
                    Member or Representative
                  </div>
                  {agreement.signature_data && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={agreement.signature_data}
                      alt="Member signature"
                      style={{ display: 'block', maxWidth: '100%', height: 72, objectFit: 'contain', objectPosition: 'left', marginBottom: 6 }}
                    />
                  )}
                  <div style={{ borderTop: '1px solid var(--text-dim)', paddingTop: 6, fontSize: 13.5, fontWeight: 600 }}>
                    {agreement.signer_name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDateTime(agreement.signed_at)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 8 }}>
                    For {VITALIS_LEGAL.companyName}
                  </div>
                  <div style={{ height: 72, display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: 26, fontStyle: 'italic', color: 'var(--green-dark)' }}>
                      {agreement.staff_name}
                    </span>
                  </div>
                  <div style={{ borderTop: '1px solid var(--text-dim)', paddingTop: 6, fontSize: 13.5, fontWeight: 600 }}>
                    {agreement.staff_name} · {agreement.staff_role}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDateTime(agreement.sent_at)}</div>
                </div>
              </div>
            ) : (
              <SignaturePanel token={token} memberName={memberName} staffName={agreement.staff_name} staffRole={agreement.staff_role} sentAt={formatDateTime(agreement.sent_at)} />
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-faint)', marginTop: 20 }}>
          Questions? Call Vitalis at {VITALIS_LEGAL.phone}. This page is your private signing link — please do not share it.
        </p>
      </div>
    </div>
  )
}
