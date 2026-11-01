// ----------------------------------------------------------------------------------
//  Name:    index.js
//  Author:  Mark Casey
//
//  Purpose: Cloudflare Worker for /api/*, backed by the LOTTO_DATA KV namespace.
//           Mirrors the Vite middleware in vite.config.js.
//
//  Exported API:
//   • default  → Worker module { fetch(request, env) }
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import historySeed from '../data/number_history.json'
import numberSetsSeed from '../data/numberSets.json'
import {
  MAX_BODY_BYTES,
  checkAdminAuth,
  fetchOfficialEntries,
  mergeDraws,
  validateNumberSets,
} from '../server/lottery.js'

// ── Constants ─────────────────────────────────────────────
const HISTORY_KEY = 'number-history'
const NUMBER_SETS_KEY = 'number-sets'

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
}

// ── Helpers ───────────────────────────────────────────────
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS,
    },
  })
}

async function getOrSeed(env, key, seed) {
  const saved = await env.LOTTO_DATA.get(key, 'json')
  if (saved !== null) return saved

  const initial = key === HISTORY_KEY
    ? { history: seed, updatedAt: new Date().toISOString() }
    : seed
  await env.LOTTO_DATA.put(key, JSON.stringify(initial))

  return initial
}

async function getData(env) {
  const [historyRecord, numberSets] = await Promise.all([
    getOrSeed(env, HISTORY_KEY, historySeed),
    getOrSeed(env, NUMBER_SETS_KEY, numberSetsSeed),
  ])

  return {
    history: historyRecord.history,
    numberSets,
    updatedAt: historyRecord.updatedAt,
  }
}

// Limits admin requests per client IP; skipped if the binding is not configured.
async function isRateLimited(request, env) {
  if (!env.ADMIN_LIMITER) return false
  const ip = request.headers.get('cf-connecting-ip') || 'unknown'
  const { success } = await env.ADMIN_LIMITER.limit({ key: ip })

  return !success
}

async function refreshData(env) {
  let fetched
  try {
    fetched = await fetchOfficialEntries()
  } catch (error) {
    console.warn('lottery.ie fetch failed:', error)
    return jsonResponse({ error: error.message }, 502)
  }

  const historyRecord = await getOrSeed(env, HISTORY_KEY, historySeed)
  const { history, added } = mergeDraws(historyRecord.history, fetched)
  const updatedAt = new Date().toISOString()
  await env.LOTTO_DATA.put(HISTORY_KEY, JSON.stringify({ history, updatedAt }))
  const numberSets = await getOrSeed(env, NUMBER_SETS_KEY, numberSetsSeed)
  console.info(`Refresh added ${added} draw(s)`)

  return jsonResponse({ history, numberSets, added, updatedAt })
}

async function saveSets(request, env) {
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) {
    return jsonResponse({ error: 'Content-Type must be application/json' }, 415)
  }
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) return jsonResponse({ error: 'Request body is too large' }, 413)

  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON' }, 400)
  }
  try {
    validateNumberSets(payload?.numberSets)
  } catch (error) {
    return jsonResponse({ error: error.message }, 400)
  }
  await env.LOTTO_DATA.put(NUMBER_SETS_KEY, JSON.stringify(payload.numberSets))
  const historyRecord = await getOrSeed(env, HISTORY_KEY, historySeed)

  return jsonResponse({
    numberSets: payload.numberSets,
    saved: true,
    updatedAt: historyRecord.updatedAt,
  })
}

// ── API handler ───────────────────────────────────────────
async function handleApi(request, env) {
  const { pathname } = new URL(request.url)

  if (pathname === '/api/data' && request.method === 'GET') {
    return jsonResponse(await getData(env))
  }
  if (pathname !== '/api/refresh' && pathname !== '/api/sets') {
    return jsonResponse({ error: 'Not found' }, 404)
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }
  if (await isRateLimited(request, env)) {
    return jsonResponse({ error: 'Too many attempts, try again in a minute' }, 429)
  }

  const isAdmin = await checkAdminAuth(request.headers.get('authorization'), env.ADMIN_PASSWORD)
  if (isAdmin === null) {
    return jsonResponse({ error: 'Admin writes are not configured. Set the ADMIN_PASSWORD secret in Cloudflare.' }, 503)
  }
  if (!isAdmin) {
    console.warn('Rejected admin password', { path: pathname, ray: request.headers.get('cf-ray') })
    return jsonResponse({ error: 'Admin password is incorrect' }, 401)
  }

  return pathname === '/api/refresh' ? refreshData(env) : saveSets(request, env)
}

// ── Worker entry ──────────────────────────────────────────
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (!pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    try {
      return await handleApi(request, env)
    } catch (error) {
      console.error('Cloudflare API worker failed:', { ray: request.headers.get('cf-ray'), error })
      return jsonResponse({ error: 'Unexpected server error' }, 500)
    }
  },
}
