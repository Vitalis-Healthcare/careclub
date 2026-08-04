import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import EditClientButton from '@/components/clients/EditClientButton'
import { toTierOptions, buildClusterOptions } from '@/lib/clients/options'
import type { TierRow, ClusterRow, ZoneRow, ClientCountRow } from '@/lib/clients/options'
import type { UserRole, Client, Tier } from '@/types'

function formatDate(value: string | null): string {
  if (!value) return '—'
  const [y, m, d] = value.split('T')[0].split('-')
  if (!y || !m || !d) return value
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIdx = parseInt(m, 10) - 1
  if (monthIdx < 0 || monthIdx > 11) return value
  return `${months[monthIdx]} ${parseInt(d, 10)}, ${y}`
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  const [
    { data: profile },
    { data: client },
    { data: tiers },
    { data: clusters },
    { data: zones },
    { data: allClients },
  ] = await Promise.all([
    user
      ? svc.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    svc.from('clients').select('*').eq('id', id).single(),
    svc.from('tiers').select('id, name, shifts_per_month, hours_per_shift, hours_per_month, monthly_price_cents, overage_rate_cents, weekend_rate_cents, free_cancels_per_period, display_order, created_at'),
    svc.from('clusters').select('id, name, zone_id, caregiver_id, status'),
    svc.from('zones').select('id, name'),
    svc.from('clients').select('id, cluster_id, status'),
  ])

  if (!client) {
    notFound()
  }

  const member = client as Client
  const role: UserRole = (profile?.role as UserRole) || 'scheduler'
  const isAdmin = role === 'admin'
  const geocodeEnabled = Boolean(process.env.GOOGLE_MAPS_API_KEY)

  const allTiers = (tiers || []) as Tier[]
  const tier = allTiers.find(t => t.id === member.tier_id) || null

  const clusterRows = (clusters || []) as ClusterRow[]
  const cluster = clusterRows.find(c => c.id === member.cluster_id) || null
  const zoneName = cluster
    ? ((zones || []).find(z => z.id === cluster.zone_id)?.name as string | undefined) || null
    : null

  const tierOptions = toTierOptions(allTiers as unknown as TierRow[])
  const clusterOptions = buildClusterOptions(
    clusterRows,
    (zones || []) as ZoneRow[],
    (allClients || []) as ClientCountRow[],
  )

  const formatMoney = (cents: number) =>
    '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const statusPill = () => {
    if (member.status === 'active') return { label: 'Active', color: 'var(--green-bright)', bg: 'var(--green-glow)' }
    if (member.status === 'waitlist') return { label: 'Waitlist', color: 'var(--champagne)', bg: 'var(--champagne-glow)' }
    if (member.status === 'paused') return { label: 'Paused', color: 'var(--amber)', bg: 'var(--amber-glow)' }
    return { label: 'Canceled', color: 'var(--text-faint)', bg: 'var(--surface-raised)' }
  }
  const pill = statusPill()

  const factLabel = {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    fontWeight: 600,
    marginBottom: 3,
  } as const

  const factValue = { fontSize: 14.5, fontWeight: 600 } as const

  const card = {
    background: 'var(--surface)',
    border: '1px solid var(--border-soft)',
    borderRadius: 14,
    boxShadow: 'var(--shadow)',
    padding: '22px 26px',
  } as const

  const detailRowLabel = {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    fontWeight: 600,
    marginBottom: 3,
  } as const

  const detailRowValue = { fontSize: 14, fontWeight: 500, color: 'var(--text)' } as const

  const signature = tier?.name === 'Signature'

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Link
          href="/clients"
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--text-dim)',
            textDecoration: 'none',
          }}
        >
          ← All Club members
        </Link>
      </div>

      <PageHead
        eyebrow="The people"
        title={member.name}
        right={isAdmin
          ? <EditClientButton client={member} tierOptions={tierOptions} clusterOptions={clusterOptions} geocodeEnabled={geocodeEnabled} />
          : undefined}
      />

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 14,
          boxShadow: 'var(--shadow)',
          padding: '22px 26px',
          marginBottom: 32,
          display: 'flex',
          gap: 34,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={factLabel}>Tier</div>
          <div style={{ ...factValue, color: signature ? 'var(--champagne)' : 'var(--text)' }}>
            {tier?.name || '—'}
          </div>
        </div>
        <div>
          <div style={factLabel}>Monthly price</div>
          <div style={{ ...factValue, fontVariantNumeric: 'tabular-nums', color: 'var(--champagne)' }}>
            {tier ? formatMoney(tier.monthly_price_cents) : '—'}
          </div>
        </div>
        <div>
          <div style={factLabel}>Hours per month</div>
          <div style={{ ...factValue, fontVariantNumeric: 'tabular-nums' }}>
            {tier ? `${tier.hours_per_month} hrs` : '—'}
          </div>
        </div>
        <div>
          <div style={factLabel}>Cluster</div>
          <div style={factValue}>
            {cluster ? (
              <>
                {cluster.name}
                {zoneName && <span style={{ color: 'var(--text-faint)', fontWeight: 500 }}> · {zoneName}</span>}
              </>
            ) : (
              <span style={{ color: member.status === 'canceled' ? 'var(--text-faint)' : 'var(--amber)' }}>Unplaced</span>
            )}
          </div>
        </div>
        <div>
          <div style={factLabel}>Billing start</div>
          <div style={factValue}>{formatDate(member.billing_start_date)}</div>
        </div>
        <div>
          <div style={factLabel}>Member since</div>
          <div style={factValue}>{formatDate(member.created_at)}</div>
        </div>
        <div>
          <div style={factLabel}>Status</div>
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
            }}
          >
            {pill.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <div style={card}>
          <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 18px' }}>
            Contact
          </h2>
          <div style={{ marginBottom: 14 }}>
            <div style={detailRowLabel}>Phone</div>
            <div style={detailRowValue}>{member.phone || '—'}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={detailRowLabel}>Email</div>
            <div style={detailRowValue}>{member.email || '—'}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={detailRowLabel}>Home address</div>
            <div style={detailRowValue}>{member.address || '—'}</div>
          </div>
          <div>
            <div style={detailRowLabel}>Coordinates</div>
            <div style={{ ...detailRowValue, fontVariantNumeric: 'tabular-nums' }}>
              {member.lat != null && member.lng != null
                ? `${member.lat}, ${member.lng}`
                : 'Not set'}
            </div>
          </div>
        </div>

        <div style={card}>
          <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 18px' }}>
            Emergency contact
          </h2>
          {member.emergency_contact_name || member.emergency_contact_phone || member.emergency_contact_email ? (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={detailRowLabel}>Name</div>
                <div style={detailRowValue}>{member.emergency_contact_name || '—'}</div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={detailRowLabel}>Phone</div>
                <div style={detailRowValue}>{member.emergency_contact_phone || '—'}</div>
              </div>
              <div>
                <div style={detailRowLabel}>Email</div>
                <div style={detailRowValue}>{member.emergency_contact_email || '—'}</div>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
              No emergency contact on file yet. {isAdmin ? 'Add one from Edit membership.' : ''}
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          ...card,
          padding: '28px 26px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontFamily: 'var(--font-display), serif', fontSize: 19, fontWeight: 600, margin: '0 0 6px' }}>
          Standing schedule &amp; hour bank
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
          Weekly patterns and the monthly hour bank arrive with scheduling in v0.1.5.
        </p>
      </div>
    </>
  )
}
