import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import TerritoryMap from '@/components/map/TerritoryMap'
import type { MapZone, MapMember } from '@/components/map/TerritoryMap'

// The map (v0.1.11). Read-only: the territory as it lies on the ground —
// zone circles from stored centers and radii, member pins colored by
// status. Archived members are excluded, consistent with every working
// surface. Members without coordinates are listed below the map rather
// than silently dropped.

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isStaff = Boolean(user)

  const svc = createServiceClient()

  const [
    { data: zones },
    { data: clusters },
    { data: clients },
    { data: tiers },
  ] = await Promise.all([
    svc.from('zones').select('id, name, center_lat, center_lng, radius_miles, status'),
    svc.from('clusters').select('id, name'),
    svc.from('clients').select('id, name, status, lat, lng, cluster_id, tier_id, archived_at'),
    svc.from('tiers').select('id, name'),
  ])

  const clusterNameById = new Map((clusters || []).map(c => [c.id as string, c.name as string]))
  const tierNameById = new Map((tiers || []).map(t => [t.id as string, t.name as string]))

  const workingMembers = (clients || []).filter(m => !m.archived_at)

  const mapZones: MapZone[] = (zones || [])
    .filter(z => z.status === 'active' && z.center_lat != null && z.center_lng != null)
    .map(z => ({
      id: z.id as string,
      name: z.name as string,
      lat: Number(z.center_lat),
      lng: Number(z.center_lng),
      radiusMiles: Number(z.radius_miles),
    }))

  const placed: MapMember[] = []
  const unplotted: { id: string; name: string; status: string }[] = []
  for (const m of workingMembers) {
    if (m.lat != null && m.lng != null) {
      placed.push({
        id: m.id as string,
        name: m.name as string,
        status: m.status as MapMember['status'],
        lat: Number(m.lat),
        lng: Number(m.lng),
        tierName: tierNameById.get(String(m.tier_id)) || '—',
        clusterName: m.cluster_id ? clusterNameById.get(String(m.cluster_id)) || null : null,
      })
    } else {
      unplotted.push({ id: m.id as string, name: m.name as string, status: m.status as string })
    }
  }

  const browserKeyConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

  return (
    <>
      <PageHead eyebrow="The territory" title="The map" />

      {!browserKeyConfigured ? (
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
            The map is not configured yet
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
            Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel (a browser key restricted to this site) and redeploy.
          </p>
        </div>
      ) : (
        <TerritoryMap zones={mapZones} members={placed} />
      )}

      {isStaff && unplotted.length > 0 && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 14,
            boxShadow: 'var(--shadow)',
            padding: '18px 22px',
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-faint)',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Not yet on the map
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0 }}>
            {unplotted.map(m => `${m.name} (${m.status})`).join(' · ')}
            {' — '}no coordinates on file. Set the home address from Edit membership to place them.
          </p>
        </div>
      )}
    </>
  )
}
