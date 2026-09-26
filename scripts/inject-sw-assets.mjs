// Writes the built file list into sw.js so the first visit caches everything
// needed offline. The hashed names double as the cache version.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const assets = readdirSync('dist/assets').map(f => `./assets/${f}`).sort()
const version = createHash('sha1').update(assets.join()).digest('hex').slice(0, 8)
const sw = readFileSync('dist/sw.js', 'utf8')
  .replace("const CACHE = 'schedule-dev'", `const CACHE = 'schedule-${version}'`)
  .replace('const ASSETS = []', `const ASSETS = ${JSON.stringify(assets)}`)
if (!sw.includes(`schedule-${version}`)) throw new Error('sw.js placeholders not found')
writeFileSync('dist/sw.js', sw)
console.log(`sw.js: schedule-${version}, ${assets.length} assets`)
