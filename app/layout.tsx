import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})

const body = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'Care Club — Vitalis Healthcare',
  description: 'Cluster-based subscription home care scheduling',
}

// Design tokens — the single source of every color in the app.
// Components use inline styles that reference these variables only.
const tokenCss = `
:root[data-theme='dark'] {
  --bg: #0E1512;
  --surface: #16201B;
  --surface-raised: #1C2822;
  --border: #263630;
  --border-soft: #1E2C26;
  --text: #F1EEE4;
  --text-dim: #97A69B;
  --text-faint: #5F6E64;
  --green-bright: #7AB52A;
  --green-dark: #2D5A1B;
  --green-glow: rgba(122, 181, 42, 0.12);
  --champagne: #C9A96A;
  --champagne-glow: rgba(201, 169, 106, 0.14);
  --amber: #D9A441;
  --amber-glow: rgba(217, 164, 65, 0.14);
  --red: #C96A5E;
  --red-glow: rgba(201, 106, 94, 0.14);
  --ring-track: #24332C;
  --on-accent: #10190B;
  --shadow: 0 1px 2px rgba(0,0,0,0.4), 0 8px 32px rgba(0,0,0,0.25);
}
:root[data-theme='light'] {
  --bg: #F5F2EA;
  --surface: #FDFCF8;
  --surface-raised: #FFFFFF;
  --border: #E2DDCE;
  --border-soft: #EBE7DA;
  --text: #1D2A22;
  --text-dim: #64705F;
  --text-faint: #A3AC9C;
  --green-bright: #5E9420;
  --green-dark: #2D5A1B;
  --green-glow: rgba(94, 148, 32, 0.10);
  --champagne: #A8863F;
  --champagne-glow: rgba(168, 134, 63, 0.12);
  --amber: #B7841D;
  --amber-glow: rgba(183, 132, 29, 0.12);
  --red: #B05246;
  --red-glow: rgba(176, 82, 70, 0.10);
  --ring-track: #E8E3D4;
  --on-accent: #FFFFFF;
  --shadow: 0 1px 2px rgba(29,42,34,0.06), 0 8px 28px rgba(29,42,34,0.07);
}
html, body { margin: 0; padding: 0; }
* { box-sizing: border-box; }
a { color: inherit; }
input::placeholder { color: var(--text-faint); }
:focus-visible { outline: 2px solid var(--green-bright); outline-offset: 2px; }
`

// Applies the saved theme before first paint so there is no flash.
const themeInit = `
(function () {
  try {
    var mode = localStorage.getItem('careclub-theme') || 'dark';
    var resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : mode;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
      <body
        style={{
          fontFamily: 'var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif',
          background: 'var(--bg)',
          color: 'var(--text)',
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: tokenCss }} />
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  )
}
