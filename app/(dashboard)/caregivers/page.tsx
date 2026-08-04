import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { PageHead } from '@/components/ui/PageChrome'
import AddCaregiverButton from '@/components/caregivers/AddCaregiverButton'
import EditCaregiverButton from '@/components/caregivers/EditCaregiverButton'
import type { UserRole, Caregiver } from '@/types'

const DAY_STRIP: { code: string; letter: string }[] = [
  { code: 'mon', letter: 'M' },
  { code: 'tue', letter: 'T' },
  { code: 'wed', letter: 'W' },
  { code: 'thu', letter: 'T' },
  { code: 'fri', letter: 'F' },
  { code: 'sat', letter: 'S' },
  { code: 'sun', letter: 'S' },
]

function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  const [hStr, mStr] = value.split(':')
  const h = parseInt(hStr, 10)
  if (!Number.isFinite(h)) return '—'
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${mStr} ${suffix}`
}

export default async function CaregiversPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const svc = createServiceClient()

  const [
    { data: profile },
    { data: caregivers },
    { data: clusters },
  ] = await Promise.all([
    user
      ? svc.from('profiles').select('role').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    svc.from('caregivers').select('*').order('name'),
    svc.from('clusters').select('id, name, caregiver_id'),
  ])

  const role: UserRole = (profile?.role as UserRole) || 'scheduler'
  const isAdmin = role === 'admin'

  const allCaregivers = (caregivers || []) as Caregiver[]
  const clusterByCaregiver = new Map<string, string>()
  for (const c of clusters || []) {
    if (c.caregiver_id) clusterByCaregiver.set(c.caregiver_id, c.name as string)
  }

  const activeCaregivers = allCaregivers.filter(c => c.status === 'active')
  const assignedCount = activeCaregivers.filter(c => clusterByCaregiver.has(c.id)).length
  const unassignedCount = activeCaregivers.length - assignedCount

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

  const statLabel = {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--text-faint)',
    fontWeight: 600,
    marginBottom: 3,
  } as const

  return (
    <>
      <PageHead
        eyebrow="The people"
        title="Caregivers"
        right={isAdmin ? <AddCaregiverButton /> : undefined}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 40 }}>
        <div style={metricCard}>
          <div style={metricLabel}>Caregivers</div>
          <div style={metricValue}>{activeCaregivers.length}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Assigned</div>
          <div style={metricValue}>{assignedCount}</div>
        </div>
        <div style={metricCard}>
          <div style={metricLabel}>Unassigned</div>
          <div style={{ ...metricValue, color: unassignedCount > 0 ? 'var(--amber)' : 'var(--text)' }}>
            {unassignedCount}
          </div>
        </div>
      </div>

      {allCaregivers.length === 0 ? (
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
            No caregivers yet
          </p>
          <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>
            {isAdmin
              ? 'Add your first caregiver to begin staffing clusters.'
              : 'An administrator will add the first caregiver.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {allCaregivers.map((cg) => {
            const clusterName = clusterByCaregiver.get(cg.id) || null
            const inactive = cg.status === 'inactive'
            return (
              <div
                key={cg.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow)',
                  padding: '24px 26px',
                  opacity: inactive ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '0.01em' }}>{cg.name}</span>
                  {inactive ? (
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
                  ) : clusterName ? (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: 'var(--green-glow)',
                        color: 'var(--green-bright)',
                      }}
                    >
                      {clusterName}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '3px 9px',
                        borderRadius: 999,
                        background: 'var(--amber-glow)',
                        color: 'var(--amber)',
                      }}
                    >
                      Unassigned
                    </span>
                  )}
                  {isAdmin && (
                    <span style={{ marginLeft: 'auto' }}>
                      <EditCaregiverButton caregiver={cg} assignedClusterName={clusterName} />
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 16 }}>
                  {[cg.phone, cg.email].filter(Boolean).join(' · ') || 'No contact details'}
                </div>

                <div style={{ display: 'flex', gap: 26, alignItems: 'flex-end' }}>
                  <div>
                    <div style={statLabel}>Salary</div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--champagne)' }}>
                      {formatMoney(cg.monthly_salary_cents)}/mo
                    </div>
                  </div>
                  <div>
                    <div style={statLabel}>Days</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {DAY_STRIP.map((d, i) => {
                        const on = (cg.work_days || []).includes(d.code)
                        return (
                          <span
                            key={`${d.code}-${i}`}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 5,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 700,
                              background: on ? 'var(--green-glow)' : 'transparent',
                              color: on ? 'var(--green-bright)' : 'var(--text-faint)',
                              border: `1px solid ${on ? 'var(--green-bright)' : 'var(--border)'}`,
                            }}
                          >
                            {d.letter}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={statLabel}>Shift</div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(cg.shift_start)} – {formatTime(cg.shift_end)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
