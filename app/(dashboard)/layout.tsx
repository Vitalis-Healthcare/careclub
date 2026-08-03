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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar role={role} />
      <main style={{ flex: 1, background: '#f5f5f4', overflowY: 'auto' }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '12px 28px', borderBottom: '1px solid #e8e8e6', background: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#666' }}>{displayName}</span>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#2D5A1B',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 500,
            }}>
              {displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <div style={{ padding: '24px 28px' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
