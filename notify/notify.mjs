/*
 * Sends the schedule's reminders as Web Push notifications.
 *
 * Runs on GitHub Actions every ~15 minutes. Each run looks 30 minutes ahead:
 * if nothing is due it exits in seconds; otherwise it stays up and sends each
 * reminder on its minute. Runs overlap, so a late-starting run is covered by
 * the one before it. What was sent is recorded in Firestore, so nothing is
 * sent twice.
 */
import webpush from 'web-push'

const PROJECT = process.env.FIRESTORE_PROJECT || 'budget-abroad'
const DB = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const APP_URL = 'https://jehonathansher.github.io/trip-schedule/'
const LOOKAHEAD = 30 * 60e3
const GRACE = 20 * 60e3          // still send a reminder up to 20 min late
const started = Date.now()

webpush.setVapidDetails('mailto:noreply@jehonathansher.github.io', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)

// ── Firestore REST ────────────────────────────────────────────────────
function decode(v) {
  if (v == null) return null
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, decode(x)]))
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode)
  return null
}
const fields = doc => Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, decode(v)]))

async function getDoc(path) {
  const r = await fetch(`${DB}/${path}`)
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`)
  return fields(await r.json())
}
async function listSubs() {
  const r = await fetch(`${DB}/schedule-subs?pageSize=100`)
  if (!r.ok) throw new Error(`subs ${r.status}`)
  const j = await r.json()
  return (j.documents ?? []).map(d => ({ id: d.name.split('/').pop(), ...fields(d) }))
}
async function markSent(key, at) {
  const body = { fields: { sent: { mapValue: { fields: { [key]: { integerValue: String(at) } } } } } }
  const r = await fetch(`${DB}/schedule/sent?updateMask.fieldPaths=sent.${key}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`mark ${r.status}`)
}
const dropSub = id => fetch(`${DB}/schedule-subs/${id}`, { method: 'DELETE' })

// ── Time ──────────────────────────────────────────────────────────────
function offset(tz, utc) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utc)).map(x => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utc
}
function zoned(date, time, tz, plusDays = 0) {
  const [y, m, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d + plusDays, h, mi)
  let t = guess - offset(tz, guess)
  t = guess - offset(tz, t)
  return t
}

function reminders(trip) {
  const out = []
  for (const day of trip?.days ?? []) {
    const tz = day.tz || trip.tz || 'Europe/London'
    let last = -1, wrap = 0
    for (const it of day.items ?? []) {
      if (!it.time) continue
      const [h, m] = it.time.split(':').map(Number)
      const mins = h * 60 + m
      if (last >= 0 && mins < last - 6 * 60) wrap = 1   // e.g. 00:30 after an 22:00 show
      last = mins
      if (it.remind == null) continue
      const at = zoned(day.date, it.time, tz, wrap)
      const fire = at - it.remind * 60e3
      const lead = it.remind === 0 ? 'עכשיו' : it.remind >= 60 && it.remind % 60 === 0
        ? (it.remind === 60 ? 'בעוד שעה' : it.remind === 120 ? 'בעוד שעתיים' : `בעוד ${it.remind / 60} שעות`)
        : `בעוד ${it.remind} דק׳`
      const where = it.place?.name && it.place.name !== it.title ? ` · ${it.place.name}` : ''
      out.push({
        key: `r_${String(it.id).replace(/[^A-Za-z0-9]/g, '')}_${Math.round(fire / 60e3)}`,
        fire,
        payload: { title: it.title || it.place?.name || 'תזכורת', body: `${lead} · ${it.time}${where}`, tag: it.id, day: day.id },
      })
    }
  }
  return out
}

async function sendAll(subs, payload) {
  let ok = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification(s.sub, JSON.stringify(payload), { TTL: 3600, urgency: 'high' })
      ok++
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { await dropSub(s.id); console.log('dropped expired device', s.id) }
      else console.log('push failed', s.id, e.statusCode, e.body)
    }
  }
  return ok
}

async function tick() {
  const now = Date.now()
  const [main, sentDoc, test] = await Promise.all([getDoc('schedule/main'), getDoc('schedule/sent'), getDoc('schedule/test')])
  const sent = sentDoc?.sent ?? {}
  const list = reminders(main?.trip)
  const due = list.filter(r => r.fire <= now && r.fire > now - GRACE && !sent[r.key])
  const testKey = test?.at ? `t_${test.at}` : null
  const testDue = testKey && !sent[testKey] && now - test.at < 60 * 60e3

  if (due.length || testDue) {
    const subs = await listSubs()
    for (const r of due) {
      await markSent(r.key, now)          // mark first: never send twice
      console.log('sent', r.payload.title, 'to', await sendAll(subs, r.payload), 'devices')
    }
    if (testDue) {
      await markSent(testKey, now)
      console.log('test to', await sendAll(subs, { title: 'בדיקה', body: 'ההתראות מהשרת עובדות', tag: 'test' }), 'devices')
    }
  }
  // Anything still coming inside this run's window?
  const upcoming = list.filter(r => r.fire > now && r.fire <= started + LOOKAHEAD && !sent[r.key])
  return upcoming.length ? Math.min(...upcoming.map(r => r.fire)) : null
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
for (;;) {
  let next
  try { next = await tick() } catch (e) { console.log('tick failed:', e.message); next = Date.now() + 30e3 }
  if (next == null || Date.now() - started > LOOKAHEAD) break
  await sleep(Math.max(5e3, Math.min(next - Date.now() + 1e3, 60e3)))
}
console.log('done')
