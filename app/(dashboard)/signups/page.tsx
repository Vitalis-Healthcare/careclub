import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import SignupsClient from '@/components/signups/SignupsClient'
import { toTierOptions, buildClusterOptions } from '@/lib/clients/options'
import type { TierRow, ClusterRow, ZoneRow, ClientCountRow } from '@/lib/clients/options'
import type { Lead, UserRole, Client } from '@/types'

// The Sign-ups inbox (v0.1.13; v0.1.14 adds enroll-from-lead and area
// filtering). Every request from the public front page lands here: the
// demand map (open counts by area, now clickable filters) across the top,
// the working list below, closed leads behind a toggle. "Enroll as member"
// opens the real enrollment modal pre-filled from the lead; a successful
// save marks the lead converted. Status moves are warn-and-allow.

export default async function SignupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  const [
    { data: profile },
    { data: leadsData },
    { data: tiers },
    { data: clusters },
    { data: zones },
    { data: members },
  ] = await Promise.all([
    user
      ? svc.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    svc.from('leads').select('*').order('created_at', { ascending: false }),
    svc.from('tiers').select('id, name, shifts_per_month, hours_per_month, monthly_price_cents, display_order'),
    svc.from('clusters').select('id, name, zone_id, caregiver_id, status'),
    svc.from('zones').select('id, name'),
    svc.from('clients').select('id, cluster_id, status, archived_at'),
  ])

  const role: UserRole = (profile?.role as UserRole) || 'scheduler'
  const leads = (leadsData as Lead[] | null) ?? []

  // The same option builders the Club members page uses, so enrollment from
  // a lead is the identical experience. Archived members stay out of the
  // occupancy counts (v0.1.10).
  const workingMembers = ((members || []) as Pick<Client, 'id' | 'cluster_id' | 'status' | 'archived_at'>[])
    .filter(m => !m.archived_at)
  const tierOptions = toTierOptions((tiers || []) as TierRow[])
  const clusterOptions = buildClusterOptions(
    (clusters || []) as ClusterRow[],
    (zones || []) as ZoneRow[],
    workingMembers.map(m => ({ id: m.id, cluster_id: m.cluster_id, status: m.status })) as ClientCountRow[],
  )
  const geocodeEnabled = Boolean(process.env.GOOGLE_MAPS_API_KEY)

  return (
    <div>
      <PageHead
        eyebrow="The front door"
        title="Sign-ups"
      />
      <SignupsClient
        initialLeads={leads}
        role={role}
        tierOptions={tierOptions}
        clusterOptions={clusterOptions}
        geocodeEnabled={geocodeEnabled}
      />
    </div>
  )
}
