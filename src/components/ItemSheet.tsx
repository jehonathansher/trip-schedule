import { useState } from 'react'
import { X } from 'lucide-react'
import type { Item, Kind } from '../types'
import { KINDS, MODES, REMINDERS } from '../labels'
import { newId } from '../time'
import Sheet, { Switch } from './Sheet'
import PlaceField from './PlaceField'

interface Props {
  item?: Item
  near?: { lat: number; lng: number }
  onSave: (item: Item) => void
  onDelete?: () => void
  onClose: () => void
}

const TITLE_HINT: Record<Kind, string> = {
  event: 'מה קורה? (פתיחת דלתות, הסתובבות…)',
  place: 'שם',
  travel: 'למשל: טיוב למלון',
  divider: 'כותרת',
}

export default function ItemSheet({ item, near, onSave, onDelete, onClose }: Props) {
  const [d, setD] = useState<Item>(() => item ?? { id: newId(), kind: 'event', title: '' })
  const [confirmDel, setConfirmDel] = useState(false)
  const set = (patch: Partial<Item>) => setD(prev => ({ ...prev, ...patch }))

  const timed = d.kind !== 'divider'
  const canSave = !!(d.title.trim() || d.place?.name)

  function save() {
    const out: Item = { ...d, title: d.title.trim() || d.place?.name || '' }
    if (out.kind === 'divider') {
      delete out.time; delete out.end; delete out.place; delete out.remind
    }
    if (out.kind !== 'travel') { delete out.from; delete out.mode }
    if (out.kind !== 'place') delete out.booked
    if (out.kind === 'event') delete out.place
    if (!out.time) { delete out.end; delete out.remind }
    if (!out.note?.trim()) delete out.note
    onSave(out)
  }

  return (
    <Sheet
      title={item ? 'עריכה' : 'הוספה ללו״ז'}
      onClose={onClose}
      action={{ label: 'שמור', onClick: save, disabled: !canSave }}
    >
      <div className="seg" role="group" aria-label="סוג">
        {KINDS.map(k => (
          <button key={k.id} aria-pressed={d.kind === k.id} onClick={() => set({ kind: k.id })}>
            <k.icon size={20} />
            {k.label}
          </button>
        ))}
      </div>

      {timed && (
        <div className="group">
          <div className="field">
            <label htmlFor="f-time">שעה</label>
            <input id="f-time" type="time" value={d.time ?? ''} onChange={e => set({ time: e.target.value || undefined })} />
            {d.time && <button className="clear" aria-label="נקה שעה" onClick={() => set({ time: undefined })}><X size={16} /></button>}
          </div>
          {d.time && (
            <div className="field">
              <label htmlFor="f-end">עד</label>
              <input id="f-end" type="time" value={d.end ?? ''} onChange={e => set({ end: e.target.value || undefined })} />
              {d.end && <button className="clear" aria-label="נקה שעת סיום" onClick={() => set({ end: undefined })}><X size={16} /></button>}
            </div>
          )}
        </div>
      )}

      <div className="group">
        <div className="field">
          <input
            id="f-title"
            value={d.title}
            onChange={e => set({ title: e.target.value })}
            placeholder={TITLE_HINT[d.kind]}
            dir="auto"
            style={d.kind === 'divider' ? { fontWeight: 600 } : undefined}
          />
        </div>
      </div>

      {d.kind === 'travel' && (
        <>
          <div className="group-label">איך</div>
          <div className="group">
            <div className="chips">
              {MODES.map(m => (
                <button key={m.id} className="chip" aria-pressed={d.mode === m.id} onClick={() => set({ mode: d.mode === m.id ? undefined : m.id })}>
                  <m.icon size={16} />{m.label}
                </button>
              ))}
            </div>
          </div>
          <div className="group">
            <div className="field">
              <label htmlFor="f-from">מ־</label>
              <input id="f-from" value={d.from ?? ''} onChange={e => set({ from: e.target.value || undefined })} placeholder="נקודת יציאה" dir="auto" />
            </div>
          </div>
        </>
      )}

      {(d.kind === 'place' || d.kind === 'travel') && (
        <>
          <div className="group-label">{d.kind === 'travel' ? 'לאן (לניווט)' : 'כתובת (לניווט)'}</div>
          <div className="group">
            <PlaceField
              value={d.place}
              near={near}
              placeholder="חיפוש מקום או כתובת"
              onChange={p => set({ place: p, title: d.title || (d.kind === 'place' && p ? p.name : d.title) })}
            />
          </div>
        </>
      )}

      {d.kind === 'place' && (
        <div className="group">
          <div className="field">
            <span className="lbl" style={{ flex: 1 }}>הוזמן</span>
            <Switch on={!!d.booked} onChange={v => set({ booked: v })} label="הוזמן" />
          </div>
        </div>
      )}

      <div className="group">
        <div className="field">
          <textarea
            id="f-note"
            value={d.note ?? ''}
            onChange={e => set({ note: e.target.value })}
            placeholder="הערה"
            dir="auto"
            rows={3}
          />
        </div>
      </div>

      {timed && d.time && (
        <>
          <div className="group-label">תזכורת</div>
          <div className="group">
            <div className="chips">
              {REMINDERS.map(r => (
                <button key={String(r.v)} className="chip" aria-pressed={d.remind === r.v} onClick={() => set({ remind: r.v })}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {onDelete && (confirmDel ? (
        <div className="confirm">
          <p>למחוק את ״{d.title || d.place?.name}״?</p>
          <div className="row2">
            <button className="btn quiet" style={{ background: 'var(--surface-2)' }} onClick={() => setConfirmDel(false)}>ביטול</button>
            <button className="btn primary" style={{ background: 'var(--danger)' }} onClick={onDelete}>מחק</button>
          </div>
        </div>
      ) : (
        <button className="btn danger block" onClick={() => setConfirmDel(true)}>מחיקה</button>
      ))}
    </Sheet>
  )
}
