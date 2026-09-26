import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpDown, CalendarPlus, MapPin, Pencil, Plus, Settings } from 'lucide-react'
import { useTrip } from './useTrip'
import type { Day, Item, Spot, Trip } from './types'
import { addDays, dayNum, fmtLong, fmtWeekday, newId, nowIn, placeByTime, TIME_ZONES } from './time'
import Timeline from './components/Timeline'
import ItemSheet from './components/ItemSheet'
import SpotsSheet from './components/SpotsSheet'
import DaySheet from './components/DaySheet'
import SettingsSheet from './components/SettingsSheet'

const K_DAY = 'schedule-day'

type Open =
  | { k: 'item'; item?: Item }
  | { k: 'spots' }
  | { k: 'day'; day: Day; isNew: boolean }
  | { k: 'settings' }
  | null

const sortDays = (days: Day[]) => [...days].sort((a, b) => a.date.localeCompare(b.date))

/** Somewhere to centre place searches: the last located place in the trip. */
function anchor(trip: Trip) {
  for (const d of [...trip.days].reverse())
    for (const x of [...d.items, ...d.spots].reverse())
      if (x.place?.lat != null && x.place.lng != null) return { lat: x.place.lat, lng: x.place.lng }
  return undefined
}

export default function App() {
  const { trip, update, sync, refresh } = useTrip()
  const [dayId, setDayId] = useState<string | null>(() => {
    const q = new URLSearchParams(location.search).get('day')
    if (q) { history.replaceState(null, '', location.pathname); return q }
    try { return localStorage.getItem(K_DAY) } catch { return null }
  })
  const [open, setOpen] = useState<Open>(null)
  const [ordering, setOrdering] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [tick, setTick] = useState(0)
  const strip = useRef<HTMLDivElement>(null)

  const day = trip.days.find(d => d.id === dayId) ?? pickDefault(trip)
  const tz = day?.tz || trip.tz

  // Remember the day across launches.
  useEffect(() => {
    if (day) try { localStorage.setItem(K_DAY, day.id) } catch { /* ignore */ }
  }, [day?.id])

  // Opening a notification while the app is already running.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'open-day') selectDay(e.data.day) }
    navigator.serviceWorker?.addEventListener('message', onMsg)
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    addEventListener('scroll', onScroll, { passive: true })
    const t = setInterval(() => setTick(x => x + 1), 30_000)
    return () => { removeEventListener('scroll', onScroll); clearInterval(t) }
  }, [])

  // Keep the selected date in view in the strip.
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (el && strip.current) {
      const s = strip.current
      s.scrollLeft = el.offsetLeft - (s.clientWidth - el.offsetWidth) / 2
    }
  }, [day?.id, trip.days.length])

  const now = useMemo(() => nowIn(tz), [tz, tick])
  const near = useMemo(() => anchor(trip), [trip])

  function selectDay(id: string) {
    setDayId(id); setOrdering(false); window.scrollTo({ top: 0 })
  }

  function updateDay(id: string, fn: (d: Day) => Day) {
    update(t => ({ ...t, days: t.days.map(d => d.id === id ? fn(d) : d) }))
  }

  function newDay(): Day {
    const last = trip.days[trip.days.length - 1]
    return { id: newId(), date: last ? addDays(last.date, 1) : nowIn(trip.tz).date, items: [], spots: [] }
  }

  function saveItem(item: Item, isNew: boolean) {
    if (!day) return
    updateDay(day.id, d => {
      const old = d.items.find(i => i.id === item.id)
      const retime = isNew || !old || old.time !== item.time || old.kind !== item.kind
      return { ...d, items: retime ? placeByTime(d.items, item) : d.items.map(i => i.id === item.id ? item : i) }
    })
    setOpen(null)
  }

  function move(i: number, dir: -1 | 1) {
    if (!day) return
    updateDay(day.id, d => {
      const items = [...d.items]
      const j = i + dir
      if (j < 0 || j >= items.length) return d
      ;[items[i], items[j]] = [items[j], items[i]]
      return { ...d, items }
    })
  }

  function spotToTimeline(s: Spot) {
    if (!day) return
    const item: Item = { id: newId(), kind: 'place', title: s.name, place: s.place, note: s.note }
    updateDay(day.id, d => ({ ...d, items: [...d.items, item] }))
  }

  const tzLabel = day?.tz ? TIME_ZONES.find(z => z.id === day.tz)?.label ?? day.tz : null

  return (
    <div className="app">
      <header className="top" data-scrolled={scrolled}>
        <div className="top-row">
          <span className="sync-dot" data-s={sync} title={sync} />
          <div className="trip-name" dir="auto">{trip.name || 'הטיול שלי'}</div>
          <button className="icon-btn" aria-label="הגדרות" onClick={() => setOpen({ k: 'settings' })}>
            <Settings size={21} />
          </button>
        </div>
        {trip.days.length > 0 && (
          <div className="strip" ref={strip} role="tablist" aria-label="ימים">
            {trip.days.map(d => (
              <button key={d.id} className="date nums" role="tab" aria-selected={d.id === day?.id}
                      data-today={d.date === nowIn(d.tz || trip.tz).date}
                      aria-label={fmtLong(d.date)} onClick={() => selectDay(d.id)}>
                <span className="wd">{fmtWeekday(d.date)}</span>
                <span className="dn">{dayNum(d.date)}</span>
              </button>
            ))}
            <button className="date date-add" aria-label="הוספת יום" onClick={() => setOpen({ k: 'day', day: newDay(), isNew: true })}>
              <Plus size={20} />
            </button>
          </div>
        )}
      </header>

      {!day ? (
        <div className="empty">
          <h3>אין עדיין ימים</h3>
          <p>מתחילים מהיום הראשון של הטיול.</p>
          <button className="btn primary" onClick={() => setOpen({ k: 'day', day: newDay(), isNew: true })}>
            <CalendarPlus size={18} /> הוסף יום
          </button>
        </div>
      ) : (
        <>
          <section className="day-head">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1>{fmtLong(day.date)}</h1>
              {day.title && <div className="sub" dir="auto">{day.title}</div>}
              {tzLabel && <span className="tz">שעון {tzLabel}</span>}
            </div>
            <button className="icon-btn" aria-label="עריכת היום" onClick={() => setOpen({ k: 'day', day, isNew: false })}>
              <Pencil size={18} />
            </button>
          </section>

          {day.items.length === 0 ? (
            <div className="empty" style={{ paddingTop: 36 }}>
              <p>היום ריק. מוסיפים שעה, מקום, נסיעה או כותרת.</p>
              <button className="btn primary" onClick={() => setOpen({ k: 'item' })}><Plus size={18} /> הוסף</button>
            </div>
          ) : (
            <>
              <Timeline
                items={day.items}
                nowMin={now.date === day.date ? now.minutes : null}
                ordering={ordering}
                onOpen={item => setOpen({ k: 'item', item })}
                onMove={move}
              />
              {day.items.length > 1 && (
                <div className="tl-foot">
                  <button className="text-btn" data-on={ordering} onClick={() => setOrdering(o => !o)}>
                    <ArrowUpDown size={16} /> {ordering ? 'סיום סידור' : 'סידור מחדש'}
                  </button>
                </div>
              )}
            </>
          )}

          <nav className="dock" aria-label="פעולות">
            <button className="spots" onClick={() => setOpen({ k: 'spots' })}>
              <MapPin size={19} /> מקומות
              {day.spots.length > 0 && <span className="count nums">{day.spots.length}</span>}
            </button>
            <button className="add" onClick={() => setOpen({ k: 'item' })}>
              <Plus size={20} /> הוסף
            </button>
          </nav>
        </>
      )}

      {open?.k === 'item' && day && (
        <ItemSheet
          item={open.item}
          near={near}
          onClose={() => setOpen(null)}
          onSave={item => saveItem(item, !open.item)}
          onDelete={open.item ? () => {
            updateDay(day.id, d => ({ ...d, items: d.items.filter(i => i.id !== open.item!.id) }))
            setOpen(null)
          } : undefined}
        />
      )}

      {open?.k === 'spots' && day && (
        <SpotsSheet
          spots={day.spots}
          near={near}
          onChange={spots => updateDay(day.id, d => ({ ...d, spots }))}
          onToTimeline={spotToTimeline}
          onClose={() => setOpen(null)}
        />
      )}

      {open?.k === 'day' && (
        <DaySheet
          day={open.day}
          isNew={open.isNew}
          tripTz={trip.tz}
          taken={trip.days.filter(d => d.id !== open.day.id).map(d => d.date)}
          onClose={() => setOpen(null)}
          onSave={d => {
            update(t => ({ ...t, days: sortDays(open.isNew ? [...t.days, d] : t.days.map(x => x.id === d.id ? d : x)) }))
            selectDay(d.id)
            setOpen(null)
          }}
          onDelete={open.isNew ? undefined : () => {
            const rest = trip.days.filter(d => d.id !== open.day.id)
            update(t => ({ ...t, days: t.days.filter(d => d.id !== open.day.id) }))
            setDayId(rest[0]?.id ?? null)
            setOpen(null)
          }}
        />
      )}

      {open?.k === 'settings' && (
        <SettingsSheet
          trip={trip}
          sync={sync}
          onRename={name => update(t => ({ ...t, name }))}
          onTz={tz => update(t => ({ ...t, tz }))}
          onEditDay={id => { const d = trip.days.find(x => x.id === id); if (d) setOpen({ k: 'day', day: d, isNew: false }) }}
          onAddDay={() => setOpen({ k: 'day', day: newDay(), isNew: true })}
          onRefresh={refresh}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

/** No remembered day: today if it's in the trip, else the first day. */
function pickDefault(trip: Trip): Day | undefined {
  const today = nowIn(trip.tz).date
  return trip.days.find(d => d.date === today) ?? trip.days[0]
}
