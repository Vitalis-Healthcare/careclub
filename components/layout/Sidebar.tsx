'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Calendar, Map, MapPin, Network,
  Users, Heart, Clock, Settings, Inbox
} from 'lucide-react'
import type { UserRole } from '@/types'
import ThemeSwitch from '@/components/theme/ThemeSwitch'

const NAV_ITEMS: {
  section: string | null
  items: { href: string; label: string; icon: React.ComponentType<{ size?: number | string }> }[]
}[] = [
  { section: null, items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/schedule', label: 'Schedule', icon: Calendar },
  ]},
  { section: 'The territory', items: [
    { href: '/map', label: 'The map', icon: Map },
    { href: '/zones', label: 'Zones', icon: MapPin },
    { href: '/clusters', label: 'Clusters', icon: Network },
  ]},
  { section: 'The people', items: [
    { href: '/signups', label: 'Sign-ups', icon: Inbox },
    { href: '/clients', label: 'Club members', icon: Users },
    { href: '/caregivers', label: 'Caregivers', icon: Heart },
    { href: '/open-slots', label: 'Open slots', icon: Clock },
  ]},
  { section: 'Admin', items: [
    { href: '/settings', label: 'Settings', icon: Settings },
  ]},
]

export default function Sidebar({ role, displayName }: { role: UserRole; displayName: string }) {
  const pathname = usePathname()

  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside
      style={{
        width: 232,
        flexShrink: 0,
        background: 'var(--bg)',
        borderRight: '1px solid var(--border-soft)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflowY: 'auto',
        padding: '28px 0 20px',
      }}
    >
      <div style={{ padding: '0 26px 6px' }}>
        <div
          style={{
            fontSize: 10.5,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            fontWeight: 600,
          }}
        >
          Vitalis Healthcare
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 25,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '0.01em',
            marginTop: 2,
          }}
        >
          Care <em style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--champagne)' }}>Club</em>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border-soft)', margin: '20px 26px 10px' }} />

      {NAV_ITEMS.map((group, gi) => {
        if (group.section === 'Admin' && role !== 'admin') return null
        return (
          <div key={group.section || `group-${gi}`}>
            {group.section && (
              <div
                style={{
                  padding: '0 26px',
                  margin: '16px 0 8px',
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--text-faint)',
                  fontWeight: 600,
                }}
              >
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 26px',
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: active ? 'var(--text)' : 'var(--text-dim)',
                      borderLeft: active ? '2px solid var(--green-bright)' : '2px solid transparent',
                      background: active
                        ? 'linear-gradient(90deg, var(--green-glow), transparent 70%)'
                        : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={16} />
                    {item.label}
                  </div>
                </Link>
              )
            })}
          </div>
        )
      })}

      <div style={{ marginTop: 'auto', padding: '18px 26px 0' }}>
        <div style={{ marginBottom: 16 }}>
          <ThemeSwitch />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'var(--green-dark)',
              color: '#EAF4DC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.03em',
              flexShrink: 0,
            }}
          >
            {initials || 'CC'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-faint)' }}>
              {role === 'admin' ? 'Administrator' : 'Staff'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
