import { useEffect, useState } from 'react'
import { ChevronLeft, Plus } from 'lucide-react'
import type { Trip } from '../types'
import { TIME_ZONES, fmtLong } from '../time'
import { enablePush, localTest, pushState, requestTest, type PushState } from '../push'
import type { SyncState } from '../useTrip'
import Sheet from './Sheet'

interface Props {
  trip: Trip
  sync: SyncState
  onRename: (name: string) => void
  onTz: (tz: string) => void
  onEditDay: (id: string) => void
  onAddDay: () => void
  onRefresh: () => void
  onClose: () => void
}

const PUSH_TEXT: Record<PushState, string> = {
  unsupported: 'הדפדפן הזה לא תומך בהתראות.',
  install: 'באייפון, התראות עובדות רק מהאפליקציה שבמסך הבית: שיתוף ← ״הוספה למסך הבית״, ואז לפתוח משם.',
  denied: 'ההתראות חסומות. אפשר לאשר מחדש בהגדרות ← התראות ← לו״ז.',
  off: 'כבויות במכשיר הזה.',
  on: 'פעילות במכשיר הזה.',
}

export default function SettingsSheet({ trip, sync, onRename, onTz, onEditDay, onAddDay, onRefresh, onClose }: Props) {
  const [push, setPush] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { pushState().then(setPush) }, [])

  async function turnOn() {
    setBusy(true); setMsg('')
    try { setPush(await enablePush()) } catch { setMsg('ההפעלה נכשלה. נסה שוב.') }
    setBusy(false)
  }
  async function test() {
    setBusy(true)
    try {
      await localTest()
      await requestTest()
      setMsg('נשלחה בדיקה מקומית. בדיקה מהשרת תגיע תוך כרבע שעה, גם כשהאפליקציה סגורה.')
    } catch { setMsg('הבדיקה נכשלה.') }
    setBusy(false)
  }

  return (
    <Sheet title="הגדרות" closeLabel="סגור" onClose={onClose}>
      <div className="group-label">הטיול</div>
      <div className="group">
        <div className="field">
          <input value={trip.name} onChange={e => onRename(e.target.value)} placeholder="שם הטיול" dir="auto" />
        </div>
        <div className="field">
          <label htmlFor="s-tz">אזור זמן</label>
          <select id="s-tz" value={trip.tz} onChange={e => onTz(e.target.value)}>
            {TIME_ZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
          </select>
        </div>
      </div>

      <div className="group-label">ימים</div>
      <div className="group">
        {trip.days.map(d => (
          <button className="tap-row" key={d.id} onClick={() => onEditDay(d.id)}>
            <div className="grow">
              <div>{fmtLong(d.date)}</div>
              {d.title && <div className="sub">{d.title}</div>}
            </div>
            <ChevronLeft size={18} color="var(--ink-3)" />
          </button>
        ))}
        <button className="tap-row" onClick={onAddDay} style={{ color: 'var(--accent)' }}>
          <Plus size={18} /> <span className="grow">הוספת יום</span>
        </button>
      </div>

      <div className="group-label">התראות</div>
      <div className="group">
        <div className="tap-row" style={{ minHeight: 0, paddingBlock: 12 }}>
          <div className="grow sub" style={{ fontSize: 14 }}>{push ? PUSH_TEXT[push] : '…'}</div>
        </div>
        {(push === 'off') && (
          <button className="tap-row" onClick={turnOn} disabled={busy} style={{ color: 'var(--accent)', fontWeight: 500 }}>הפעל התראות</button>
        )}
        {push === 'on' && (
          <button className="tap-row" onClick={test} disabled={busy} style={{ color: 'var(--accent)', fontWeight: 500 }}>שלח התראת בדיקה</button>
        )}
      </div>
      {msg && <p className="help">{msg}</p>}
      <p className="help">כל פריט עם שעה יכול לקבל תזכורת. בוחרים אותה בעריכת הפריט.</p>

      <div className="group-label">סנכרון</div>
      <div className="group">
        <button className="tap-row" onClick={onRefresh}>
          <span className="sync-dot" data-s={sync} />
          <span className="grow">{sync === 'synced' ? 'מסונכרן בין המכשירים' : sync === 'syncing' ? 'מסנכרן…' : 'אין חיבור. השינויים נשמרים במכשיר ויעלו כשיחזור חיבור.'}</span>
          <span style={{ color: 'var(--accent)', fontSize: 14 }}>רענן</span>
        </button>
      </div>
    </Sheet>
  )
}
