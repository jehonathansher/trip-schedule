import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import type { Trip } from './types'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
})
export const db = getFirestore(app)

/** Everything lives in one document; the notifier reads the same one. */
const MAIN = doc(db, 'schedule', 'main')

export interface Snapshot { trip: Trip; updatedAt: number }

export async function pull(): Promise<Snapshot | null> {
  const s = await getDoc(MAIN)
  if (!s.exists()) return null
  const d = s.data()
  return { trip: d.trip, updatedAt: d.updatedAt ?? 0 }
}

export async function push(trip: Trip, updatedAt: number): Promise<void> {
  // Firestore rejects `undefined` values; JSON drops them.
  await setDoc(MAIN, { trip: JSON.parse(JSON.stringify(trip)), updatedAt })
}

export function watch(cb: (s: Snapshot) => void) {
  return onSnapshot(MAIN, s => {
    if (s.metadata.hasPendingWrites || !s.exists()) return
    const d = s.data()
    cb({ trip: d.trip, updatedAt: d.updatedAt ?? 0 })
  })
}
