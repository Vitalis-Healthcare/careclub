'use client'

import { useState } from 'react'
import ClusterModal from '@/components/clusters/ClusterModal'
import type { Cluster } from '@/types'

export default function EditClusterButton({
  cluster,
  activeMemberCount,
  hasCaregiver,
}: {
  cluster: Cluster
  activeMemberCount: number
  hasCaregiver: boolean
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
        Edit
      </button>
      {open && (
        <ClusterModal
          mode="edit"
          cluster={cluster}
          zoneOptions={[]}
          activeMemberCount={activeMemberCount}
          hasCaregiver={hasCaregiver}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
