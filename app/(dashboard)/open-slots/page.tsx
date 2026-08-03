export default function OpenSlotsPage() {
  return (
    <>
      <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', marginBottom: 20 }}>Open slots</h1>
      <div style={{
        background: '#fff', border: '1px solid #e8e8e6', borderRadius: 12,
        padding: '60px 20px', textAlign: 'center', color: '#888',
      }}>
        <p style={{ fontSize: 16, marginBottom: 8 }}>Open slots board — coming in v0.1.7</p>
        <p style={{ fontSize: 13 }}>View available capacity across all clusters for overage scheduling.</p>
      </div>
    </>
  )
}
