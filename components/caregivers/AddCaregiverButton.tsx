'use client'

import { useState } from 'react'
import CaregiverModal from '@/components/caregivers/CaregiverModal'

export default function AddCaregiverButton() {
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
        Add caregiver
      </button>
      {open && (
        <CaregiverModal
          mode="create"
          caregiver={null}
          assignedClusterName={null}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
