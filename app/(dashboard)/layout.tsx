import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Sidebar from '@/components/layout/Sidebar'
import type { UserRole } from '@/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role: UserRole = (profile?.role as UserRole) || 'scheduler'
  const displayName = profile?.full_name || user.email || ''

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar role={role} displayName={displayName} />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ padding: '40px 48px 64px', maxWidth: 1120 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
