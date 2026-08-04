'use client'

import { useState } from 'react'
import ZoneModal from '@/components/zones/ZoneModal'

export default function AddZoneButton({ geocodeEnabled }: { geocodeEnabled: boolean }) {
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
          background: 'var(--green-bright)',
          color: 'var(--on-accent)',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Add zone
      </button>
      {open && (
        <ZoneModal
          mode="create"
          zone={null}
          activeClusterNames={[]}
          geocodeEnabled={geocodeEnabled}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
