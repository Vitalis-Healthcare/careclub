import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Care Club — Vitalis Healthcare',
  description: 'Cluster-based subscription home care scheduling',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', background: '#f5f5f4' }}>
        {children}
      </body>
    </html>
  )
}
