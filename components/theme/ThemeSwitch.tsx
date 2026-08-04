'use client'

import { useEffect, useState } from 'react'

type ThemeMode = 'dark' | 'light' | 'system'

const MODES: { mode: ThemeMode; label: string }[] = [
  { mode: 'dark', label: 'Dark' },
  { mode: 'light', label: 'Light' },
  { mode: 'system', label: 'Auto' },
]

function resolve(mode: ThemeMode): 'dark' | 'light' {
  if (mode !== 'system') return mode
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export default function ThemeSwitch() {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('careclub-theme') as ThemeMode | null
      if (saved === 'dark' || saved === 'light' || saved === 'system') setMode(saved)
    } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolve(mode))
    try {
      localStorage.setItem('careclub-theme', mode)
    } catch {}
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => document.documentElement.setAttribute('data-theme', resolve('system'))
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])

  return (
    <div
      style={{
        display: 'flex',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      {MODES.map((m) => (
        <button
          key={m.mode}
          onClick={() => setMode(m.mode)}
          style={{
            flex: 1,
            padding: '6px 0',
            fontFamily: 'inherit',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            background: mode === m.mode ? 'var(--surface-raised)' : 'transparent',
            color: mode === m.mode ? 'var(--text)' : 'var(--text-faint)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
