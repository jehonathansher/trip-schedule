import { useState } from 'react'
import { Navigation, Plus } from 'lucide-react'
import type { Spot } from '../types'
import { hasNav, navUrl } from '../places'
import { newId } from '../time'
import Sheet from './Sheet'
import PlaceField from './PlaceField'

interface Props {
  spots: Spot[]
  near?: { lat: number; lng: number }
  onChange: (spots: Spot[]) => void
  onToTimeline: (s: Spot) => void
  onClose: () => void
}

/** Places saved for the day that don't have a slot on the timeline. */
export default function SpotsSheet({ spots, near, onChange, onToTimeline, onClose }: Props) {
  const [edit, setEdit] = useState<Spot | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  if (edit) {
    const set = (p: Partial<Spot>) => setEdit({ ...edit, ...p })
    const close = () => { setEdit(null); setConfirmDel(false) }
    const save = () => {
      const s: Spot = { ...edit, name: edit.name.trim() || edit.place?.name || '' }
      if (!s.note?.trim()) delete s.note
      onChange(isNew ? [...spots, s] : spots.map(x => x.id === s.id ? s : x))
      close()
    }
    return (
      <Sheet
        title={isNew ? 'מקום חדש' : 'עריכת מקום'}
        closeLabel="חזרה"
        onClose={close}
        action={{ label: 'שמור', onClick: save, disabled: !(edit.name.trim() || edit.place) }}
      >
        <div className="group">
          <div className="field">
            <input value={edit.name} onChange={e => set({ name: e.target.value })} placeholder="שם" dir="auto" />
          </div>
        </div>
        <div className="group-label">כתובת (לניווט)</div>
        <div className="group">
          <PlaceField
            value={edit.place}
            near={near}
            placeholder="חיפוש מקום או כתובת"
            onChange={p => set({ place: p, name: edit.name || p?.name || '' })}
          />
        </div>
        <div className="group">
          <div className="field">
            <textarea value={edit.note ?? ''} onChange={e => set({ note: e.target.value })} placeholder="הערה" dir="auto" rows={3} />
          </div>
        </div>
        {!isNew && (
          <>
            <button className="btn quiet block" style={{ marginBottom: 10 }} onClick={() => { onToTimeline(edit); close() }}>
              <Plus size={18} /> הוסף ללו״ז
            </button>
            {confirmDel ? (
              <div className="confirm">
                <p>למחוק את ״{edit.name}״?</p>
                <div className="row2">
                  <button className="btn quiet" style={{ background: 'var(--surface-2)' }} onClick={() => setConfirmDel(false)}>ביטול</button>
                  <button className="btn primary" style={{ background: 'var(--danger)' }} onClick={() => { onChange(spots.filter(x => x.id !== edit.id)); close() }}>מחק</button>
                </div>
              </div>
            ) : (
              <button className="btn danger block" onClick={() => setConfirmDel(true)}>מחיקה</button>
            )}
          </>
        )}
      </Sheet>
    )
  }

  return (
    <Sheet title="מקומות ליום" closeLabel="סגור" onClose={onClose}
      action={{ label: 'הוסף', onClick: () => { setIsNew(true); setEdit({ id: newId(), name: '' }) } }}>
      {spots.length === 0 ? (
        <div className="empty" style={{ paddingTop: 24 }}>
          <p>מקומות שאולי תרצה להגיע אליהם היום, בלי שעה קבועה.</p>
          <button className="btn primary" onClick={() => { setIsNew(true); setEdit({ id: newId(), name: '' }) }}>
            <Plus size={18} /> הוסף מקום
          </button>
        </div>
      ) : (
        <div className="group">
          {spots.map(s => (
            <div className="spot" key={s.id}>
              <button className="grow" onClick={() => { setIsNew(false); setEdit(s) }}>
                <div className="m">{s.name}</div>
                {s.place?.address && <div className="addr">{s.place.address}</div>}
                {s.note && <div className="note">{s.note}</div>}
              </button>
              {hasNav(s.place) && (
                <a className="nav" href={navUrl(s.place!)} target="_blank" rel="noopener" aria-label={`ניווט אל ${s.name}`}>
                  <Navigation size={18} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}
