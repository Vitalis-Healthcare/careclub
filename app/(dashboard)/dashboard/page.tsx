import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import ClusterRing from '@/components/ui/ClusterRing'

const MIN_COMMITTED_TO_LAUNCH = 3

export default async function DashboardPage() {
  const svc = createServiceClient()

  const [
    { data: zones },
    { data: clusters },
    { data: clients },
    { data: caregivers },
  ] = await Promise.all([
    svc.from('zones').select('*').eq('status', 'active'),
    svc.from('clusters').select('*, zones(name), caregivers(name)'),
    svc.from('clients').select('*, tiers(name, hours_per_month, monthly_price_cents)'),
    svc.from('caregivers').select('*').eq('status', 'active'),
  ])

  const activeZoneCount = zones?.length || 0
  const activeClusters = clusters?.filter(c => c.status === 'active') || []
  const formingClusters = clusters?.filter(c => c.status === 'forming') || []
  const activeClients = clients?.filter(c => c.status === 'active') || []
  const waitlistClients = clients?.filter(c => c.status === 'waitlist') || []

  const totalSubscribed = activeClients.reduce((sum, c) => {
    const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
    return sum + (tier?.hours_per_month || 0)
  }, 0)

  const totalRevenue = activeClients.reduce((sum, c) => {
    const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
    return sum + (tier?.monthly_price_cents || 0)
  }, 0)

  const totalCapacity = (caregivers?.length || 0) * 160

  // Build cluster cards
  const clusterCards = (clusters || []).map(cluster => {
    const clusterClients = activeClients.filter(c => c.cluster_id === cluster.id)
    const committedClients = (clients || []).filter(
      c => c.cluster_id === cluster.id && (c.status === 'active' || c.status === 'waitlist')
    )
    const subscribedHrs = clusterClients.reduce((sum, c) => {
      const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
      return sum + (tier?.hours_per_month || 0)
    }, 0)
    const revenue = clusterClients.reduce((sum, c) => {
      const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
      return sum + (tier?.monthly_price_cents || 0)
    }, 0)
    const cg = Array.isArray(cluster.caregivers) ? cluster.caregivers[0] : cluster.caregivers
    const zoneName = Array.isArray(cluster.zones) ? cluster.zones[0]?.name : cluster.zones?.name
    const salary = cluster.monthly_salary_cents || 0
    const burden = cluster.payroll_burden_pct ?? 25
    const cost = Math.round(salary * (1 + burden / 100))
    const margin = revenue - cost
    const capacity = cg ? 160 : 0
    const utilization = capacity > 0 ? Math.round((subscribedHrs / capacity) * 100) : 0

    let healthLabel = 'Forming'
    let accent = 'var(--champagne)'
    let pillBg = 'var(--champagne-glow)'

    if (cluster.status === 'active' && capacity > 0) {
      if (utilization >= 60 && utilization <= 85) {
        healthLabel = 'Healthy'; accent = 'var(--green-bright)'; pillBg = 'var(--green-glow)'
      } else if (utilization > 85) {
        healthLabel = 'Near capacity'; accent = 'var(--amber)'; pillBg = 'var(--amber-glow)'
      } else if (utilization >= 40) {
        healthLabel = 'Under-subscribed'; accent = 'var(--amber)'; pillBg = 'var(--amber-glow)'
      } else {
        healthLabel = 'Not viable'; accent = 'var(--red)'; pillBg = 'var(--red-glow)'
      }
    } else if (cluster.status === 'inactive') {
      healthLabel = 'Inactive'; accent = 'var(--text-faint)'; pillBg = 'var(--surface-raised)'
    }

    return {
      ...cluster, clusterClients, committedClients, subscribedHrs, revenue, cost, margin,
      capacity, utilization, healthLabel, accent, pillBg,
      caregiverName: cg?.name || null, zoneName: zoneName || '',
    }
  })

  const formatMargin = (cents: number) => {
    const abs = Math.abs(cents)
    const formatted = '$' + (abs / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return cents < 0 ? '-' + formatted : '+' + formatted
  }

  const formatMoney = (cents: number) =>
    '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

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

  const sectionTitle = {
    fontFamily: 'var(--font-display), serif',
    fontSize: 25,
    fontWeight: 600,
    margin: 0,
  } as const

  const statLabel = {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    fontWeight: 600,
    marginBottom: 3,
  } as const

  return (
    <>
      <PageHead
        eyebrow="Command center"
        title="The day at a glance"
        right={<span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{today}</span>}
      />

      {/* Metric strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 40 }}>
        <div style={metricCard}>
          <div style={metricLabel}>Zones</div>
          <div style={metricValue}>{activeZoneCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>Active territories</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Clusters</div>
          <div style={metricValue}>{activeClusters.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            {formingClusters.length > 0 ? (
              <><b style={{ color: 'var(--green-bright)', fontWeight: 600 }}>{activeClusters.length} active</b> · {formingClusters.length} forming</>
            ) : 'All active'}
          </div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Club members</div>
          <div style={metricValue}>{activeClients.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            {waitlistClients.length > 0 ? (
              <><b style={{ color: 'var(--green-bright)', fontWeight: 600 }}>{activeClients.length} active</b> · {waitlistClients.length} on the waitlist</>
            ) : 'No waitlist'}
          </div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Monthly revenue</div>
          <div style={{ ...metricValue, color: 'var(--champagne)' }}>{formatMoney(totalRevenue)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            {totalSubscribed} of {totalCapacity} hours subscribed
          </div>
        </div>
      </div>

      {/* Clusters */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 18px' }}>
        <h2 style={sectionTitle}>Clusters</h2>
      </div>

      {clusterCards.length === 0 ? (
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
            No clusters yet
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
            Create a zone, then open a cluster to begin building its waitlist.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {clusterCards.map((c) => {
            const isForming = c.status === 'forming' || c.capacity === 0
            const needed = Math.max(0, MIN_COMMITTED_TO_LAUNCH - c.committedClients.length)
            return (
              <div
                key={c.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow)',
                  padding: '24px 26px',
                  display: 'flex',
                  gap: 24,
                  alignItems: 'center',
                }}
              >
                {isForming ? (
                  <ClusterRing
                    pct={(c.committedClients.length / MIN_COMMITTED_TO_LAUNCH) * 100}
                    color="var(--champagne)"
                    centerTop={String(c.committedClients.length)}
                    centerTopSuffix={`/${MIN_COMMITTED_TO_LAUNCH}`}
                    centerBottom="Committed"
                  />
                ) : (
                  <ClusterRing
                    pct={c.utilization}
                    color={c.accent}
                    centerTop={String(c.utilization)}
                    centerTopSuffix="%"
                    centerBottom="Utilized"
                  />
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.01em' }}>{c.name}</span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: c.pillBg,
                        color: c.accent,
                      }}
                    >
                      {c.healthLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 14 }}>
                    {c.zoneName}
                    {c.caregiverName ? ` · ${c.caregiverName}` : ' · No caregiver yet'}
                    {` · ${c.clusterClients.length} ${c.clusterClients.length === 1 ? 'member' : 'members'}`}
                  </div>

                  {isForming ? (
                    <div style={{ fontSize: 12.5, color: 'var(--champagne)', fontWeight: 600 }}>
                      {needed > 0
                        ? `${needed} more committed ${needed === 1 ? 'subscriber' : 'subscribers'} to launch`
                        : 'Ready to launch — assign a caregiver'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 26 }}>
                      <div>
                        <div style={statLabel}>Hours</div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {c.subscribedHrs} / {c.capacity}
                        </div>
                      </div>
                      <div>
                        <div style={statLabel}>Revenue</div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--champagne)' }}>
                          {formatMoney(c.revenue)}
                        </div>
                      </div>
                      <div>
                        <div style={statLabel}>Margin</div>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                            color: c.margin >= 0 ? 'var(--green-bright)' : 'var(--red)',
                          }}
                        >
                          {formatMargin(c.margin)}
                        </div>
                      </div>
                    </div>
                  )}

                  {!isForming && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10 }}>
                      {c.margin >= 0
                        ? 'Above breakeven'
                        : `${Math.ceil((c.cost - c.revenue) / 120000)} more Premier ${Math.ceil((c.cost - c.revenue) / 120000) === 1 ? 'subscriber' : 'subscribers'} to break even`}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Waitlist */}
      {waitlistClients.length > 0 && (
        <div style={{ marginTop: 44 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 18px' }}>
            <h2 style={sectionTitle}>The waitlist</h2>
          </div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 14,
              boxShadow: 'var(--shadow)',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Member', 'Tier', 'Address', 'Waiting since'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        fontSize: 10.5,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--text-faint)',
                        fontWeight: 600,
                        padding: '14px 24px',
                        borderBottom: '1px solid var(--border-soft)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waitlistClients.map((c, i) => {
                  const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
                  const isSignature = tier?.name === 'Signature'
                  const cellBorder = i < waitlistClients.length - 1 ? '1px solid var(--border-soft)' : 'none'
                  return (
                    <tr key={c.id}>
                      <td style={{ padding: '15px 24px', fontSize: 13.5, borderBottom: cellBorder, fontWeight: 600 }}>
                        {c.name}
                      </td>
                      <td style={{ padding: '15px 24px', borderBottom: cellBorder }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            padding: '4px 11px',
                            borderRadius: 999,
                            border: `1px solid ${isSignature ? 'var(--champagne)' : 'var(--border)'}`,
                            color: isSignature ? 'var(--champagne)' : 'var(--text-dim)',
                          }}
                        >
                          {tier?.name || 'Unknown tier'}
                        </span>
                      </td>
                      <td style={{ padding: '15px 24px', fontSize: 13.5, borderBottom: cellBorder, color: 'var(--text-dim)' }}>
                        {c.address || 'No address'}
                      </td>
                      <td style={{ padding: '15px 24px', fontSize: 13.5, borderBottom: cellBorder, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
