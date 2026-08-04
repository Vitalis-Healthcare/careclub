import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import ClusterRing from '@/components/ui/ClusterRing'
import AddClusterButton from '@/components/clusters/AddClusterButton'
import EditClusterButton from '@/components/clusters/EditClusterButton'
import { nextClusterName } from '@/lib/clusters/validate'
import type { UserRole, Zone, Cluster } from '@/types'

const MIN_COMMITTED_TO_LAUNCH = 3
const PREMIER_PRICE_CENTS = 120000

export default async function ClustersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  const [
    { data: profile },
    { data: zones },
    { data: clusters },
    { data: clients },
  ] = await Promise.all([
    user
      ? svc.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    svc.from('zones').select('*').order('created_at'),
    svc.from('clusters').select('*, caregivers(name)').order('name'),
    svc.from('clients').select('id, cluster_id, status, tiers(name, hours_per_month, monthly_price_cents)'),
  ])

  const role: UserRole = (profile?.role as UserRole) || 'scheduler'
  const isAdmin = role === 'admin'

  const allZones = (zones || []) as Zone[]
  const allClusters = clusters || []
  const allClients = clients || []

  const zoneOptions = allZones
    .filter(z => z.status === 'active' && z.abbreviation)
    .map(z => ({
      id: z.id,
      name: z.name,
      abbreviation: z.abbreviation as string,
      nextClusterName: nextClusterName(
        z.abbreviation as string,
        allClusters.filter(c => c.zone_id === z.id).map(c => c.name as string)
      ),
    }))

  const formatMoney = (cents: number) =>
    '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const formatMargin = (cents: number) => {
    const abs = Math.abs(cents)
    const formatted = '$' + (abs / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return cents < 0 ? '-' + formatted : '+' + formatted
  }

  const buildCard = (cluster: Cluster & { caregivers: unknown }) => {
    const activeMembers = allClients.filter(c => c.cluster_id === cluster.id && c.status === 'active')
    const committedMembers = allClients.filter(
      c => c.cluster_id === cluster.id && (c.status === 'active' || c.status === 'waitlist')
    )
    const subscribedHrs = activeMembers.reduce((sum, c) => {
      const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
      return sum + (tier?.hours_per_month || 0)
    }, 0)
    const revenue = activeMembers.reduce((sum, c) => {
      const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
      return sum + (tier?.monthly_price_cents || 0)
    }, 0)
    const committedRevenue = committedMembers.reduce((sum, c) => {
      const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
      return sum + (tier?.monthly_price_cents || 0)
    }, 0)
    const cg = Array.isArray(cluster.caregivers) ? cluster.caregivers[0] : cluster.caregivers
    const caregiverName = (cg as { name?: string } | null)?.name || null
    const cost = Math.round(cluster.monthly_salary_cents * (1 + cluster.payroll_burden_pct / 100))
    const margin = revenue - cost
    const capacity = caregiverName ? 160 : 0
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
      cluster, activeMembers, committedMembers, subscribedHrs, revenue, committedRevenue,
      cost, margin, capacity, utilization, healthLabel, accent, pillBg, caregiverName,
    }
  }

  const statLabel = {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    fontWeight: 600,
    marginBottom: 3,
  } as const

  const zonesWithClusters = allZones
    .map(zone => ({ zone, cards: allClusters.filter(c => c.zone_id === zone.id).map(buildCard) }))
    .filter(g => g.cards.length > 0)

  return (
    <>
      <PageHead
        eyebrow="The territory"
        title="Clusters"
        right={isAdmin && zoneOptions.length > 0 ? <AddClusterButton zoneOptions={zoneOptions} /> : undefined}
      />

      {zonesWithClusters.length === 0 ? (
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
            {isAdmin
              ? 'Open your first cluster to begin building its waitlist.'
              : 'An administrator will open the first cluster.'}
          </p>
        </div>
      ) : (
        zonesWithClusters.map(({ zone, cards }) => (
          <div key={zone.id} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 18px' }}>
              <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 25, fontWeight: 600, margin: 0 }}>
                {zone.name}
              </h2>
              {zone.abbreviation && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'var(--green-glow)',
                    color: 'var(--green-bright)',
                  }}
                >
                  {zone.abbreviation}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {cards.map((c) => {
                const isForming = c.cluster.status === 'forming' || c.capacity === 0
                const needed = Math.max(0, MIN_COMMITTED_TO_LAUNCH - c.committedMembers.length)
                const breakevenGap = c.cost - c.committedRevenue
                const premierNeeded = Math.max(0, Math.ceil(breakevenGap / PREMIER_PRICE_CENTS))
                const bePct = c.cost > 0 ? Math.min(100, Math.round((c.committedRevenue / c.cost) * 100)) : 0
                return (
                  <div
                    key={c.cluster.id}
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
                        pct={(c.committedMembers.length / MIN_COMMITTED_TO_LAUNCH) * 100}
                        color="var(--champagne)"
                        centerTop={String(c.committedMembers.length)}
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
                        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.01em' }}>
                          {c.cluster.name}
                        </span>
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
                        {isAdmin && (
                          <span style={{ marginLeft: 'auto' }}>
                            <EditClusterButton
                              cluster={c.cluster}
                              activeMemberCount={c.activeMembers.length}
                              hasCaregiver={Boolean(c.caregiverName)}
                            />
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 14 }}>
                        {c.caregiverName || 'No caregiver yet'}
                        {` · ${c.activeMembers.length} active · ${c.committedMembers.length - c.activeMembers.length} waitlisted`}
                      </div>

                      {isForming ? (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginBottom: 6 }}>
                            <span>Committed revenue</span>
                            <b style={{ color: 'var(--text)', fontWeight: 600 }}>
                              {formatMoney(c.committedRevenue)} of {formatMoney(c.cost)}
                            </b>
                          </div>
                          <div style={{ height: 4, borderRadius: 999, background: 'var(--ring-track)', overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${bePct}%`,
                                borderRadius: 999,
                                background: 'linear-gradient(90deg, var(--green-dark), var(--champagne))',
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--champagne)', fontWeight: 600, marginTop: 8 }}>
                            {needed > 0
                              ? `${needed} more committed ${needed === 1 ? 'subscriber' : 'subscribers'} to launch`
                              : premierNeeded > 0
                                ? `${premierNeeded} more Premier ${premierNeeded === 1 ? 'subscriber' : 'subscribers'} to break even`
                                : 'Committed revenue clears breakeven'}
                          </div>
                        </div>
                      ) : (
                        <>
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
                          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 10 }}>
                            {c.margin >= 0
                              ? 'Above breakeven'
                              : `${Math.ceil((c.cost - c.revenue) / PREMIER_PRICE_CENTS)} more Premier ${Math.ceil((c.cost - c.revenue) / PREMIER_PRICE_CENTS) === 1 ? 'subscriber' : 'subscribers'} to break even`}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </>
  )
}
