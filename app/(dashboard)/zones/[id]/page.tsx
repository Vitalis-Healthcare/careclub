import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import EditZoneButton from '@/components/zones/EditZoneButton'
import type { UserRole, Zone } from '@/types'

export default async function ZoneDetailPage({
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
    { data: zone },
    { data: clusters },
    { data: clients },
  ] = await Promise.all([
    user
      ? svc.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    svc.from('zones').select('*').eq('id', id).single(),
    svc.from('clusters').select('*, caregivers(name)').eq('zone_id', id).order('created_at'),
    svc.from('clients').select('id, cluster_id, status'),
  ])

  if (!zone) {
    notFound()
  }

  const typedZone = zone as Zone
  const role: UserRole = (profile?.role as UserRole) || 'scheduler'
  const isAdmin = role === 'admin'

  const zoneClusters = clusters || []
  const activeClusterNames = zoneClusters
    .filter(c => c.status === 'active')
    .map(c => c.name as string)

  const memberCountFor = (clusterId: string) =>
    (clients || []).filter(c => c.cluster_id === clusterId && c.status === 'active').length

  const statusPill = (status: string) => {
    if (status === 'active') return { label: 'Active', color: 'var(--green-bright)', bg: 'var(--green-glow)' }
    if (status === 'forming') return { label: 'Forming', color: 'var(--champagne)', bg: 'var(--champagne-glow)' }
    return { label: 'Inactive', color: 'var(--text-faint)', bg: 'var(--surface-raised)' }
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Link
          href="/zones"
          style={{
            fontSize: 12.5,
            fontWeight: 500,
            color: 'var(--text-dim)',
            textDecoration: 'none',
          }}
        >
          ← All zones
        </Link>
      </div>

      <PageHead
        eyebrow="The territory"
        title={typedZone.name}
        right={isAdmin ? <EditZoneButton zone={typedZone} activeClusterNames={activeClusterNames} /> : undefined}
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
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>
            Abbreviation
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>
            {typedZone.abbreviation || '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>
            Center
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>
            {typedZone.center_address || `${typedZone.center_lat}, ${typedZone.center_lng}`}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>
            Radius
          </div>
          <div style={{ fontSize: 14.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {typedZone.radius_miles} mi
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 3 }}>
            Status
          </div>
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '3px 9px',
              borderRadius: 999,
              background: typedZone.status === 'active' ? 'var(--green-glow)' : 'var(--surface-raised)',
              color: typedZone.status === 'active' ? 'var(--green-bright)' : 'var(--text-faint)',
            }}
          >
            {typedZone.status}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 18px' }}>
        <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 25, fontWeight: 600, margin: 0 }}>
          Clusters in this zone
        </h2>
      </div>

      {zoneClusters.length === 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 14,
            boxShadow: 'var(--shadow)',
            padding: '48px 24px',
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          <p style={{ fontFamily: 'var(--font-display), serif', fontSize: 21, fontWeight: 600, margin: '0 0 8px' }}>
            No clusters yet in this zone
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
            Cluster creation arrives in v0.1.2-c.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 14,
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
            marginBottom: 32,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Cluster', 'Status', 'Caregiver', 'Members'].map((h) => (
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
              {zoneClusters.map((c, i) => {
                const cg = Array.isArray(c.caregivers) ? c.caregivers[0] : c.caregivers
                const pill = statusPill(c.status)
                const cellBorder = i < zoneClusters.length - 1 ? '1px solid var(--border-soft)' : 'none'
                return (
                  <tr key={c.id}>
                    <td style={{ padding: '15px 24px', fontSize: 13.5, borderBottom: cellBorder, fontWeight: 600 }}>
                      {c.name}
                    </td>
                    <td style={{ padding: '15px 24px', borderBottom: cellBorder }}>
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
                    </td>
                    <td style={{ padding: '15px 24px', fontSize: 13.5, borderBottom: cellBorder, color: 'var(--text-dim)' }}>
                      {cg?.name || 'No caregiver yet'}
                    </td>
                    <td style={{ padding: '15px 24px', fontSize: 13.5, borderBottom: cellBorder, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
                      {memberCountFor(c.id)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {typedZone.notes && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 18px' }}>
            <h2 style={{ fontFamily: 'var(--font-display), serif', fontSize: 25, fontWeight: 600, margin: 0 }}>
              Service area notes
            </h2>
          </div>
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 14,
              boxShadow: 'var(--shadow)',
              padding: '22px 26px',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--text-dim)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {typedZone.notes}
          </div>
        </>
      )}
    </>
  )
}
