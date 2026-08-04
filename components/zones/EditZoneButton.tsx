'use client'

import { useState } from 'react'
import ZoneModal from '@/components/zones/ZoneModal'
import type { Zone } from '@/types'

export default function EditZoneButton({
  zone,
  activeClusterNames,
}: {
  zone: Zone
  activeClusterNames: string[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: '10px 18px',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          background: 'transparent',
          color: 'var(--text-dim)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Edit zone
      </button>
      {open && (
        <ZoneModal
          mode="edit"
          zone={zone}
          activeClusterNames={activeClusterNames}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
