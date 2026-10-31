import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mergeDraws, parseOfficialEntries, validateNumberSets } from './server/lottery.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HISTORY_PATH = path.join(__dirname, 'data', 'number_history.json')
const SETS_PATH = path.join(__dirname, 'data', 'numberSets.json')

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

function updatedAt() {
  return fs.statSync(HISTORY_PATH).mtime.toISOString()
}

function readData() {
  const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8'))
  const numberSets = JSON.parse(fs.readFileSync(SETS_PATH, 'utf-8'))
  return { history, numberSets, updatedAt: updatedAt() }
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

  const { history, added } = mergeDraws(
    JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf-8')),
    fetched,
  )

  fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + '\n')
  return {
    history,
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
