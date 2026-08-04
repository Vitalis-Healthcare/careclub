'use client'

import { useState } from 'react'
import CaregiverModal from '@/components/caregivers/CaregiverModal'
import type { Caregiver } from '@/types'

export default function EditCaregiverButton({
  caregiver,
  assignedClusterName,
}: {
  caregiver: Caregiver
  assignedClusterName: string | null
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
        <CaregiverModal
          mode="edit"
          caregiver={caregiver}
          assignedClusterName={assignedClusterName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
