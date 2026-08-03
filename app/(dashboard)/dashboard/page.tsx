import { createServiceClient } from '@/lib/supabase/service'

export default async function DashboardPage() {
  const svc = createServiceClient()

  const [
    { data: zones },
    { data: clusters },
    { data: clients },
    { data: caregivers },
    { data: tiers },
  ] = await Promise.all([
    svc.from('zones').select('*').eq('status', 'active'),
    svc.from('clusters').select('*, zones(name), caregivers(name, monthly_salary_cents, payroll_burden_pct)'),
    svc.from('clients').select('*, tiers(name, hours_per_month, monthly_price_cents)'),
    svc.from('caregivers').select('*').eq('status', 'active'),
    svc.from('tiers').select('*').order('display_order'),
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

  const totalCapacity = (caregivers?.length || 0) * 160

  const utilPct = totalCapacity > 0 ? Math.round((totalSubscribed / totalCapacity) * 100) : 0

  // Build cluster cards
  const clusterCards = (clusters || []).map(cluster => {
    const clusterClients = activeClients.filter(c => c.cluster_id === cluster.id)
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
    const salary = cg?.monthly_salary_cents || 0
    const burden = cg?.payroll_burden_pct || 25
    const cost = Math.round(salary * (1 + burden / 100))
    const margin = revenue - cost
    const capacity = cg ? 160 : 0
    const utilization = capacity > 0 ? Math.round((subscribedHrs / capacity) * 100) : 0

    let healthLabel = 'Forming'
    let healthColor = '#888'
    let healthBg = '#f0f0f0'
    let barColor = '#ccc'

    if (cluster.status === 'active' && capacity > 0) {
      if (utilization >= 60 && utilization <= 85) {
        healthLabel = 'Healthy'; healthColor = '#15652b'; healthBg = '#e0f5e8'; barColor = '#2D5A1B'
      } else if (utilization > 85) {
        healthLabel = 'Near capacity'; healthColor = '#854F0B'; healthBg = '#fef3cd'; barColor = '#BA7517'
      } else if (utilization >= 40) {
        healthLabel = 'Under-subscribed'; healthColor = '#854F0B'; healthBg = '#fef3cd'; barColor = '#BA7517'
      } else {
        healthLabel = 'Not viable'; healthColor = '#9C0006'; healthBg = '#fce4e4'; barColor = '#A32D2D'
      }
    }

    return {
      ...cluster, clusterClients, subscribedHrs, revenue, cost, margin,
      capacity, utilization, healthLabel, healthColor, healthBg, barColor,
      caregiverName: cg?.name || 'No caregiver assigned', zoneName: zoneName || '',
    }
  })

  const formatDollars = (cents: number) => {
    const abs = Math.abs(cents)
    const formatted = '$' + (abs / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    return cents < 0 ? '-' + formatted : '+' + formatted
  }

  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 20 }}>Dashboard</h1>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Active zones', value: String(activeZoneCount) },
          { label: 'Active clusters', value: String(activeClusters.length), sub: formingClusters.length > 0 ? `${formingClusters.length} forming` : undefined },
          { label: 'Enrolled clients', value: String(activeClients.length), sub: waitlistClients.length > 0 ? `${waitlistClients.length} on waitlist` : undefined },
          { label: 'System utilization', value: `${utilPct}%`, sub: `${totalSubscribed} / ${totalCapacity} hrs` },
        ].map((m) => (
          <div key={m.label} style={{ background: '#eee', borderRadius: 8, padding: '14px 16px' }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#1a1a1a' }}>{m.value}</div>
            {m.sub && <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Cluster health */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500 }}>Cluster health</h2>
      </div>

      {clusterCards.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e8e8e6', borderRadius: 12,
          padding: '40px 20px', textAlign: 'center', color: '#888',
        }}>
          <p style={{ fontSize: 16, marginBottom: 8 }}>No clusters yet</p>
          <p style={{ fontSize: 13 }}>Create a zone first, then add clusters with assigned caregivers.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {clusterCards.map((c) => (
            <div key={c.id} style={{ background: '#fff', border: '1px solid #e8e8e6', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 500 }}>{c.name}</span>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99, fontWeight: 500, background: c.healthBg, color: c.healthColor }}>
                  {c.healthLabel}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                {c.caregiverName} &middot; {c.zoneName}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12, textAlign: 'center' }}>
                <div><div style={{ fontSize: 16, fontWeight: 500 }}>{c.clusterClients.length}</div><div style={{ fontSize: 11, color: '#999' }}>Clients</div></div>
                <div><div style={{ fontSize: 16, fontWeight: 500 }}>{c.subscribedHrs}</div><div style={{ fontSize: 11, color: '#999' }}>Subscribed hrs</div></div>
                <div><div style={{ fontSize: 16, fontWeight: 500 }}>{c.capacity || '\u2014'}</div><div style={{ fontSize: 11, color: '#999' }}>Capacity hrs</div></div>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#eee', marginBottom: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: c.barColor, width: `${Math.min(c.utilization, 100)}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999', marginBottom: 12 }}>
                <span>{c.utilization}% utilized</span>
                <span>{c.margin >= 0 ? 'Breakeven: passed' : `Need ${Math.ceil((c.cost - c.revenue) / 120000)} more`}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #eee' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: c.margin >= 0 ? '#15652b' : '#c00' }}>
                  {formatDollars(c.margin)}/mo
                </span>
                <span style={{ fontSize: 12, color: '#666', cursor: 'pointer' }}>View schedule →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Waitlist */}
      {waitlistClients.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 14 }}>Waitlist</h2>
          <div style={{ background: '#fff', border: '1px solid #e8e8e6', borderRadius: 12, padding: '4px 20px' }}>
            {waitlistClients.map((c, i) => {
              const tier = Array.isArray(c.tiers) ? c.tiers[0] : c.tiers
              return (
                <div key={c.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 0', borderBottom: i < waitlistClients.length - 1 ? '1px solid #eee' : 'none',
                  fontSize: 13,
                }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: '#666' }}>{c.address || 'No address'}</span>
                  <span style={{ fontSize: 12, padding: '2px 8px', background: '#f0f0f0', borderRadius: 6, color: '#666' }}>
                    {tier?.name || 'Unknown tier'}
                  </span>
                  <span style={{ fontSize: 12, color: '#999' }}>
                    Added {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
