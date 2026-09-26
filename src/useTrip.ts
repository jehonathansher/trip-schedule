import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyTrip, type Trip } from './types'
import { pull, push, watch } from './cloud'

const K_TRIP = 'schedule-trip'
const K_UPDATED = 'schedule-updated'

export type SyncState = 'syncing' | 'synced' | 'error'

function loadLocal(): Trip {
  try {
    const raw = localStorage.getItem(K_TRIP)
    if (raw) return { ...emptyTrip(), ...JSON.parse(raw) }
  } catch { /* fall through */ }
  return emptyTrip()
}
const localUpdated = () => Number(localStorage.getItem(K_UPDATED)) || 0

function saveLocal(trip: Trip, at: number) {
  try {
    localStorage.setItem(K_TRIP, JSON.stringify(trip))
    localStorage.setItem(K_UPDATED, String(at))
  } catch { /* storage full or blocked — cloud still has it */ }
}

/**
 * The trip, kept in localStorage for offline use and mirrored to Firestore so
 * the phone and the computer see the same thing. Newest write wins.
 */
export function useTrip() {
  const [trip, setTrip] = useState<Trip>(loadLocal)
  const [sync, setSync] = useState<SyncState>('syncing')
  const tripRef = useRef(trip)
  tripRef.current = trip
  const timer = useRef<number | undefined>(undefined)

  const adopt = useCallback((remote: { trip: Trip; updatedAt: number }) => {
    if (remote.updatedAt <= localUpdated()) return
    const t = { ...emptyTrip(), ...remote.trip }
    saveLocal(t, remote.updatedAt)
    setTrip(t)
  }, [])

  const refresh = useCallback(async () => {
    setSync('syncing')
    try {
      const remote = await pull()
      if (!remote) {
        if (localUpdated()) await push(tripRef.current, localUpdated())
      } else if (remote.updatedAt > localUpdated()) {
        adopt(remote)
      } else if (localUpdated() > remote.updatedAt) {
        await push(tripRef.current, localUpdated())
      }
      setSync('synced')
    } catch {
      setSync('error')
    }
  }, [adopt])

  useEffect(() => {
    refresh()
    const unsub = watch(s => { adopt(s); setSync('synced') })
    let last = Date.now()
    const again = () => {
      if (document.visibilityState !== 'visible' || Date.now() - last < 4000) return
      last = Date.now()
      refresh()
    }
    document.addEventListener('visibilitychange', again)
    window.addEventListener('online', again)
    return () => {
      unsub()
      document.removeEventListener('visibilitychange', again)
      window.removeEventListener('online', again)
    }
  }, [refresh, adopt])

  const update = useCallback((fn: (t: Trip) => Trip) => {
    const next = fn(tripRef.current)
    const at = Date.now()
    tripRef.current = next
    saveLocal(next, at)
    setTrip(next)
    setSync('syncing')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      push(tripRef.current, localUpdated()).then(() => setSync('synced')).catch(() => setSync('error'))
    }, 400)
  }, [])

  return { trip, update, sync, refresh }
}
