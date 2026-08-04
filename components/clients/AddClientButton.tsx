'use client'

import { useState } from 'react'
import ClientModal, { TierOption, ClusterPlacementOption } from '@/components/clients/ClientModal'

export default function AddClientButton({
  tierOptions,
  clusterOptions,
  geocodeEnabled,
}: {
  tierOptions: TierOption[]
  clusterOptions: ClusterPlacementOption[]
  geocodeEnabled: boolean
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
          background: 'var(--green-bright)',
          color: 'var(--on-accent)',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Enroll a member
      </button>
      {open && (
        <ClientModal
          mode="create"
          client={null}
          tierOptions={tierOptions}
          clusterOptions={clusterOptions}
          geocodeEnabled={geocodeEnabled}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
