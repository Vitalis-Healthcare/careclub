'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Calendar, MapPin, Users,
  Heart, UserCheck, Clock, Settings
} from 'lucide-react'
import type { UserRole } from '@/types'

const NAV_ITEMS = [
  { section: 'Operations', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/schedule', label: 'Schedule', icon: Calendar },
    { href: '/zones', label: 'Zones', icon: MapPin },
    { href: '/clusters', label: 'Clusters', icon: Users },
  ]},
  { section: 'People', items: [
    { href: '/clients', label: 'Clients', icon: Heart },
    { href: '/caregivers', label: 'Caregivers', icon: UserCheck },
    { href: '/open-slots', label: 'Open slots', icon: Clock },
  ]},
  { section: 'Admin', items: [
    { href: '/settings', label: 'Settings', icon: Settings },
  ]},
]

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 220, background: '#fff', borderRight: '1px solid #e8e8e6',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0, overflowY: 'auto',
    }}>
      <div style={{ padding: '20px 16px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: '#2D5A1B',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 600,
        }}>CC</div>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#2D5A1B' }}>Care Club</span>
      </div>

      {NAV_ITEMS.map((group) => {
        if (group.section === 'Admin' && role !== 'admin') return null
        return (
          <div key={group.section}>
            <div style={{
              padding: '12px 16px 4px', fontSize: 11, fontWeight: 500,
              color: '#999', textTransform: 'uppercase', letterSpacing: 0.5,
            }}>{group.section}</div>
            {group.items.map((item) => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 16px', fontSize: 14,
                    color: active ? '#2D5A1B' : '#555',
                    background: active ? '#e8f5e2' : 'transparent',
                    borderLeft: active ? '3px solid #2D5A1B' : '3px solid transparent',
                    fontWeight: active ? 500 : 400,
                    cursor: 'pointer',
                  }}>
                    <Icon size={18} />
                    {item.label}
                  </div>
                </Link>
              )
            })}
          </div>
        )
      })}
    </aside>
  )
}
