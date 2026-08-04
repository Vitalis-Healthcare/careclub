// Shared page chrome: eyebrow + Cormorant title, and the placeholder card
// used by routes whose real screens have not shipped yet.

export function PageHead({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string
  title: string
  right?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 34,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--green-bright)',
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {eyebrow}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 40,
            fontWeight: 500,
            letterSpacing: '0.005em',
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          {title}
        </h1>
      </div>
      {right && <div style={{ paddingBottom: 6 }}>{right}</div>}
    </div>
  )
}

export function Placeholder({
  eyebrow,
  title,
  version,
  description,
}: {
  eyebrow: string
  title: string
  version: string
  description: string
}) {
  return (
    <>
      <PageHead eyebrow={eyebrow} title={title} />
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 14,
          boxShadow: 'var(--shadow)',
          padding: '64px 24px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-display), serif',
            fontSize: 22,
            fontWeight: 600,
            margin: '0 0 8px',
          }}
        >
          Arriving in {version}
        </p>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: 0 }}>{description}</p>
      </div>
    </>
  )
}
