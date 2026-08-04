import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import AddZoneButton from '@/components/zones/AddZoneButton'
import type { UserRole, Zone } from '@/types'

export default async function ZonesPage() {
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
    svc.from('clusters').select('id, zone_id, status'),
    svc.from('clients').select('id, cluster_id, status, tiers(monthly_price_cents)'),
  ])

  const role: UserRole = (profile?.role as UserRole) || 'scheduler'
  const isAdmin = role === 'admin'

  const allZones = (zones || []) as Zone[]
  const allClusters = clusters || []
  const activeClients = (clients || []).filter(c => c.status === 'active')

  const zoneCards = allZones.map((zone) => {
    const zoneClusters = allClusters.filter(c => c.zone_id === zone.id)
    const zoneClusterIds = new Set(zoneClusters.map(c => c.id))
    const zoneMembers = activeClients.filter(c => c.cluster_id && zoneClusterIds.has(c.cluster_id))
    const revenue = zoneMembers.reduce((sum, c) => {
      const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
      return sum + (tier?.monthly_price_cents || 0)
    }, 0)
    return { zone, clusterCount: zoneClusters.length, memberCount: zoneMembers.length, revenue }
  })

  const totalClusters = allClusters.length
  const totalMembers = activeClients.length

  const formatMoney = (cents: number) =>
    '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

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

  return (
    <>
      <PageHead
        eyebrow="The territory"
        title="Zones"
        right={isAdmin ? <AddZoneButton /> : undefined}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 40 }}>
        <div style={metricCard}>
          <div style={metricLabel}>Zones</div>
          <div style={metricValue}>{allZones.length}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Clusters</div>
          <div style={metricValue}>{totalClusters}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Club members</div>
          <div style={metricValue}>{totalMembers}</div>
        </div>
      </div>

      {zoneCards.length === 0 ? (
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
            No zones yet
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
            {isAdmin
              ? 'Add your first zone to begin mapping the territory.'
              : 'An administrator will add the first zone.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {zoneCards.map(({ zone, clusterCount, memberCount, revenue }) => (
            <Link key={zone.id} href={`/zones/${zone.id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow)',
                  padding: '24px 26px',
                  cursor: 'pointer',
                  height: '100%',
                  boxSizing: 'border-box',
                  opacity: zone.status === 'inactive' ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, color: 'var(--text)' }}>
                    {zone.name}
                  </span>
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
                  {zone.status === 'inactive' && (
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
                      }}
                    >
                      Inactive
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 18 }}>
                  {zone.center_address || `${zone.center_lat}, ${zone.center_lng}`}
                  {` · ${zone.radius_miles} mi radius`}
                </div>
                <div style={{ display: 'flex', gap: 26 }}>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>
                      Clusters
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {clusterCount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>
                      Members
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                      {memberCount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>
                      Revenue
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--champagne)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(revenue)}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
