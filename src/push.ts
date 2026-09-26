import { doc, setDoc } from 'firebase/firestore'
import { db } from './cloud'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC as string

export type PushState = 'unsupported' | 'install' | 'denied' | 'off' | 'on'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator)) return 'unsupported'
  if (!('PushManager' in window) || !('Notification' in window)) {
    return isIOS() && !standalone() ? 'install' : 'unsupported'
  }
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'on' : 'off'
}

function keyBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function subId(endpoint: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(h).slice(0, 12), b => b.toString(16).padStart(2, '0')).join('')
}

/** Must run from a tap: iOS only shows the permission prompt for a user gesture. */
export async function enablePush(): Promise<PushState> {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off'
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }))
  const json = sub.toJSON()
  await setDoc(doc(db, 'schedule-subs', await subId(json.endpoint!)), {
    sub: json,
    device: isIOS() ? 'iPhone' : navigator.platform,
    at: Date.now(),
  })
  return 'on'
}

/** Asks the sender to push a test message through the whole pipeline. */
export async function requestTest(): Promise<void> {
  await setDoc(doc(db, 'schedule', 'test'), { at: Date.now() })
}

/** Shows a notification straight from this device — proves permission only. */
export async function localTest(): Promise<void> {
  const reg = await navigator.serviceWorker.ready
  await reg.showNotification('בדיקה', { body: 'ההתראות מאושרות במכשיר הזה', icon: './icons/icon-192.png' })
}
