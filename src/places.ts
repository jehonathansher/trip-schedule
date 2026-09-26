import type { Mode, Place } from './types'

/*
 * Google Places (New), called directly over REST.
 * Kept inside the free monthly allowance by design:
 *  - every search is one "session" (a token shared by the suggestions and the
 *    final lookup), which Google bills as a single lookup;
 *  - the lookup asks only for address + location (the cheapest tier);
 *  - typing is debounced and needs at least 2 characters.
 * The key only works from this site's address.
 */
const KEY = import.meta.env.VITE_MAPS_KEY as string
const BASE = 'https://places.googleapis.com/v1'

export interface Suggestion { id: string; main: string; secondary: string }

export const newSession = () => crypto.randomUUID()

export async function suggest(input: string, session: string, near?: { lat: number; lng: number }): Promise<Suggestion[]> {
  const body: Record<string, unknown> = { input, sessionToken: session }
  if (near) body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 30000 } }
  const r = await fetch(`${BASE}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`places ${r.status}`)
  const j = await r.json()
  return (j.suggestions ?? [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      id: p.placeId,
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text ?? '',
    }))
}

export async function lookup(s: Suggestion, session: string): Promise<Place> {
  const r = await fetch(`${BASE}/places/${s.id}?sessionToken=${session}`, {
    headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'formattedAddress,location' },
  })
  if (!r.ok) throw new Error(`places ${r.status}`)
  const j = await r.json()
  return {
    name: s.main,
    address: j.formattedAddress,
    lat: j.location?.latitude,
    lng: j.location?.longitude,
    placeId: s.id,
  }
}

const DIRFLG: Partial<Record<Mode, string>> = {
  walk: 'w', tube: 'r', train: 'r', bus: 'r', boat: 'r', taxi: 'd',
}

/** Apple Maps directions from where you are now. */
export function navUrl(p: Place, mode?: Mode): string {
  const dest = p.lat != null && p.lng != null
    ? `${p.lat},${p.lng}`
    : [p.name, p.address].filter(Boolean).join(', ')
  const q = new URLSearchParams({ daddr: dest })
  if (p.lat != null) q.set('q', p.name)
  const flg = mode && DIRFLG[mode]
  if (flg) q.set('dirflg', flg)
  return `https://maps.apple.com/?${q}`
}

export const hasNav = (p?: Place) => !!p && (p.lat != null || !!p.address || !!p.name)
