import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import TeamClient from '@/components/settings/TeamClient'
import type { Profile, UserRole } from '@/types'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  const [{ data: profile }, { data: profiles }] = await Promise.all([
    user
      ? svc.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    svc.from('profiles').select('*').order('created_at'),
  ])

  const role: UserRole = (profile?.role as UserRole) || 'scheduler'

  if (role !== 'admin') {
    return (
      <div>
        <PageHead eyebrow="Admin" title="Settings" />
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '28px 30px',
            fontSize: 14,
            color: 'var(--text-dim)',
          }}
        >
          Settings are for administrators. Ask an Admin if something here needs changing.
        </div>
      </div>
    )
  }

  return (
    <TeamClient
      profiles={(profiles || []) as Profile[]}
      currentUserId={user?.id || ''}
    />
  )
}
