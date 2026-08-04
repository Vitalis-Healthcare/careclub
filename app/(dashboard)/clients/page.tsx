import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import AddClientButton from '@/components/clients/AddClientButton'
import { toTierOptions, buildClusterOptions } from '@/lib/clients/options'
import type { TierRow, ClusterRow, ZoneRow, ClientCountRow } from '@/lib/clients/options'
import type { UserRole, Client } from '@/types'

type MemberStatus = 'waitlist' | 'active' | 'paused' | 'canceled'

const SECTION_ORDER: { status: MemberStatus; heading: string; blurb: string }[] = [
  { status: 'waitlist', heading: 'The waitlist', blurb: 'Committed members waiting for their cluster to launch.' },
  { status: 'active', heading: 'Active members', blurb: 'Subscribed and receiving care.' },
  { status: 'paused', heading: 'Paused', blurb: 'Holding their seat; not billed while paused.' },
  { status: 'canceled', heading: 'Canceled', blurb: 'Kept for the record.' },
]

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>
}) {
  const { archived } = await searchParams
  const showArchive = archived === '1'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  const [
    { data: profile },
    { data: clients },
    { data: tiers },
    { data: clusters },
    { data: zones },
  ] = await Promise.all([
    user
      ? svc.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    svc.from('clients').select('*, tiers(name)').order('created_at', { ascending: false }),
    svc.from('tiers').select('id, name, shifts_per_month, hours_per_month, monthly_price_cents, display_order'),
    svc.from('clusters').select('id, name, zone_id, caregiver_id, status'),
    svc.from('zones').select('id, name'),
  ])

  const role: UserRole = (profile?.role as UserRole) || 'scheduler'
  const isAdmin = role === 'admin'
  const isStaff = Boolean(user)

  const everyMember = (clients || []) as (Client & { tiers: { name: string } | { name: string }[] | null })[]
  // The archive (v0.1.10): archived records leave the working lists and all
  // counts, reachable behind the toggle. Nothing is ever deleted.
  const allMembers = everyMember.filter(m => !m.archived_at)
  const archivedMembers = everyMember.filter(m => Boolean(m.archived_at))
  const geocodeEnabled = Boolean(process.env.GOOGLE_MAPS_API_KEY)

  const tierOptions = toTierOptions((tiers || []) as TierRow[])
  const clusterOptions = buildClusterOptions(
    (clusters || []) as ClusterRow[],
    (zones || []) as ZoneRow[],
    allMembers.map(m => ({ id: m.id, cluster_id: m.cluster_id, status: m.status })) as ClientCountRow[],
  )

  const clusterNameById = new Map<string, string>()
  for (const c of clusters || []) clusterNameById.set(c.id as string, c.name as string)

  const byStatus = (s: MemberStatus) => allMembers.filter(m => m.status === s)
  const waitlistCount = byStatus('waitlist').length
  const activeCount = byStatus('active').length
  const quietCount = byStatus('paused').length + byStatus('canceled').length

  const tierNameOf = (m: Client & { tiers: { name: string } | { name: string }[] | null }): string => {
    const t = Array.isArray(m.tiers) ? m.tiers[0] : m.tiers
    return t?.name || '—'
  }

  const metricCard = {
    background: 'var(--surface)',
    border: '1px solid var(--border-soft)',
    borderRadius: 12,
    padding: '20px 22px 18px',
    boxShadow: 'var(--shadow)',
  } as const

  const metricLabel = {
    fontSize: 11,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    fontWeight: 600,
    marginBottom: 10,
  } as const

  const metricValue = {
    fontFamily: 'var(--font-display), serif',
    fontSize: 36,
    fontWeight: 600,
    lineHeight: 1,
    color: 'var(--text)',
  } as const

  const statusPill = (status: MemberStatus) => {
    if (status === 'active') return { label: 'Active', color: 'var(--green-bright)', bg: 'var(--green-glow)' }
    if (status === 'waitlist') return { label: 'Waitlist', color: 'var(--champagne)', bg: 'var(--champagne-glow)' }
    if (status === 'paused') return { label: 'Paused', color: 'var(--amber)', bg: 'var(--amber-glow)' }
    return { label: 'Canceled', color: 'var(--text-faint)', bg: 'var(--surface-raised)' }
  }

  return (
    <>
      <PageHead
        eyebrow="The people"
        title="Club members"
        right={isStaff
          ? <AddClientButton tierOptions={tierOptions} clusterOptions={clusterOptions} geocodeEnabled={geocodeEnabled} />
          : undefined}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 40 }}>
        <div style={metricCard}>
          <div style={metricLabel}>Members</div>
          <div style={metricValue}>{allMembers.length}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Active</div>
          <div style={{ ...metricValue, color: activeCount > 0 ? 'var(--green-bright)' : 'var(--text)' }}>
            {activeCount}
          </div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>On the waitlist</div>
          <div style={{ ...metricValue, color: waitlistCount > 0 ? 'var(--champagne)' : 'var(--text)' }}>
            {waitlistCount}
          </div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Paused &amp; canceled</div>
          <div style={{ ...metricValue, color: 'var(--text-dim)' }}>{quietCount}</div>
        </div>
      </div>

      {archivedMembers.length > 0 && (
        <div style={{ margin: '-26px 0 30px', textAlign: 'right' }}>
          <Link
            href={showArchive ? '/clients' : '/clients?archived=1'}
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-faint)', textDecoration: 'none' }}
          >
            {showArchive ? '← Back to the working lists' : `Archived (${archivedMembers.length})`}
          </Link>
        </div>
      )}

      {allMembers.length === 0 && !showArchive ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 14,
            boxShadow: 'var(--shadow)',
            padding: '56px 24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontFamily: 'var(--font-display), serif', fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>
            No Club members yet
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
            {isStaff
              ? 'Enroll your first member to begin building a cluster\u2019s waitlist.'
              : 'A staff member will enroll the first member.'}
          </p>
        </div>
      ) : (
        !showArchive && SECTION_ORDER.map(({ status, heading, blurb }) => {
          const members = byStatus(status)
          if (members.length === 0) return null
          const canceledSection = status === 'canceled'
          return (
            <div key={status} style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 6px' }}>
                <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 25, fontWeight: 600, margin: 0, color: canceledSection ? 'var(--text-dim)' : 'var(--text)' }}>
                  {heading}
                </h2>
                <span style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{members.length}</span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: '0 0 16px' }}>{blurb}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                {members.map((m) => {
                  const pill = statusPill(m.status)
                  const tierName = tierNameOf(m)
                  const signature = tierName === 'Signature'
                  const clusterName = m.cluster_id ? (clusterNameById.get(m.cluster_id) || '—') : null
                  return (
                    <Link
                      key={m.id}
                      href={`/clients/${m.id}`}
                      style={{
                        display: 'block',
                        background: 'var(--surface)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: 14,
                        boxShadow: 'var(--shadow)',
                        padding: '20px 22px 18px',
                        textDecoration: 'none',
                        color: 'var(--text)',
                        opacity: canceledSection ? 0.65 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600 }}>
                          {m.name}
                        </div>
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            padding: '3px 9px',
                            borderRadius: 999,
                            background: pill.bg,
                            color: pill.color,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {pill.label}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: signature ? 'var(--champagne-glow)' : 'var(--surface-raised)',
                            color: signature ? 'var(--champagne)' : 'var(--text-dim)',
                          }}
                        >
                          {tierName}
                        </span>
                        {clusterName ? (
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-dim)' }}>{clusterName}</span>
                        ) : (
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: m.status === 'canceled' ? 'var(--text-faint)' : 'var(--amber)' }}>
                            Unplaced
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 4 }}>
                        {m.address || '—'}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-faint)' }}>
                        {[m.phone, m.email].filter(Boolean).join(' · ') || 'No contact details'}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {showArchive && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 6px' }}>
            <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 25, fontWeight: 600, margin: 0, color: 'var(--text-dim)' }}>
              The archive
            </h2>
            <span style={{ fontSize: 13, color: 'var(--text-faint)', fontWeight: 600 }}>{archivedMembers.length}</span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--text-faint)', margin: '0 0 16px' }}>
            Records kept in full for the license, out of the working lists. Open a record to restore it.
          </p>
          {archivedMembers.length === 0 ? (
            <p style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>The archive is empty.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {archivedMembers.map((m) => {
                const tierName = tierNameOf(m)
                const clusterName = m.cluster_id ? (clusterNameById.get(m.cluster_id) || '—') : null
                return (
                  <Link
                    key={m.id}
                    href={`/clients/${m.id}`}
                    style={{
                      display: 'block',
                      background: 'var(--surface)',
                      border: '1px dashed var(--border)',
                      borderRadius: 14,
                      boxShadow: 'var(--shadow)',
                      padding: '20px 22px 18px',
                      textDecoration: 'none',
                      color: 'var(--text)',
                      opacity: 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600 }}>
                        {m.name}
                      </div>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          padding: '3px 9px',
                          borderRadius: 999,
                          background: 'var(--surface-raised)',
                          color: 'var(--text-faint)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Archived
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 4 }}>
                      {tierName}{clusterName ? ` · ${clusterName}` : ''} · was {m.status}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                      {m.address || '—'}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </>
  )
}
