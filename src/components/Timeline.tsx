import { Fragment } from 'react'
import { Bell, ChevronDown, ChevronUp, Navigation } from 'lucide-react'
import type { Item } from '../types'
import { hasNav, navUrl } from '../places'
import { modeIcon } from '../labels'
import { toMin } from '../time'

interface Props {
  items: Item[]
  nowMin: number | null     // minutes since midnight when this day is today
  ordering: boolean
  onOpen: (item: Item) => void
  onMove: (index: number, dir: -1 | 1) => void
}

const fmtNow = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export default function Timeline({ items, nowMin, ordering, onOpen, onMove }: Props) {
  // The "now" line sits after the last timed item that has already started.
  let nowAfter = -2
  if (nowMin != null) {
    nowAfter = -1
    items.forEach((it, i) => { const t = toMin(it.time); if (t != null && t <= nowMin) nowAfter = i })
  }

  const nowLine = nowMin != null && (
    <div className="now" aria-label={`עכשיו ${fmtNow(nowMin)}`}>
      <span className="lbl">{fmtNow(nowMin)}</span><span className="dot" /><span className="ln" />
    </div>
  )

  return (
    <div className="tl">
      {nowAfter === -1 && nowLine}
      {items.map((it, i) => {
        const order = ordering && (
          <div className="order-ctl">
            <button aria-label="הזז למעלה" disabled={i === 0} onClick={() => onMove(i, -1)}><ChevronUp size={18} /></button>
            <button aria-label="הזז למטה" disabled={i === items.length - 1} onClick={() => onMove(i, 1)}><ChevronDown size={18} /></button>
          </div>
        )
        return (
          <Fragment key={it.id}>
            {it.kind === 'divider' ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button className="divider" onClick={() => onOpen(it)} disabled={ordering}>
                  <h2 dir="auto">{it.title}</h2>
                  {it.note && <div className="note" dir="auto">{it.note}</div>}
                </button>
                {order}
              </div>
            ) : (
              <Row it={it} order={order} ordering={ordering} onOpen={onOpen} />
            )}
            {nowAfter === i && nowLine}
          </Fragment>
        )
      })}
    </div>
  )
}

function Row({ it, order, ordering, onOpen }: { it: Item; order: React.ReactNode; ordering: boolean; onOpen: (i: Item) => void }) {
  const Icon = modeIcon(it.mode)
  const nav = !ordering && hasNav(it.place) && (
    <a className={`nav${it.kind === 'place' ? ' solid' : ''}`} href={navUrl(it.place!, it.kind === 'travel' ? it.mode : undefined)}
       target="_blank" rel="noopener" aria-label={`ניווט אל ${it.place!.name}`} onClick={e => e.stopPropagation()}>
      <Navigation size={18} />
    </a>
  )
  const open = () => { if (!ordering) onOpen(it) }

  return (
    <div className={`row ${it.kind}`}>
      <div className="when" onClick={open}>
        {it.time && <span className="t">{it.time}</span>}
        {it.remind != null && it.time && <Bell className="bell" size={12} aria-label="תזכורת" />}
        {it.end && <span className="e">{it.end}</span>}
      </div>
      <div className="rail" onClick={open}>
        {it.kind === 'travel'
          ? <span className="node travel"><Icon size={13} /></span>
          : <span className={`node ${it.kind}${it.booked ? ' booked' : ''}`} />}
      </div>
      <div className="body">
        {it.kind === 'event' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="grow" style={{ flex: 1, minWidth: 0, textAlign: 'start' }} onClick={open}>
              <div className="ev-title" dir="auto">{it.title}</div>
              {it.note && <div className="note" dir="auto">{it.note}</div>}
            </button>
            {order}
          </div>
        )}
        {it.kind === 'place' && (
          <div className="card">
            <button className="grow" style={{ textAlign: 'start' }} onClick={open}>
              <div className="ttl"><span dir="auto">{it.title}</span>{it.booked && <span className="pill">הוזמן</span>}</div>
              {it.place?.address && <div className="addr" dir="auto">{it.place.address}</div>}
              {it.note && <div className="note" dir="auto">{it.note}</div>}
            </button>
            {nav}{order}
          </div>
        )}
        {it.kind === 'travel' && (
          <div className="travel-box">
            <button className="grow" style={{ textAlign: 'start' }} onClick={open}>
              <div className="ttl" dir="auto">{it.title}</div>
              {(it.from || it.place) && (
                <div className="route" dir="rtl">
                  {it.from && <bdi>{it.from}</bdi>}
                  {it.from && it.place && ' ← '}
                  {it.place && <bdi>{it.place.name}</bdi>}
                </div>
              )}
              {it.note && <div className="note" dir="auto">{it.note}</div>}
            </button>
            {nav}{order}
          </div>
        )}
      </div>
    </div>
  )
}
