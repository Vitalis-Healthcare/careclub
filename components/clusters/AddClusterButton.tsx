'use client'

import { useState } from 'react'
import ClusterModal, { type ZoneOption } from '@/components/clusters/ClusterModal'

export default function AddClusterButton({ zoneOptions }: { zoneOptions: ZoneOption[] }) {
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
        Add cluster
      </button>
      {open && (
        <ClusterModal
          mode="create"
          cluster={null}
          zoneOptions={zoneOptions}
          activeMemberCount={0}
          hasCaregiver={false}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
