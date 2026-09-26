import { useState } from 'react'
import type { Day } from '../types'
import { TIME_ZONES } from '../time'
import Sheet from './Sheet'

interface Props {
  day: Day
  isNew: boolean
  tripTz: string
  taken: string[]
  onSave: (d: Day) => void
  onDelete?: () => void
  onClose: () => void
}

export default function DaySheet({ day, isNew, tripTz, taken, onSave, onDelete, onClose }: Props) {
  const [d, setD] = useState(day)
  const [confirmDel, setConfirmDel] = useState(false)
  const clash = taken.includes(d.date)
  const count = day.items.length + day.spots.length

  return (
    <Sheet
      title={isNew ? 'יום חדש' : 'עריכת יום'}
      onClose={onClose}
      action={{ label: 'שמור', disabled: !d.date || clash, onClick: () => {
        const out = { ...d, title: d.title?.trim() || undefined }
        if (!out.title) delete out.title
        if (!out.tz) delete out.tz
        onSave(out)
      } }}
    >
      <div className="group">
        <div className="field">
          <label htmlFor="d-date">תאריך</label>
          <input id="d-date" type="date" value={d.date} onChange={e => setD({ ...d, date: e.target.value })} />
        </div>
        <div className="field">
          <input value={d.title ?? ''} onChange={e => setD({ ...d, title: e.target.value })} placeholder="כותרת ליום (לא חובה)" dir="auto" />
        </div>
      </div>
      {clash && <p className="help" style={{ color: 'var(--danger)', marginTop: -8 }}>כבר יש יום בתאריך הזה.</p>}

      <div className="group">
        <div className="field">
          <label htmlFor="d-tz">אזור זמן</label>
          <select id="d-tz" value={d.tz ?? ''} onChange={e => setD({ ...d, tz: e.target.value || undefined })}>
            <option value="">כמו הטיול ({TIME_ZONES.find(z => z.id === tripTz)?.label ?? tripTz})</option>
            {TIME_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </div>
      </div>
      <p className="help">השעות ביום הזה נקראות לפי אזור הזמן הזה, וגם התזכורות נשלחות לפיו.</p>

      {onDelete && (confirmDel ? (
        <div className="confirm">
          <p>למחוק את היום{count ? ` ואת ${count} הפריטים שבו` : ''}?</p>
          <div className="row2">
            <button className="btn quiet" style={{ background: 'var(--surface-2)' }} onClick={() => setConfirmDel(false)}>ביטול</button>
            <button className="btn primary" style={{ background: 'var(--danger)' }} onClick={onDelete}>מחק</button>
          </div>
        </div>
      ) : (
        <button className="btn danger block" onClick={() => setConfirmDel(true)}>מחיקת היום</button>
      ))}
    </Sheet>
  )
}
