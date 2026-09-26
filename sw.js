/*
 * Offline cache + push notifications.
 * The two constants below are rewritten on every build by
 * scripts/inject-sw-assets.mjs — keep them exactly as they are.
 */
const CACHE = 'schedule-c6cc4fc5'
const ASSETS = ["./assets/frank-ruhl-libre-hebrew-500-normal-DXveaSS_.woff","./assets/frank-ruhl-libre-hebrew-500-normal-UhV5Nrdm.woff2","./assets/frank-ruhl-libre-hebrew-700-normal-B5o0XYJ1.woff","./assets/frank-ruhl-libre-hebrew-700-normal-ZxcPrX5v.woff2","./assets/frank-ruhl-libre-latin-500-normal-BAzcRRUT.woff2","./assets/frank-ruhl-libre-latin-500-normal-Czdveetw.woff","./assets/frank-ruhl-libre-latin-700-normal-BtbVhCvj.woff2","./assets/frank-ruhl-libre-latin-700-normal-Mv4_ahRh.woff","./assets/frank-ruhl-libre-latin-ext-500-normal-CrEvhThu.woff","./assets/frank-ruhl-libre-latin-ext-500-normal-gwbrZlZG.woff2","./assets/frank-ruhl-libre-latin-ext-700-normal-C48ktjdO.woff","./assets/frank-ruhl-libre-latin-ext-700-normal-VfVLWWBc.woff2","./assets/index-CtJy3FLh.css","./assets/index-DrP5iXd5.js","./assets/rubik-arabic-400-normal-B6c_9tGI.woff2","./assets/rubik-arabic-400-normal-Dci85dQr.woff","./assets/rubik-arabic-500-normal-DNk3Rzpj.woff","./assets/rubik-arabic-500-normal-soGt7v5W.woff2","./assets/rubik-arabic-600-normal-DM3TNo7p.woff","./assets/rubik-arabic-600-normal-q6c7POk1.woff2","./assets/rubik-cyrillic-400-normal-C5G8_8ug.woff2","./assets/rubik-cyrillic-400-normal-D5R8xuhl.woff","./assets/rubik-cyrillic-500-normal-BH_pkKR0.woff","./assets/rubik-cyrillic-500-normal-Didq2w9O.woff2","./assets/rubik-cyrillic-600-normal-AdySaCq0.woff2","./assets/rubik-cyrillic-600-normal-CtS_KWzi.woff","./assets/rubik-cyrillic-ext-400-normal-CTkTGo13.woff","./assets/rubik-cyrillic-ext-400-normal-D-KNTwvG.woff2","./assets/rubik-cyrillic-ext-500-normal-CnfIzV8i.woff","./assets/rubik-cyrillic-ext-500-normal-DVRnamQw.woff2","./assets/rubik-cyrillic-ext-600-normal-BH0SVxfR.woff","./assets/rubik-cyrillic-ext-600-normal-vwfZBdfm.woff2","./assets/rubik-hebrew-400-normal-BQDoxs6C.woff","./assets/rubik-hebrew-400-normal-Dp0lvSRB.woff2","./assets/rubik-hebrew-500-normal--anb7y8_.woff","./assets/rubik-hebrew-500-normal-B_5jqoVI.woff2","./assets/rubik-hebrew-600-normal-BGAyptFf.woff","./assets/rubik-hebrew-600-normal-CpCbvE17.woff2","./assets/rubik-latin-400-normal-BV1Ho3GG.woff","./assets/rubik-latin-400-normal-j0pmKyiQ.woff2","./assets/rubik-latin-500-normal-1os41rQk.woff2","./assets/rubik-latin-500-normal-LZYVHeqz.woff","./assets/rubik-latin-600-normal-7iWW07_k.woff2","./assets/rubik-latin-600-normal-Bd1rsTk4.woff","./assets/rubik-latin-ext-400-normal-BtzQ7olK.woff2","./assets/rubik-latin-ext-400-normal-E7wwwcV8.woff","./assets/rubik-latin-ext-500-normal-BUryUc8T.woff","./assets/rubik-latin-ext-500-normal-CKoAoPpD.woff2","./assets/rubik-latin-ext-600-normal-DCdMT6U0.woff","./assets/rubik-latin-ext-600-normal-DPvxRCiz.woff2"]

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
