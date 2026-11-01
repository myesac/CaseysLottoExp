// ----------------------------------------------------------------------------------
//  Name:    lottery.js
//  Author:  Mark Casey
//
//  Purpose: Shared parsing, validation and auth for both API implementations
//           (vite.config.js and worker/index.js).
//           Web APIs only, so it runs in both Node and Workers.
//
//  Exported API:
//   • BALL_MIN / BALL_MAX         → number constants (1 / 47)
//   • MAX_BODY_BYTES              → number constant, admin request body cap
//   • groupNameError()            → string | null, why a group name is invalid
//   • validateNumberSets()        → void, throws on invalid sets
//   • setKey()                    → string key identifying a set's numbers
//   • parseOfficialEntries()      → draw entries parsed from lottery.ie HTML
//   • fetchOfficialEntries()      → Promise of draw entries from lottery.ie
//   • mergeDraws()                → { history, added }
//   • checkAdminAuth()            → Promise<null | boolean>
// ----------------------------------------------------------------------------------

// ── Constants ─────────────────────────────────────────────
export const BALL_MIN = 1
export const BALL_MAX = 47
export const MAX_BODY_BYTES = 100_000

const MAX_GROUPS = 200
const MAX_SETS_PER_GROUP = 200
const MAX_GROUP_NAME_LENGTH = 100
const NUMBERS_PER_DRAW = 6

const HISTORY_URL = 'https://www.lottery.ie/results/lotto/history'
const FETCH_TIMEOUT_MS = 20_000
const GAME_ORDER = { lotto: 0, 'lotto-plus-1': 1, 'lotto-plus-2': 2 }
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// Group names become object keys; these would reach Object.prototype instead.
const RESERVED_NAMES = new Set(['__proto__', 'constructor', 'prototype'])

const isBall = (n) => Number.isInteger(n) && n >= BALL_MIN && n <= BALL_MAX

// ── Validation ────────────────────────────────────────────
export function groupNameError(name) {
  if (!name.trim() || name.length > MAX_GROUP_NAME_LENGTH) {
    return `Group names must be 1 to ${MAX_GROUP_NAME_LENGTH} characters`
  }
  if (RESERVED_NAMES.has(name)) return `"${name}" cannot be used as a group name`

  return null
}

export function setKey(set) {
  return [...set].sort((a, b) => a - b).join('-')
}

export function validateNumberSets(sets) {
  if (!sets || typeof sets !== 'object' || Array.isArray(sets)) {
    throw new Error('Invalid payload: expected { numberSets: { groupName: [[n, n, n], ...] } }')
  }
  const entries = Object.entries(sets)
  if (entries.length > MAX_GROUPS) throw new Error(`At most ${MAX_GROUPS} groups are allowed`)

  const seen = new Map()
  for (const [name, list] of entries) {
    const nameError = groupNameError(name)
    if (nameError) throw new Error(nameError)
    if (!Array.isArray(list)) throw new Error(`Group "${name}" must be an array of sets`)
    if (list.length > MAX_SETS_PER_GROUP) {
      throw new Error(`Group "${name}" has more than ${MAX_SETS_PER_GROUP} sets`)
    }
    for (const set of list) {
      if (!Array.isArray(set) || (set.length !== 3 && set.length !== 4)) {
        throw new Error(`A set in "${name}" must contain 3 or 4 numbers`)
      }
      for (const n of set) {
        if (!isBall(n)) {
          throw new Error(`Numbers must be integers from ${BALL_MIN} to ${BALL_MAX} (got ${n} in "${name}")`)
        }
      }
      if (new Set(set).size !== set.length) {
        throw new Error(`A set in "${name}" contains duplicate numbers`)
      }
      const key = setKey(set)
      if (seen.has(key)) {
        throw new Error(`Set ${set.join(', ')} appears in both "${seen.get(key)}" and "${name}"`)
      }
      seen.set(key, name)
    }
  }
}

function isValidDraw(entry) {
  const { date, numbers, bonus } = entry

  return (
    ISO_DATE.test(date) &&
    Array.isArray(numbers) &&
    numbers.length === NUMBERS_PER_DRAW &&
    numbers.every(isBall) &&
    new Set(numbers).size === NUMBERS_PER_DRAW &&
    (bonus === null || isBall(bonus))
  )
}

// ── Scraping ──────────────────────────────────────────────
export function parseOfficialEntries(html) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) throw new Error('Could not locate draw data in lottery.ie response')
  const data = JSON.parse(m[1])
  const list = data?.props?.pageProps?.list || []
  const entries = []

  const add = (game, key) => {
    const dates = game?.drawDates || []
    const grids = game?.grids || []
    if (!dates.length || !grids.length) return
    const g = grids[0] || {}
    const additional = (g.additional || [[]])[0]
    const entry = {
      date: String(dates[0]).slice(0, 10),
      game: key,
      numbers: (g.standard || [[]])[0],
      bonus: additional?.[0] ?? null,
    }
    if (isValidDraw(entry)) entries.push(entry)
  }

  for (const item of list) {
    add(item?.standard, 'lotto')
    for (const ag of item?.addonGames || []) {
      const title = String(ag?.gameTitle || '').toLowerCase()
      if (title.includes('plus 1')) add(ag, 'lotto-plus-1')
      else if (title.includes('plus 2')) add(ag, 'lotto-plus-2')
    }
  }
  return entries
}

export async function fetchOfficialEntries() {
  const res = await fetch(HISTORY_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`lottery.ie responded ${res.status}`)

  return parseOfficialEntries(await res.text())
}

// ── Merging ───────────────────────────────────────────────
export function mergeDraws(existing, fetched) {
  const seen = new Set(existing.map((entry) => `${entry.date}|${entry.game}`))
  const merged = [...existing]
  let added = 0
  for (const entry of fetched) {
    const key = `${entry.date}|${entry.game}`
    if (!seen.has(key)) {
      merged.push(entry)
      seen.add(key)
      added += 1
    }
  }

  merged.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return (GAME_ORDER[a.game] ?? 9) - (GAME_ORDER[b.game] ?? 9)
  })

  return { history: merged, added }
}

// ── Auth ──────────────────────────────────────────────────
async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
}

// null = no password configured, otherwise whether the Bearer token matches.
// Digests are fixed-length, so the comparison leaks neither content nor length.
export async function checkAdminAuth(authorizationHeader, expected) {
  if (!expected) return null
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader || '')
  if (!match) return false

  const [actual, wanted] = await Promise.all([sha256(match[1]), sha256(expected)])
  let diff = 0
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ wanted[i]

  return diff === 0
}
