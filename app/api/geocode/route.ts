import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// Server-side geocoding. GOOGLE_MAPS_API_KEY lives only in Vercel env vars
// (application restriction: None; API restriction: Geocoding + Maps JS +
// Places) and is never sent to the browser. When the key is absent the route
// answers 503 with configured:false and the UI degrades gracefully.

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Only administrators can geocode addresses.' }, { status: 403 })
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Geocoding is not configured yet. Enter coordinates manually or leave them blank.', configured: false },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const address = typeof (body as Record<string, unknown>)?.address === 'string'
    ? ((body as Record<string, unknown>).address as string).trim()
    : ''
  if (!address) {
    return NextResponse.json({ error: 'Enter an address to look up.' }, { status: 400 })
  }

  try {
    const url =
      'https://maps.googleapis.com/maps/api/geocode/json?address=' +
      encodeURIComponent(address) +
      '&components=country:US&region=us&key=' +
      encodeURIComponent(apiKey)

    const res = await fetch(url)
    if (!res.ok) {
      return NextResponse.json({ error: 'The geocoding service is unavailable right now. Try again shortly.' }, { status: 502 })
    }

    const data = await res.json()

    if (data.status === 'ZERO_RESULTS') {
      return NextResponse.json({ error: 'No match found for that address. Check the spelling or enter coordinates manually.' }, { status: 404 })
    }
    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      return NextResponse.json({ error: 'The address lookup failed. Try again or enter coordinates manually.' }, { status: 502 })
    }

    const first = data.results[0]
    const lat = first?.geometry?.location?.lat
    const lng = first?.geometry?.location?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'The address lookup returned an unexpected result. Enter coordinates manually.' }, { status: 502 })
    }

    return NextResponse.json({
      lat,
      lng,
      formatted_address: typeof first.formatted_address === 'string' ? first.formatted_address : address,
    })
  } catch {
    return NextResponse.json({ error: 'Could not reach the geocoding service. Try again or enter coordinates manually.' }, { status: 502 })
  }
}
