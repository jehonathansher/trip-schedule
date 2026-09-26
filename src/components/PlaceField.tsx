import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import type { Place } from '../types'
import { lookup, newSession, suggest, type Suggestion } from '../places'

interface Props {
  value?: Place
  onChange: (p?: Place) => void
  placeholder: string
  near?: { lat: number; lng: number }
}

/** Search Google for a place, or keep whatever was typed as a plain address. */
export default function PlaceField({ value, onChange, placeholder, near }: Props) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<Suggestion[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const session = useRef(newSession())
  const seq = useRef(0)

  useEffect(() => {
    const text = q.trim()
    if (text.length < 2) { setList([]); setState('idle'); return }
    const n = ++seq.current
    setState('loading')
    const t = window.setTimeout(() => {
      suggest(text, session.current, near)
        .then(r => { if (n === seq.current) { setList(r); setState('idle') } })
        .catch(() => { if (n === seq.current) { setList([]); setState('error') } })
    }, 320)
    return () => window.clearTimeout(t)
  }, [q, near])

  async function pick(s: Suggestion) {
    setState('loading')
    try {
      onChange(await lookup(s, session.current))
    } catch {
      onChange({ name: s.main, address: s.secondary || undefined })
    }
    session.current = newSession()
    setQ(''); setList([]); setState('idle')
  }

  if (value) {
    return (
      <div className="chosen">
        <MapPin size={18} color="var(--accent)" />
        <div className="grow">
          <div className="m" dir="auto">{value.name}</div>
          {value.address && <div className="s" dir="auto">{value.address}</div>}
        </div>
        <button className="clear" aria-label="הסר מיקום" onClick={() => onChange(undefined)}><X size={18} /></button>
      </div>
    )
  }

  const text = q.trim()
  return (
    <div>
      <div className="field">
        <Search size={18} color="var(--ink-3)" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder={placeholder}
          dir="auto"
          autoComplete="off"
          enterKeyHint="search"
        />
        {q && <button className="clear" aria-label="נקה" onClick={() => setQ('')}><X size={16} /></button>}
      </div>
      {text.length >= 2 && (
        <div className="sugg">
          {list.map(s => (
            <button key={s.id} onClick={() => pick(s)}>
              <div className="m" dir="auto">{s.main}</div>
              {s.secondary && <div className="s" dir="auto">{s.secondary}</div>}
            </button>
          ))}
          {state === 'loading' && list.length === 0 && <div className="hint">מחפש…</div>}
          {state === 'error' && <div className="hint">החיפוש לא זמין כרגע. אפשר לשמור את הטקסט ככתובת.</div>}
          <button onClick={() => { onChange({ name: text }); setQ('') }}>
            <div className="s">שמור את ״{text}״ ככתובת, בלי חיפוש</div>
          </button>
        </div>
      )}
    </div>
  )
}
