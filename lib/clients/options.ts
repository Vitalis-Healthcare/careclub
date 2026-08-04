// Pure helpers shared by the Club members list page and the member profile
// page so both build identical option sets for the enroll/edit modal.
// Committed = active + waitlist members attached to the cluster (see
// careclub-schema.md economics notes — do not collapse this with active).

import type { TierOption, ClusterPlacementOption } from '@/components/clients/ClientModal'

export interface TierRow {
  id: string
  name: string
  shifts_per_month: number
  hours_per_month: number
  monthly_price_cents: number
  display_order: number
}

export interface ClusterRow {
  id: string
  name: string
  zone_id: string
  caregiver_id: string | null
  status: 'active' | 'forming' | 'inactive'
}

export interface ZoneRow {
  id: string
  name: string
}

export interface ClientCountRow {
  id: string
  cluster_id: string | null
  status: 'waitlist' | 'active' | 'paused' | 'canceled'
}

export function toTierOptions(tiers: TierRow[]): TierOption[] {
  return [...tiers]
    .sort((a, b) => a.display_order - b.display_order)
    .map(t => ({
      id: t.id,
      name: t.name,
      shifts_per_month: t.shifts_per_month,
      hours_per_month: t.hours_per_month,
      monthly_price_cents: t.monthly_price_cents,
    }))
}

export function buildClusterOptions(
  clusters: ClusterRow[],
  zones: ZoneRow[],
  clients: ClientCountRow[],
): ClusterPlacementOption[] {
  const zoneNameById = new Map<string, string>()
  for (const z of zones) zoneNameById.set(z.id, z.name)

  return clusters.map(c => ({
    id: c.id,
    name: c.name,
    zoneName: zoneNameById.get(c.zone_id) || '—',
    status: c.status,
    committedCount: clients.filter(
      m => m.cluster_id === c.id && (m.status === 'active' || m.status === 'waitlist')
    ).length,
    hasCaregiver: Boolean(c.caregiver_id),
  }))
}
