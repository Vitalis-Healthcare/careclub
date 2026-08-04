'use client'

import { useState } from 'react'
import ClientModal, { TierOption, ClusterPlacementOption } from '@/components/clients/ClientModal'
import type { Client } from '@/types'

export default function EditClientButton({
  client,
  tierOptions,
  clusterOptions,
  geocodeEnabled,
}: {
  client: Client
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
          padding: '7px 14px',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'inherit',
          background: 'transparent',
          color: 'var(--text-dim)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        Edit membership
      </button>
      {open && (
        <ClientModal
          mode="edit"
          client={client}
          tierOptions={tierOptions}
          clusterOptions={clusterOptions}
          geocodeEnabled={geocodeEnabled}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
