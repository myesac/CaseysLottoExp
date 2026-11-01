// ----------------------------------------------------------------------------------
//  Name:    vite.config.js
//  Author:  Mark Casey
//
//  Purpose: Vite build config plus dev/preview middleware that serves /api/*
//           from data/*.json on disk (mirrors worker/index.js).
//           Admin writes use ADMIN_PASSWORD from .dev.vars, like wrangler dev.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MAX_BODY_BYTES,
  checkAdminAuth,
  fetchOfficialEntries,
  mergeDraws,
  validateNumberSets,
} from './server/lottery.js'

// ── Constants ─────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HISTORY_PATH = path.join(__dirname, 'data', 'number_history.json')
const SETS_PATH = path.join(__dirname, 'data', 'numberSets.json')
const DEV_VARS_PATH = path.join(__dirname, '.dev.vars')

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// ── Helpers ───────────────────────────────────────────────
function sendJson(res, obj, status = 200) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.end(JSON.stringify(obj))
}

function sendError(res, error) {
  if (error instanceof HttpError) {
    sendJson(res, { error: error.message }, error.status)
    return
  }
  console.error('Local API failed:', error)
  sendJson(res, { error: 'Unexpected server error' }, 500)
}

// Read on each request so edits to .dev.vars apply without restarting Vite.
function adminPassword() {
  if (!fs.existsSync(DEV_VARS_PATH)) return undefined
  const line = fs
    .readFileSync(DEV_VARS_PATH, 'utf-8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('ADMIN_PASSWORD='))

  return line ? line.slice('ADMIN_PASSWORD='.length).trim() : undefined
}

async function requireAdmin(req) {
  const isAdmin = await checkAdminAuth(req.headers.authorization, adminPassword())
  if (isAdmin === null) {
    throw new HttpError(503, 'Admin writes are not configured. Add ADMIN_PASSWORD to .dev.vars.')
  }
  if (!isAdmin) throw new HttpError(401, 'Admin password is incorrect')
}

function readJsonBody(req) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    return Promise.reject(new HttpError(415, 'Content-Type must be application/json'))
  }
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Request body is too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'))
      } catch {
        reject(new HttpError(400, 'Request body must be valid JSON'))
      }
    })
    req.on('error', reject)
  })
}

function updatedAt() {
  return fs.statSync(HISTORY_PATH).mtime.toISOString()
}

// `file` is always one of the *_PATH constants above, never request data.
function readJsonFile(file) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed path constant
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

function writeJsonFile(file, value) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed path constant
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n')
}

function readData() {
  return { history: readJsonFile(HISTORY_PATH), numberSets: readJsonFile(SETS_PATH), updatedAt: updatedAt() }
}

async function refreshData() {
  let fetched
  try {
    fetched = await fetchOfficialEntries()
  } catch (error) {
    throw new HttpError(502, error.message)
  }
  const { history, added } = mergeDraws(readJsonFile(HISTORY_PATH), fetched)
  writeJsonFile(HISTORY_PATH, history)
  console.info(`Refresh added ${added} draw(s)`)

  return { history, numberSets: readJsonFile(SETS_PATH), added, updatedAt: updatedAt() }
}

async function saveSets(req) {
  const payload = await readJsonBody(req)
  try {
    validateNumberSets(payload?.numberSets)
  } catch (error) {
    throw new HttpError(400, error.message)
  }
  writeJsonFile(SETS_PATH, payload.numberSets)

  return { numberSets: payload.numberSets, saved: true, updatedAt: updatedAt() }
}

// ── API middleware ────────────────────────────────────────
async function handleApi(req, res, next) {
  const url = (req.url || '').split('?')[0]

  if (url === '/data' && req.method === 'GET') {
    sendJson(res, readData())
    return
  }
  if (url !== '/refresh' && url !== '/sets') {
    next()
    return
  }
  if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed')

  await requireAdmin(req)
  sendJson(res, url === '/refresh' ? await refreshData() : await saveSets(req))
}

function apiHandler(req, res, next) {
  handleApi(req, res, next).catch((error) => sendError(res, error))
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

// ── Config ────────────────────────────────────────────────
export default defineConfig({
  plugins: [react(), lotteryApiPlugin()],
  test: {
    environment: 'node',
  },
})
