import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HISTORY_PATH = path.join(__dirname, 'data', 'number_history.json')
const SETS_PATH = path.join(__dirname, 'data', 'numberSets.json')

const GAME_ORDER = { lotto: 0, 'lotto-plus-1': 1, 'lotto-plus-2': 2 }

function sendJson(res, obj) {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(obj))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function validateNumberSets(sets) {
  if (!sets || typeof sets !== 'object' || Array.isArray(sets)) {
    throw new Error('Invalid payload: expected { numberSets: { groupName: [[n, n, n], ...] } }')
  }
  for (const [name, list] of Object.entries(sets)) {
    if (!name || !Array.isArray(list)) {
      throw new Error(`Group "${name || '(unnamed)'}" must be an array of sets`)
    }
    for (const set of list) {
      if (!Array.isArray(set) || (set.length !== 3 && set.length !== 4)) {
        throw new Error(`A set in "${name}" must contain 3 or 4 numbers`)
      }
      for (const n of set) {
        if (!Number.isInteger(n) || n < 1 || n > 47) {
          throw new Error(`Numbers must be integers from 1 to 47 (got ${n} in "${name}")`)
        }
      }
      if (new Set(set).size !== set.length) {
        throw new Error(`A set in "${name}" contains duplicate numbers`)
      }
    }
  }
}

function updatedAt() {
  return fs.statSync(HISTORY_PATH).mtime.toISOString()
}

function readData() {
  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))
  const numberSets = JSON.parse(fs.readFileSync(SETS_PATH, 'utf-8'))
  return { history, numberSets, updatedAt: updatedAt() }
}

function parseOfficialEntries(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) throw new Error('Could not locate draw data in lottery.ie response')
  const data = JSON.parse(m[1])
  const list = (data && data.props && data.props.pageProps && data.props.pageProps.list) || []
  const entries = []

  const add = (game, key) => {
    const dates = (game && game.drawDates) || []
    const grids = (game && game.grids) || []
    if (!dates.length || !grids.length) return
    const g = grids[0] || {}
    const numbers = (g.standard || [[]])[0]
    const additional = (g.additional || [[]])[0]
    if (!Array.isArray(numbers) || numbers.length !== 6) return
    entries.push({
      date: String(dates[0]).slice(0, 10),
      game: key,
      numbers,
      bonus: additional && additional[0] != null ? additional[0] : null,
    })
  }

  for (const item of list) {
    add(item && item.standard, 'lotto')
    for (const ag of (item && item.addonGames) || []) {
      const title = String((ag && ag.gameTitle) || '').toLowerCase()
      if (title.includes('plus 1')) add(ag, 'lotto-plus-1')
      else if (title.includes('plus 2')) add(ag, 'lotto-plus-2')
    }
  }
  return entries
}

async function refreshData() {
  const res = await fetch('https://www.lottery.ie/results/lotto/history', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  })
  if (!res.ok) throw new Error(`lottery.ie responded ${res.status}`)
  const html = await res.text()
  const fetched = parseOfficialEntries(html)

  const existing = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))
  const seen = new Set(existing.map((e) => `${e.date}|${e.game}`))
  let added = 0
  for (const e of fetched) {
    const key = `${e.date}|${e.game}`
    if (!seen.has(key)) {
      existing.push(e)
      seen.add(key)
      added += 1
    }
  }

  existing.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return (GAME_ORDER[a.game] || 9) - (GAME_ORDER[b.game] || 9)
  })

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(existing, null, 2) + '\n')
  return {
    history: existing,
    numberSets: JSON.parse(fs.readFileSync(SETS_PATH, 'utf-8')),
    added,
    updatedAt: updatedAt(),
  }
}

function apiHandler(req, res, next) {
  const url = (req.url || '').split('?')[0]

  if (req.method === 'GET' && url === '/data') {
    try {
      sendJson(res, readData())
    } catch (e) {
      res.statusCode = 500
      sendJson(res, { error: String((e && e.message) || e) })
    }
    return
  }

  if (req.method === 'POST' && url === '/refresh') {
    refreshData()
      .then((d) => sendJson(res, d))
      .catch((e) => {
        res.statusCode = 502
        sendJson(res, { error: String((e && e.message) || e) })
      })
    return
  }

  if (req.method === 'POST' && url === '/sets') {
    readBody(req)
      .then((body) => {
        const parsed = JSON.parse(body || '{}')
        validateNumberSets(parsed.numberSets)
        fs.writeFileSync(SETS_PATH, JSON.stringify(parsed.numberSets, null, 2) + '\n')
        sendJson(res, { numberSets: parsed.numberSets, saved: true, updatedAt: updatedAt() })
      })
      .catch((e) => {
        res.statusCode = 400
        sendJson(res, { error: String((e && e.message) || e) })
      })
    return
  }

  next()
}

function lotteryApiPlugin() {
  return {
    name: 'lottery-api',
    configureServer(server) {
      server.middlewares.use('/api', apiHandler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api', apiHandler)
    },
  }
}

export default defineConfig({
  plugins: [react(), lotteryApiPlugin()],
})
