'use client'

import { useEffect, useRef } from 'react'

// The territory map (v0.1.11). Loads the Maps JavaScript API in the browser
// with the referrer-restricted NEXT_PUBLIC key. Marker and circle colors are
// resolved AT RUNTIME from the CSS variables via getComputedStyle, so the
// map obeys the design tokens and the active theme without literal hex
// values (canvas-drawn map symbols cannot read CSS vars directly).

export interface MapZone {
  id: string
  name: string
  lat: number
  lng: number
  radiusMiles: number
}

export interface MapMember {
  id: string
  name: string
  status: 'waitlist' | 'active' | 'paused' | 'canceled'
  lat: number
  lng: number
  tierName: string
  clusterName: string | null
}

const METERS_PER_MILE = 1609.344

// The Maps JS API has no installed type package; the handle is deliberately
// loose. All Maps objects are used through this single `any` seam.
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: { maps: any }
    __careclubMapReady?: () => void
  }
}

function loadMapsScript(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve()
      return
    }
    const existing = document.querySelector('script[data-careclub-maps]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Maps failed to load.')))
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=__careclubMapReady`
    script.async = true
    script.setAttribute('data-careclub-maps', '1')
    window.__careclubMapReady = () => resolve()
    script.onerror = () => reject(new Error('Maps failed to load.'))
    document.head.appendChild(script)
  })
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export default function TerritoryMap({
  zones,
  members,
}: {
  zones: MapZone[]
  members: MapMember[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key || !containerRef.current) return
    let cancelled = false

    loadMapsScript(key)
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.maps) return
        const g = window.google.maps

        const statusColor: Record<MapMember['status'], string> = {
          active: cssVar('--green-bright'),
          waitlist: cssVar('--champagne'),
          paused: cssVar('--amber'),
          canceled: cssVar('--text-faint'),
        }
        const zoneColor = cssVar('--green-bright')
        const surface = cssVar('--surface')
        const text = cssVar('--text')

        // Fit the viewport to everything we draw.
        const bounds = new g.LatLngBounds()
        for (const z of zones) {
          const meters = z.radiusMiles * METERS_PER_MILE
          const degLat = meters / 111320
          bounds.extend({ lat: z.lat + degLat, lng: z.lng })
          bounds.extend({ lat: z.lat - degLat, lng: z.lng })
        }
        for (const m of members) bounds.extend({ lat: m.lat, lng: m.lng })

        const map = new g.Map(containerRef.current, {
          center: zones[0] ? { lat: zones[0].lat, lng: zones[0].lng } : { lat: 38.9987, lng: -77.0311 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          backgroundColor: surface,
          // Map canvas styling takes literal colors by API design; these
          // are the dark-forest palette matched to the app (literal-values
          // exception, documented in conventions).
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#1c231d' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#8a967f' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#141a15' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a332b' }] },
            { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#77816e' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17211f' }] },
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          ],
        })
        if (!bounds.isEmpty()) map.fitBounds(bounds, 48)

        for (const z of zones) {
          new g.Circle({
            map,
            center: { lat: z.lat, lng: z.lng },
            radius: z.radiusMiles * METERS_PER_MILE,
            strokeColor: zoneColor,
            strokeOpacity: 0.65,
            strokeWeight: 1.5,
            fillColor: zoneColor,
            fillOpacity: 0.07,
          })
          new g.Marker({
            map,
            position: { lat: z.lat, lng: z.lng },
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: 3,
              fillColor: zoneColor,
              fillOpacity: 0.9,
              strokeWeight: 0,
            },
            label: {
              text: z.name,
              color: text,
              fontSize: '12px',
              fontWeight: '600',
            },
            clickable: false,
          })
        }

        // InfoWindow renders inside Google's white bubble, which does not
        // follow the app theme; dark literal text colors are correct there
        // (same literal-values exception class as the Stripe appearance
        // object). Names are escaped before interpolation.
        const escapeHtml = (s: string) =>
          s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        const infoWindow = new g.InfoWindow()
        for (const m of members) {
          const marker = new g.Marker({
            map,
            position: { lat: m.lat, lng: m.lng },
            title: m.name,
            icon: {
              path: g.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: statusColor[m.status],
              fillOpacity: 0.95,
              strokeColor: surface,
              strokeWeight: 2,
            },
          })
          marker.addListener('click', () => {
            const statusLabel = m.status.charAt(0).toUpperCase() + m.status.slice(1)
            infoWindow.setContent(
              `<div style="font-family:inherit;color:#1a1f1b;min-width:180px;padding:2px 2px 4px">` +
                `<div style="font-weight:700;font-size:14px;margin-bottom:2px">${escapeHtml(m.name)}</div>` +
                `<div style="font-size:12px;margin-bottom:6px">${escapeHtml(m.tierName)} \u00b7 ${statusLabel}${m.clusterName ? ` \u00b7 ${escapeHtml(m.clusterName)}` : ''}</div>` +
                `<a href="/clients/${m.id}" style="font-size:12px;font-weight:600;color:#5E9420;text-decoration:none">View membership \u2192</a>` +
              `</div>`
            )
            infoWindow.open({ map, anchor: marker })
          })
        }
      })
      .catch(() => {
        // The container shows its loading text; a failed load leaves it in place.
      })

    return () => {
      cancelled = true
    }
  }, [zones, members])

  const counts = {
    active: members.filter(m => m.status === 'active').length,
    waitlist: members.filter(m => m.status === 'waitlist').length,
    paused: members.filter(m => m.status === 'paused').length,
    canceled: members.filter(m => m.status === 'canceled').length,
  }

  const legendDot = (color: string) =>
    ({
      display: 'inline-block',
      width: 9,
      height: 9,
      borderRadius: 999,
      background: color,
      marginRight: 6,
    }) as const

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 14,
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: 560,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-faint)',
          fontSize: 13,
        }}
      >
        Drawing the territory…
      </div>
      <div
        style={{
          position: 'absolute',
          left: 14,
          bottom: 14,
          background: 'var(--surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 10,
          boxShadow: 'var(--shadow)',
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--text-dim)',
          display: 'flex',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        <span><span style={legendDot('var(--green-bright)')} />Active {counts.active}</span>
        <span><span style={legendDot('var(--champagne)')} />Waitlist {counts.waitlist}</span>
        {counts.paused > 0 && <span><span style={legendDot('var(--amber)')} />Paused {counts.paused}</span>}
        {counts.canceled > 0 && <span><span style={legendDot('var(--text-faint)')} />Canceled {counts.canceled}</span>}
      </div>
    </div>
  )
}
