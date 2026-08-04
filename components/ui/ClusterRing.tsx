// The Care Club signature element: a circular gauge read like a dial.
// Server-safe (pure SVG, no handlers) so it renders inside server components.

const R = 48
const CIRCUMFERENCE = 2 * Math.PI * R // ~301.6

export default function ClusterRing({
  pct,
  color,
  centerTop,
  centerTopSuffix,
  centerBottom,
}: {
  pct: number
  color: string
  centerTop: string
  centerTopSuffix?: string
  centerBottom: string
}) {
  const clamped = Math.max(0, Math.min(pct, 100))
  const offset = CIRCUMFERENCE * (1 - clamped / 100)

  return (
    <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
      <svg width={108} height={108} viewBox="0 0 108 108" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={54} cy={54} r={R} fill="none" stroke="var(--ring-track)" strokeWidth={5} />
        <circle
          cx={54}
          cy={54}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 27,
            fontWeight: 600,
            lineHeight: 1,
            color: 'var(--text)',
          }}
        >
          {centerTop}
          {centerTopSuffix && (
            <span style={{ fontSize: 14 }}>{centerTopSuffix}</span>
          )}
        </div>
        <div
          style={{
            fontSize: 8.5,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            fontWeight: 600,
            marginTop: 3,
          }}
        >
          {centerBottom}
        </div>
      </div>
    </div>
  )
}
