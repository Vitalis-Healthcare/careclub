import type { Metadata } from 'next'
import RequestInvitationForm from '@/components/public/RequestInvitationForm'

// The public front page (v0.1.12). Replaces the old root redirect to /login.
// MEMBER-FACING marketing surface, deliberately pinned to the LIGHT palette
// regardless of device theme (convention: exception pattern A — theme pin).
// The pin redefines the design tokens on a local wrapper, so every child
// still consumes tokens per convention; the values are the light theme's.
// Responsiveness is fluid-only (auto-fit grids, flex wrap, clamp) because
// inline styles cannot carry media queries.

export const metadata: Metadata = {
  title: 'Vitalis Care Club — Membership home care in Silver Spring, Maryland',
  description:
    'Care Club members receive two-hour home care visits on a standing weekly schedule from one dedicated, Maryland-certified caregiver. Now enrolling founding memberships in Silver Spring.',
}

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
  '--shadow-deep': '0 2px 4px rgba(29,42,34,0.07), 0 18px 48px rgba(29,42,34,0.12)',
  background: '#F5F2EA',
  minHeight: '100vh',
  color: '#1D2A22',
}

const wrap: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '0 28px' }

const eyebrow: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--champagne)',
  marginBottom: 18,
}

const secEyebrow: React.CSSProperties = { ...eyebrow, color: 'var(--green-bright)', marginBottom: 14 }

const h2Style: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(29px, 3.6vw, 40px)',
  fontWeight: 500,
  lineHeight: 1.12,
  marginBottom: 16,
  color: 'var(--text)',
}

const italicAccent: React.CSSProperties = { fontStyle: 'italic', color: 'var(--green-dark)' }

const secIntro: React.CSSProperties = {
  fontSize: 16,
  color: 'var(--text-dim)',
  maxWidth: '62ch',
  marginBottom: 48,
  lineHeight: 1.65,
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 15,
  fontWeight: 500,
  color: 'var(--on-accent)',
  background: 'var(--green-dark)',
  textDecoration: 'none',
  padding: '15px 32px',
  borderRadius: 999,
  boxShadow: 'var(--shadow)',
}

const photoStyle: React.CSSProperties = {
  width: '100%',
  height: 'auto',
  display: 'block',
  borderRadius: 20,
  boxShadow: 'var(--shadow-deep)',
  border: '1px solid var(--border)',
}

const cardH3: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 21,
  fontWeight: 600,
  marginBottom: 6,
  color: 'var(--text)',
}

const dimSmall: React.CSSProperties = { fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.6 }

const factStyle: React.CSSProperties = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border-soft)',
  borderRadius: 12,
  padding: '15px 20px',
  fontSize: 14,
}

const areaCard: React.CSSProperties = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '22px 20px',
}

const areaStatus: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '3px 10px',
  borderRadius: 999,
  marginBottom: 10,
}

const tierCard: React.CSSProperties = {
  background: 'var(--surface-raised)',
  border: '1px solid var(--border)',
  borderRadius: 18,
  padding: '36px 30px 30px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: 'var(--shadow)',
  position: 'relative',
  flex: '1 1 280px',
  minWidth: 260,
}

const tierBadge: React.CSSProperties = {
  position: 'absolute',
  top: -12,
  left: '50%',
  transform: 'translateX(-50%)',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  padding: '4px 15px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
  color: 'var(--on-accent)',
}

const tierLine: React.CSSProperties = {
  fontSize: 13.5,
  color: 'var(--text-dim)',
  padding: '8px 0',
  borderTop: '1px solid var(--border-soft)',
}

function TierList({ hours }: { hours: number }) {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={tierLine}>{hours} care hours each month</div>
      <div style={tierLine}>One dedicated caregiver</div>
      <div style={tierLine}>Your choice of arrival windows</div>
    </div>
  )
}

const weekCell: React.CSSProperties = {
  height: 46,
  borderRadius: 8,
  background: 'var(--bg)',
  border: '1px dashed var(--border)',
}

const weekVisit: React.CSSProperties = {
  ...weekCell,
  background: 'var(--green-glow)',
  border: '1px solid var(--green-bright)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
}

function VisitCell({ gold }: { gold?: boolean }) {
  const style = gold
    ? { ...weekVisit, background: 'var(--champagne-glow)', border: '1px solid var(--champagne)' }
    : weekVisit
  const who = { fontWeight: 600, color: gold ? 'var(--champagne)' : 'var(--green-dark)', fontSize: 11 }
  return (
    <div style={style}>
      <span style={who}>Grace</span>
      <span style={{ color: 'var(--text-dim)', fontSize: 10 }}>2 hrs</span>
    </div>
  )
}

const dow: React.CSSProperties = {
  textAlign: 'center',
  color: 'var(--text-faint)',
  fontWeight: 600,
  letterSpacing: '0.06em',
  paddingBottom: 4,
}

const slotLabel: React.CSSProperties = {
  color: 'var(--text-faint)',
  display: 'flex',
  alignItems: 'center',
  fontVariantNumeric: 'tabular-nums',
}

const cgPoint: React.CSSProperties = { borderLeft: '2px solid var(--champagne)', paddingLeft: 20 }

const chip: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 500,
  color: 'var(--champagne)',
  background: 'var(--champagne-glow)',
  border: '1px solid var(--champagne)',
  padding: '5px 13px',
  borderRadius: 999,
}

const serviceCell: React.CSSProperties = { padding: '30px 30px 26px', borderTop: '1px solid var(--border-soft)' }

const footLink: React.CSSProperties = { fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }

export default function Home() {
  return (
    <div style={LIGHT_PIN}>
      <div
        style={{
          height: 3,
          background: 'linear-gradient(90deg, var(--champagne), #C9A96A, var(--champagne))',
        }}
      />
      <header
        style={{
          borderBottom: '1px solid var(--border-soft)',
          background: 'rgba(245, 242, 234, 0.94)',
          backdropFilter: 'blur(8px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            ...wrap,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 28px',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 23,
              fontWeight: 600,
              letterSpacing: '0.02em',
              color: 'var(--green-dark)',
            }}
          >
            Vitalis{' '}
            <span style={{ color: 'var(--champagne)', fontStyle: 'italic', fontWeight: 500 }}>Care Club</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
            <a href="tel:+12402905143" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }}>
              (240) 290-5143
            </a>
            <a href="/login" style={{ fontSize: 13, color: 'var(--text-faint)', textDecoration: 'none' }}>
              Staff sign in
            </a>
            <a
              href="#request"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--on-accent)',
                background: 'var(--green-dark)',
                textDecoration: 'none',
                padding: '10px 22px',
                borderRadius: 999,
              }}
            >
              Request an invitation
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: '84px 0 88px' }}>
        <div
          style={{
            ...wrap,
            display: 'flex',
            gap: 56,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 420px', minWidth: 300 }}>
            <div style={eyebrow}>A membership home care club · Silver Spring, Maryland</div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(38px, 5vw, 58px)',
                lineHeight: 1.06,
                fontWeight: 500,
                marginBottom: 24,
                color: 'var(--text)',
              }}
            >
              The same caregiver, at the same hour, <span style={italicAccent}>every week.</span>
            </h1>
            <p style={{ fontSize: 17, color: 'var(--text-dim)', maxWidth: '46ch', marginBottom: 34, lineHeight: 1.65 }}>
              Care Club members receive two-hour home care visits on a standing weekly schedule — from one
              dedicated caregiver who knows the home, the routine, and the person. Care for your family.
              Peace for you.
            </p>
            <a href="#request" style={btnPrimary}>
              Request an invitation
            </a>
            <p style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 14 }}>
              A soft indication of interest — no commitment, no payment.
            </p>
          </div>
          <div style={{ flex: '1 1 380px', minWidth: 300, position: 'relative' }}>
            <img
              src="/careclub-hero-tea.jpg"
              alt="A Care Club caregiver sharing tea and laughter with a member at her kitchen table"
              width={1400}
              height={933}
              style={photoStyle}
            />
            <div
              style={{
                position: 'absolute',
                left: 22,
                bottom: 22,
                background: 'rgba(253, 252, 248, 0.94)',
                border: '1px solid var(--border)',
                borderLeft: '3px solid var(--champagne)',
                borderRadius: 10,
                padding: '10px 16px',
                fontSize: 13,
                color: 'var(--text-dim)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Every visit, the same face.</strong>{' '}
              That&rsquo;s the membership.
            </div>
          </div>
        </div>
      </section>

      {/* How membership works */}
      <section
        id="how"
        style={{
          padding: '84px 0',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border-soft)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div style={wrap}>
          <div style={secEyebrow}>How membership works</div>
          <h2 style={h2Style}>
            Care with a rhythm you can <span style={italicAccent}>set your clock by.</span>
          </h2>
          <p style={secIntro}>
            Most home care is scheduled visit by visit, with whoever is available. Care Club works the
            other way around: your week comes first, and your caregiver is built around it.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 30,
              marginBottom: 56,
            }}
          >
            {[
              {
                t: 'One caregiver, yours',
                p: 'Every visit is made by the same dedicated caregiver — someone who learns the home, the preferences, and the small things that matter.',
              },
              {
                t: 'Two-hour visits',
                p: 'Long enough for real help — meals, medication reminders, errands, companionship — without turning the day over to it.',
              },
              {
                t: 'Three arrival windows',
                p: 'Visits begin at 8:00, 11:00, or 2:00 — morning, midday, or afternoon. You choose the windows that fit your life.',
              },
              {
                t: 'A standing schedule',
                p: 'Your weekly pattern repeats automatically. No booking, no phone tag — care simply arrives when it should.',
              },
            ].map((b) => (
              <div key={b.t}>
                <div style={{ width: 34, height: 2, background: 'var(--champagne)', marginBottom: 16, borderRadius: 2 }} />
                <h3 style={{ ...cardH3, fontSize: 22, marginBottom: 8 }}>{b.t}</h3>
                <p style={dimSmall}>{b.p}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: 18,
              boxShadow: 'var(--shadow-deep)',
              padding: '30px 32px 24px',
              maxWidth: 680,
              margin: '0 auto',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>
              A member&rsquo;s standing week
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 20 }}>
              Two-hour visits · morning, midday, or afternoon
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '52px repeat(5, 1fr)',
                gap: 6,
                fontSize: 11,
              }}
            >
              <div />
              <div style={dow}>MON</div>
              <div style={dow}>TUE</div>
              <div style={dow}>WED</div>
              <div style={dow}>THU</div>
              <div style={dow}>FRI</div>
              <div style={slotLabel}>8:00</div>
              <VisitCell />
              <div style={weekCell} />
              <VisitCell />
              <div style={weekCell} />
              <VisitCell />
              <div style={slotLabel}>11:00</div>
              <div style={weekCell} />
              <div style={weekCell} />
              <div style={weekCell} />
              <div style={weekCell} />
              <div style={weekCell} />
              <div style={slotLabel}>2:00</div>
              <div style={weekCell} />
              <VisitCell gold />
              <div style={weekCell} />
              <div style={weekCell} />
              <div style={weekCell} />
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 12.5,
                color: 'var(--text-dim)',
                borderTop: '1px solid var(--border-soft)',
                paddingTop: 12,
              }}
            >
              Grace arrives Monday, Wednesday, and Friday mornings, and Tuesday afternoons — the same
              pattern, week after week.
            </div>
          </div>
        </div>
      </section>

      {/* What a visit can hold */}
      <section id="visits" style={{ padding: '84px 0' }}>
        <div style={wrap}>
          <div style={secEyebrow}>What a visit can hold</div>
          <h2 style={h2Style}>
            Two hours of <span style={italicAccent}>whatever the day needs.</span>
          </h2>
          <p style={secIntro}>
            Every visit is shaped around the member — some days practical, some days simply good company.
            Your caregiver arrives knowing the routine.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              border: '1px solid var(--border)',
              borderRadius: 18,
              overflow: 'hidden',
              background: 'var(--surface-raised)',
              boxShadow: 'var(--shadow)',
            }}
          >
            {[
              {
                t: 'Meals & the kitchen',
                p: 'A proper meal cooked fresh, groceries put away, the kitchen left better than it was found.',
              },
              {
                t: 'Personal care',
                p: 'Bathing, dressing, and grooming — handled with patience, privacy, and dignity.',
              },
              {
                t: 'Medication reminders',
                p: 'The right pills at the right time, every time, with a caregiver who knows the regimen.',
              },
              {
                t: 'The home, kept',
                p: 'Light housekeeping and laundry — the small upkeep that keeps a house feeling like home.',
              },
              {
                t: 'Errands & appointments',
                p: 'A ride to the doctor, the pharmacy pickup, the post office run — accompanied, not just driven.',
              },
              {
                t: 'Company & a walk',
                p: 'Conversation, a card game, a stroll around the neighborhood — presence is the service too.',
              },
            ].map((s) => (
              <div key={s.t} style={serviceCell}>
                <h3 style={cardH3}>{s.t}</h3>
                <p style={{ ...dimSmall, fontSize: 13.5 }}>{s.p}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 24, fontSize: 13.5, color: 'var(--text-faint)', maxWidth: '62ch', lineHeight: 1.6 }}>
            Your care advisor will shape the visit plan with you during the home visit — every member&rsquo;s
            routine is their own.
          </p>
        </div>
      </section>

      {/* The Care Club caregiver */}
      <section
        id="caregiver"
        style={{
          padding: '84px 0',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border-soft)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div style={{ ...wrap, display: 'flex', gap: 56, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px', minWidth: 280 }}>
            <img
              src="/careclub-flowers.jpg"
              alt="A caregiver's hands helping a member arrange fresh flowers"
              width={1000}
              height={1000}
              style={photoStyle}
            />
          </div>
          <div style={{ flex: '1 1 420px', minWidth: 300 }}>
            <div style={secEyebrow}>The Care Club caregiver</div>
            <h2 style={h2Style}>
              A different <span style={italicAccent}>caliber</span> of caregiver.
            </h2>
            <div style={{ display: 'grid', gap: 22, marginTop: 8 }}>
              <div style={cgPoint}>
                <h3 style={{ ...cardH3, fontSize: 22, marginBottom: 4 }}>Certified, not just experienced</h3>
                <p style={dimSmall}>
                  Every Care Club caregiver is a Maryland-certified nursing assistant (CNA) or geriatric
                  nursing assistant (GNA) — clinical training, not just goodwill.
                </p>
              </div>
              <div style={cgPoint}>
                <h3 style={{ ...cardH3, fontSize: 22, marginBottom: 4 }}>Clear communication</h3>
                <p style={dimSmall}>
                  Fluent, clear English — with members, with families, and with the nurses who supervise
                  every plan of care.
                </p>
              </div>
              <div style={cgPoint}>
                <h3 style={{ ...cardH3, fontSize: 22, marginBottom: 4 }}>Specialty trained</h3>
                <p style={dimSmall}>
                  Care Club caregivers train beyond the certificate, in the situations families actually
                  face:
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  <span style={chip}>Dementia &amp; memory care</span>
                  <span style={chip}>Chronic disease support</span>
                  <span style={chip}>Post-surgery recovery</span>
                  <span style={chip}>Cancer recovery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Membership tiers */}
      <section id="membership" style={{ padding: '84px 0' }}>
        <div style={wrap}>
          <div style={secEyebrow}>Membership</div>
          <h2 style={h2Style}>
            Three tiers. One simple <span style={italicAccent}>price per visit.</span>
          </h2>
          <p style={secIntro}>
            Every tier is the same two-hour visit from the same dedicated caregiver. The more of your
            week you place in the Club&rsquo;s hands, the less each visit costs.
          </p>
          <div style={{ display: 'flex', gap: 26, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div style={tierCard}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--text)' }}>Select</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>4 visits a month · about one a week</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1, color: 'var(--green-dark)' }}>$135</span>
                <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>per visit</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>Billed monthly · $540</div>
              <TierList hours={8} />
            </div>
            <div style={tierCard}>
              <div style={{ ...tierBadge, background: 'var(--green-dark)' }}>Most popular</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--text)' }}>Premier</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>10 visits a month · two or three a week</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1, color: 'var(--green-dark)' }}>$120</span>
                <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>per visit</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>Billed monthly · $1,200</div>
              <TierList hours={20} />
            </div>
            <div style={{ ...tierCard, border: '1.5px solid var(--champagne)', boxShadow: 'var(--shadow-deep)' }}>
              <div style={{ ...tierBadge, background: 'var(--champagne)' }}>Best value</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--text)' }}>Signature</div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>18 visits a month · most weekdays</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 2 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1, color: 'var(--champagne)' }}>$114</span>
                <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>per visit</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>Billed monthly · $2,052</div>
              <TierList hours={36} />
            </div>
          </div>
          <div
            style={{
              margin: '40px auto 0',
              padding: '22px 28px',
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              borderLeft: '3px solid var(--champagne)',
              borderRadius: 12,
              fontSize: 14,
              color: 'var(--text-dim)',
              maxWidth: 760,
              lineHeight: 1.65,
            }}
          >
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Beyond the standing week:</strong> visits
            can run an extra hour when the schedule allows, and weekend visits can be arranged. Both attract
            a separate charge, explained in full during your home visit — no surprises, ever.
          </div>
        </div>
      </section>

      {/* Where we serve */}
      <section
        id="areas"
        style={{
          padding: '84px 0',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border-soft)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div style={wrap}>
          <div style={secEyebrow}>Where we serve</div>
          <h2 style={h2Style}>
            Now enrolling in <span style={italicAccent}>Silver Spring.</span>
          </h2>
          <p style={secIntro}>
            Care Club grows one neighborhood at a time, so every member&rsquo;s caregiver is truly local.
            If your area is marked coming soon, request an invitation — interest is how we decide where
            the Club opens next.
          </p>
          <div style={{ display: 'flex', gap: 48, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 380px', minWidth: 280 }}>
              <img
                src="/careclub-walk.jpg"
                alt="A caregiver walking with a Care Club member along a leafy Maryland sidewalk"
                width={1200}
                height={800}
                style={photoStyle}
              />
            </div>
            <div
              style={{
                flex: '1 1 400px',
                minWidth: 280,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: 18,
              }}
            >
              <div style={{ ...areaCard, border: '1px solid var(--green-bright)' }}>
                <span style={{ ...areaStatus, background: 'var(--green-glow)', color: 'var(--green-dark)' }}>Now enrolling</span>
                <h3 style={{ ...cardH3, fontSize: 20, marginBottom: 4 }}>Silver Spring</h3>
                <p style={{ ...dimSmall, fontSize: 12.5 }}>Founding memberships open now.</p>
              </div>
              <div style={areaCard}>
                <span style={{ ...areaStatus, background: 'var(--champagne-glow)', color: 'var(--champagne)' }}>Coming soon</span>
                <h3 style={{ ...cardH3, fontSize: 20, marginBottom: 4 }}>Rockville &amp; Germantown</h3>
                <p style={{ ...dimSmall, fontSize: 12.5 }}>Register your interest to bring the Club here.</p>
              </div>
              <div style={areaCard}>
                <span style={{ ...areaStatus, background: 'var(--champagne-glow)', color: 'var(--champagne)' }}>Coming soon</span>
                <h3 style={{ ...cardH3, fontSize: 20, marginBottom: 4 }}>Annapolis</h3>
                <p style={{ ...dimSmall, fontSize: 12.5 }}>Register your interest to bring the Club here.</p>
              </div>
              <div style={areaCard}>
                <span style={{ ...areaStatus, background: 'var(--champagne-glow)', color: 'var(--champagne)' }}>Coming soon</span>
                <h3 style={{ ...cardH3, fontSize: 20, marginBottom: 4 }}>Baltimore County</h3>
                <p style={{ ...dimSmall, fontSize: 12.5 }}>Register your interest to bring the Club here.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The agency behind the Club */}
      <section id="agency" style={{ padding: '84px 0' }}>
        <div style={{ ...wrap, display: 'flex', gap: 56, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 440px', minWidth: 300 }}>
            <div style={secEyebrow}>The agency behind the Club</div>
            <h2 style={h2Style}>
              Backed by <span style={italicAccent}>Vitalis HealthCare Services.</span>
            </h2>
            <p style={{ ...secIntro, marginBottom: 20 }}>
              Care Club is a membership program of Vitalis HealthCare Services LLC, a Maryland-licensed
              residential service agency based in Silver Spring. Every caregiver is a Vitalis employee —
              screened, trained, supervised by our Director of Nursing, and salaried, so their attention
              belongs to their members, not to an hourly clock.
            </p>
            <a
              href="https://www.vitalishealthcare.com/about"
              style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--green-dark)', textDecoration: 'none' }}
            >
              Learn more about Vitalis →
            </a>
          </div>
          <div style={{ flex: '1 1 340px', minWidth: 280, display: 'grid', gap: 12 }}>
            <div style={factStyle}>
              <strong style={{ display: 'block', fontWeight: 600 }}>Maryland licensed</strong>
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Residential Service Agency · License No. 3879R</span>
            </div>
            <div style={factStyle}>
              <strong style={{ display: 'block', fontWeight: 600 }}>Employed, not contracted</strong>
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Salaried caregivers, supervised by a Director of Nursing</span>
            </div>
            <div style={factStyle}>
              <strong style={{ display: 'block', fontWeight: 600 }}>Local by design</strong>
              <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>Headquartered on Georgia Avenue, Silver Spring</span>
            </div>
          </div>
        </div>
      </section>

      {/* Request an invitation */}
      <section
        id="request"
        style={{
          padding: '84px 0',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border-soft)',
          borderBottom: '1px solid var(--border-soft)',
        }}
      >
        <div style={wrap}>
          <RequestInvitationForm />
        </div>
      </section>

      <footer style={{ padding: '44px 0 52px', background: 'var(--bg)' }}>
        <div
          style={{
            ...wrap,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 32,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600, color: 'var(--green-dark)', marginBottom: 6 }}>
              Vitalis Care Club
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>A membership program of Vitalis HealthCare Services LLC</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Maryland RSA Level 3 · License No. 3879R</p>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Contact</p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              8757 Georgia Avenue, Suite 440
              <br />
              Silver Spring, MD 20910
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>(240) 290-5143 · careclub@vitalishealthcare.com</p>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Vitalis</p>
            <a href="https://www.vitalishealthcare.com" style={footLink}>
              vitalishealthcare.com
            </a>
            <a href="https://www.vitalishealthcare.com/about" style={footLink}>
              About Vitalis
            </a>
            <a href="/login" style={footLink}>
              Staff sign in
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
