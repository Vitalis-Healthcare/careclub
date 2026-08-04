'use client'

import { useState } from 'react'
import ShiftModal, { ShiftForModal } from '@/components/schedule/ShiftModal'

export default function ShiftCard({
  shift,
  conflict,
}: {
  shift: ShiftForModal
  conflict: boolean
}) {
  const [open, setOpen] = useState(false)

  const canceled = shift.status === 'canceled'
  const completed = shift.status === 'completed'
  const noShow = shift.status === 'no_show'

  const border = conflict
    ? 'var(--amber)'
    : canceled
      ? 'var(--red)'
      : completed
        ? 'var(--green-bright)'
        : noShow
          ? 'var(--amber)'
          : 'var(--border-soft)'

  const subline = () => {
    const base = `${shift.timeLabel} · ${shift.duration_hours} hrs`
    if (completed) return `${base} · done`
    if (noShow) return `${base} · no-show`
    if (canceled) return `${base} · ${shift.cancel_type === 'forfeit' ? 'forfeited' : 'free cancel'}`
    return base
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          fontFamily: 'inherit',
          background: 'var(--surface-raised)',
          border: `1px solid ${border}`,
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 8,
          cursor: 'pointer',
          opacity: canceled ? 0.6 : 1,
        }}
      >
        <div
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            marginBottom: 2,
            color: 'var(--text)',
            textDecoration: canceled ? 'line-through' : 'none',
          }}
        >
          {shift.memberName}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: conflict
              ? 'var(--amber)'
              : completed
                ? 'var(--green-bright)'
                : noShow
                  ? 'var(--amber)'
                  : canceled
                    ? 'var(--red)'
                    : 'var(--text-dim)',
          }}
        >
          {subline()}
          {shift.is_overage && !canceled && (
            <span style={{ color: 'var(--champagne)' }}> · +1 hr</span>
          )}
        </div>
      </button>
      {open && <ShiftModal shift={shift} onClose={() => setOpen(false)} />}
    </>
  )
}
