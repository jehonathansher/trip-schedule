/*
 * Offline cache + push notifications.
 * The two constants below are rewritten on every build by
 * scripts/inject-sw-assets.mjs — keep them exactly as they are.
 */
const CACHE = 'schedule-07915578'
const ASSETS = ["./assets/index-Bn7j_sr6.css","./assets/index-CfDwkPKq.js"]

const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', ...ASSETS]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(url => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone()
          caches.open(CACHE).then(c => c.put('./index.html', copy))
          return res
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    )
    return
  }

  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone()
        caches.open(CACHE).then(c => c.put(req, copy))
      }
      return res
    }))
  )
})

// ── Push ──────────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }
  const title = data.title || 'לו״ז'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    tag: data.tag,
    icon: './icons/icon-192.png',
    lang: 'he',
    dir: 'rtl',
    data: { day: data.day || null },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const day = event.notification.data && event.notification.data.day
  const target = new URL(day ? `./?day=${encodeURIComponent(day)}` : './', self.registration.scope).href
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        if (day) w.postMessage({ type: 'open-day', day })
        return w.focus()
      }
    }
    return self.clients.openWindow(target)
  })())
})
