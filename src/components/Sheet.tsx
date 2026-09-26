import { useEffect, type ReactNode } from 'react'

let locks = 0
let savedY = 0
function lockBody() {
  if (locks++ > 0) return
  savedY = window.scrollY
  Object.assign(document.body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0' })
}
function unlockBody() {
  if (--locks > 0) return
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '' })
  window.scrollTo(0, savedY)
}

interface Props {
  title: string
  onClose: () => void
  /** Leading button (right side in RTL). Defaults to "ביטול". */
  closeLabel?: string
  action?: { label: string; onClick: () => void; disabled?: boolean }
  children: ReactNode
}

/** A bottom sheet. Closes only from its buttons or the dimmed backdrop. */
export default function Sheet({ title, onClose, closeLabel = 'ביטול', action, children }: Props) {
  useEffect(() => { lockBody(); return unlockBody }, [])
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-head">
          <div className="side"><button className="link" onClick={onClose}>{closeLabel}</button></div>
          <h3>{title}</h3>
          <div className="side">
            {action && (
              <button className="link strong" onClick={action.onClick} disabled={action.disabled}>{action.label}</button>
            )}
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button className="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <span className="knob" />
    </button>
  )
}
