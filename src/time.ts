import type { Item } from './types'

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const asDate = (iso: string) => new Date(iso + 'T12:00:00Z')

export function addDays(iso: string, n: number): string {
  const d = asDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const fmtLong = (iso: string) =>
  new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(asDate(iso))

export const fmtWeekday = (iso: string) =>
  new Intl.DateTimeFormat('he-IL', { weekday: 'narrow', timeZone: 'UTC' }).format(asDate(iso))

export const dayNum = (iso: string) => String(asDate(iso).getUTCDate())

export const monthShort = (iso: string) =>
  new Intl.DateTimeFormat('he-IL', { month: 'short', timeZone: 'UTC' }).format(asDate(iso))

/** Today's date and the current minute of the day, in a given time zone. */
export function nowIn(tz: string): { date: string; minutes: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map(x => [x.type, x.value])
  )
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: +p.hour * 60 + +p.minute }
}

export const toMin = (t?: string) => {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null
}

/**
 * Puts an item where its time belongs: right after the last timed item that
 * isn't later than it. Dividers and untimed items keep their own positions, so
 * a heading stays above the things under it. Untimed items go to the end.
 */
export function placeByTime(items: Item[], item: Item): Item[] {
  const rest = items.filter(i => i.id !== item.id)
  const t = toMin(item.time)
  if (t == null) {
    const old = items.findIndex(i => i.id === item.id)
    if (old >= 0) { const copy = [...items]; copy[old] = item; return copy }
    return [...rest, item]
  }
  let after = -1
  let firstLater = -1
  rest.forEach((i, idx) => {
    const it = toMin(i.time)
    if (it == null) return
    if (it <= t) after = idx
    else if (firstLater < 0) firstLater = idx
  })
  const at = after >= 0 ? after + 1 : firstLater >= 0 ? firstLater : rest.length
  return [...rest.slice(0, at), item, ...rest.slice(at)]
}

export const TIME_ZONES: { id: string; label: string }[] = [
  { id: 'Europe/London', label: 'לונדון' },
  { id: 'Asia/Jerusalem', label: 'ישראל' },
  { id: 'Europe/Paris', label: 'מרכז אירופה' },
  { id: 'America/New_York', label: 'ניו יורק' },
]
