import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import SignupsClient from '@/components/signups/SignupsClient'
import type { Lead, UserRole } from '@/types'

// The Sign-ups inbox (v0.1.13). Every request from the public front page
// lands here: the demand map (open counts by area) across the top, the
// working list below, closed leads behind a toggle. Status moves are
// warn-and-allow — Staff walk a lead through contacted / converted /
// closed in whatever order reality takes.

export default async function SignupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  let role: UserRole = 'scheduler'
  if (user) {
    try {
      const { data: profile } = await svc
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role === 'admin') role = 'admin'
    } catch {
      // default stands
    }
  }

  let leads: Lead[] = []
  try {
    const { data } = await svc
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    leads = (data as Lead[] | null) ?? []
  } catch {
    leads = []
  }

  return (
    <div>
      <PageHead
        eyebrow="The front door"
        title="Sign-ups"
      />
      <SignupsClient initialLeads={leads} role={role} />
    </div>
  )
}
