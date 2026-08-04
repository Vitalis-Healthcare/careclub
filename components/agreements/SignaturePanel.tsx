'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DIRECTIVE_OPTIONS } from '@/lib/agreements/content'

// Finger- and mouse-friendly signature capture on a plain canvas via pointer
// events — no library. The drawing is exported as a PNG data URL.

export default function SignaturePanel({
  token,
  memberName,
  staffName,
  staffRole,
  sentAt,
}: {
  token: string
  memberName: string
  staffName: string
  staffRole: string
  sentAt: string
}) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [choices, setChoices] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const ctxOf = () => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    return { canvas, ctx }
  }

  const pointOf = (canvas: HTMLCanvasElement, e: React.PointerEvent) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDraw = (e: React.PointerEvent) => {
    const c = ctxOf()
    if (!c) return
    drawing.current = true
    c.canvas.setPointerCapture(e.pointerId)
    const p = pointOf(c.canvas, e)
    c.ctx.beginPath()
    c.ctx.moveTo(p.x, p.y)
  }

  const moveDraw = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const c = ctxOf()
    if (!c) return
    const p = pointOf(c.canvas, e)
    c.ctx.lineWidth = 2.4
    c.ctx.lineCap = 'round'
    c.ctx.lineJoin = 'round'
    c.ctx.strokeStyle = '#1D2A22'
    c.ctx.lineTo(p.x, p.y)
    c.ctx.stroke()
    if (!hasInk) setHasInk(true)
  }

  const endDraw = () => {
    drawing.current = false
  }

  const clearCanvas = () => {
    const c = ctxOf()
    if (!c) return
    c.ctx.clearRect(0, 0, c.canvas.width, c.canvas.height)
    setHasInk(false)
  }

  const toggleChoice = (key: string) => {
    setChoices(prev => {
      // "No Advance Directive" is exclusive of the document options.
      if (key === 'none') {
        return prev.includes('none') ? [] : ['none']
      }
      const without = prev.filter(k => k !== 'none')
      return without.includes(key) ? without.filter(k => k !== key) : [...without, key]
    })
  }

  const handleSign = async () => {
    setError('')
    if (choices.length === 0) {
      setError('Choose at least one option in the Advance Directives section above ("No Advance Directive" is a valid choice).')
      return
    }
    if (!signerName.trim()) {
      setError('Type your full name (or your representative\u2019s) to sign.')
      return
    }
    if (!hasInk) {
      setError('Draw your signature in the box.')
      return
    }
    const canvas = canvasRef.current
    if (!canvas) return
    setBusy(true)
    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signature_data: canvas.toDataURL('image/png'),
          directive_choices: choices,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setBusy(false)
        return
      }
      setDone(true)
      setBusy(false)
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div
        style={{
          background: 'var(--green-glow)',
          border: '1px solid var(--green-bright)',
          borderRadius: 10,
          padding: '18px 20px',
          fontSize: 14,
          color: 'var(--green-dark)',
          fontWeight: 600,
          textAlign: 'center',
        }}
      >
        Thank you, {signerName.trim()}. Your membership agreement is signed — welcome to the Care Club.
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 8 }}>
          Advance Directives — I will be providing the following to Vitalis
        </div>
        {DIRECTIVE_OPTIONS.map((o) => {
          const on = choices.includes(o.key)
          return (
            <button
              key={o.key}
              onClick={() => toggleChoice(o.key)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
                fontSize: 13.5,
                padding: '10px 12px',
                marginBottom: 6,
                background: on ? 'var(--green-glow)' : 'var(--surface-raised)',
                color: 'var(--text)',
                border: `1px solid ${on ? 'var(--green-bright)' : 'var(--border)'}`,
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'inline-block', width: 20, fontWeight: 700, color: on ? 'var(--green-bright)' : 'var(--text-faint)' }}>
                {on ? '☑' : '☐'}
              </span>
              {o.label}
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.7, marginBottom: 18 }}>
        <b>I have read and understand all of the above.</b> By typing my name and signing below, I agree to the Care Club membership on these terms.
      </div>

      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600, marginBottom: 7 }}>
        Full name of {memberName} or representative
      </div>
      <input
        value={signerName}
        onChange={(e) => setSignerName(e.target.value)}
        placeholder={memberName}
        style={{
          width: '100%',
          padding: '12px 14px',
          fontSize: 15,
          fontFamily: 'inherit',
          background: 'var(--surface-raised)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          outline: 'none',
          boxSizing: 'border-box',
          marginBottom: 18,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-faint)', fontWeight: 600 }}>
          Signature — draw with your finger or mouse
        </div>
        <button
          onClick={clearCanvas}
          style={{ fontSize: 12, fontWeight: 600, fontFamily: 'inherit', background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={180}
        onPointerDown={startDraw}
        onPointerMove={moveDraw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        style={{
          width: '100%',
          height: 150,
          background: 'var(--surface-raised)',
          border: `1.5px dashed ${hasInk ? 'var(--green-bright)' : 'var(--border)'}`,
          borderRadius: 10,
          touchAction: 'none',
          cursor: 'crosshair',
          marginBottom: 18,
          display: 'block',
        }}
      />

      <div
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-soft)',
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 12.5,
          color: 'var(--text-dim)',
          marginBottom: 18,
        }}
      >
        Countersigned for Vitalis Healthcare, LLC by <b style={{ color: 'var(--text)' }}>{staffName}</b> ({staffRole}), {sentAt}.
      </div>

      {error && <p style={{ fontSize: 13.5, color: 'var(--red)', margin: '0 0 14px' }}>{error}</p>}

      <button
        onClick={handleSign}
        disabled={busy}
        style={{
          width: '100%',
          padding: '15px 0',
          fontSize: 15.5,
          fontWeight: 700,
          fontFamily: 'inherit',
          background: busy ? 'var(--border)' : 'var(--green-bright)',
          color: busy ? 'var(--text-faint)' : 'var(--on-accent)',
          border: 'none',
          borderRadius: 10,
          cursor: busy ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Signing…' : 'Sign the agreement'}
      </button>
    </div>
  )
}
