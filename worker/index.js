import historySeed from '../data/number_history.json'
import numberSetsSeed from '../data/numberSets.json'
import { mergeDraws, parseOfficialEntries, validateNumberSets } from '../server/lottery.js'

const HISTORY_KEY = 'number-history'
const NUMBER_SETS_KEY = 'number-sets'

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
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

function authorized(request, env) {
  const expected = env.ADMIN_PASSWORD
  if (!expected) return null

  const supplied = request.headers.get('authorization') || ''
  if (!/^Bearer\s+/i.test(supplied)) return false

  const encoder = new TextEncoder()
  const actual = encoder.encode(supplied.replace(/^Bearer\s+/i, ''))
  const expectedBytes = encoder.encode(expected)
  if (actual.byteLength !== expectedBytes.byteLength) return false
  return crypto.subtle.timingSafeEqual(actual, expectedBytes)
}

async function refreshData(env) {
  const response = await fetch('https://www.lottery.ie/results/lotto/history', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`lottery.ie responded ${response.status}`)

  const [historyRecord, numberSets] = await Promise.all([
    getOrSeed(env, HISTORY_KEY, historySeed),
    getOrSeed(env, NUMBER_SETS_KEY, numberSetsSeed),
  ])
  const fetched = parseOfficialEntries(await response.text())
  const { history, added } = mergeDraws(historyRecord.history, fetched)
  const updatedAt = new Date().toISOString()
  await env.LOTTO_DATA.put(HISTORY_KEY, JSON.stringify({ history, updatedAt }))

  return { history, numberSets, added, updatedAt }
}

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

  const auth = authorized(request, env)
  if (auth === null) {
    return jsonResponse({ error: 'Admin writes are not configured. Set the ADMIN_PASSWORD secret in Cloudflare.' }, 503)
  }
  if (!auth) return jsonResponse({ error: 'Admin password is incorrect' }, 401)

  if (pathname === '/api/refresh') {
    return jsonResponse(await refreshData(env))
  }

  let payload
  try {
    payload = await request.json()
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

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)
    if (!pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    try {
      return await handleApi(request, env)
    } catch (error) {
      console.error('Cloudflare API worker failed:', error)
      return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected server error' }, 500)
    }
  },
}
