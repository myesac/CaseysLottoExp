// ----------------------------------------------------------------------------------
//  Name:    data.js
//  Author:  Mark Casey
//
//  Purpose: Pure helpers for draw history, number-set matching and statistics.
//
//  Exported API:
//   • GAMES                → string[] of game ids
//   • GAME_LABELS          → object, game id to label
//   • MIN_START_DATE       → ISO date string
//   • BALL_MIN / BALL_MAX  → number constants (re-exported from server/lottery.js)
//   • groupNameError()     → string | null (re-exported from server/lottery.js)
//   • setKey()             → string key identifying a set's numbers
//   • setEntriesFrom()     → [{ name, sets }]
//   • setGroupNamesFrom()  → string[] of group names
//   • buildMatches()       → match records
//   • matchRowsByGroup()   → per-group set rows with hits, for the Matches view
//   • filterHistory()      → draws for one game
//   • buildFrequency()     → { all, [game] } number counts
//   • numberRange()        → { min, max }
//   • rankNumbers()        → number[] of the hottest or coldest numbers
//   • computeMatchStats()  → { bySize, drawsWithMatch, hitRate }
//   • groupStats()         → per-group stat rows
//   • gameStats()          → per-game stat rows
//   • isIsoDate()          → boolean
//   • localTodayISO()      → today's local date as YYYY-MM-DD
//   • formatDate()         → DD/MM/YYYY
//   • formatDateTime()     → localised date and time
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { BALL_MAX, BALL_MIN, groupNameError, setKey } from '../server/lottery.js'

export { BALL_MAX, BALL_MIN, groupNameError, setKey }

// ── Constants ─────────────────────────────────────────────
export const GAMES = ['lotto', 'lotto-plus-1', 'lotto-plus-2']

export const GAME_LABELS = {
  lotto: 'Lotto',
  'lotto-plus-1': 'Lotto Plus 1',
  'lotto-plus-2': 'Lotto Plus 2',
}

export const MIN_START_DATE = '2026-07-01'

const newestFirst = (a, b) => (a.date < b.date ? 1 : -1)

// ── Number sets ───────────────────────────────────────────
export function setEntriesFrom(numberSets) {
  return Object.entries(numberSets || {}).map(([name, sets]) => ({ name, sets }))
}

export function setGroupNamesFrom(numberSets) {
  return Object.keys(numberSets || {})
}

// ── Matching ──────────────────────────────────────────────
function isMatch(set, numbers) {
  return set.every((n) => numbers.includes(n))
}

export function buildMatches(historyEntries, sets) {
  const matches = []
  for (const draw of historyEntries || []) {
    for (const [group, groupSets] of Object.entries(sets || {})) {
      ;(groupSets || []).forEach((set, index) => {
        if (isMatch(set, draw.numbers)) {
          matches.push({
            date: draw.date,
            game: draw.game,
            group,
            index: index + 1,
            set: [...set],
            size: set.length,
          })
        }
      })
    }
  }
  return matches
}

// `groups`: group names to include, empty for all. `size`: 3, 4 or 'all'.
export function matchRowsByGroup(numberSets, matches, { groups = [], size = 'all' } = {}) {
  const hitsBySet = new Map()
  for (const m of matches) {
    const key = `${m.group}::${m.index}`
    if (!hitsBySet.has(key)) hitsBySet.set(key, [])
    hitsBySet.get(key).push(m)
  }

  return setEntriesFrom(numberSets)
    .filter(({ name }) => groups.length === 0 || groups.includes(name))
    .map(({ name, sets }) => {
      const rows = sets
        .map((set, i) => {
          const hits = [...(hitsBySet.get(`${name}::${i + 1}`) || [])].sort(newestFirst)
          return { index: i + 1, set, size: set.length, count: hits.length, hits }
        })
        .filter((r) => size === 'all' || r.size === Number(size))
        .sort((a, b) => b.count - a.count || a.index - b.index)
      const total = rows.reduce((sum, r) => sum + r.count, 0)

      return { name, rows, total }
    })
    .filter(({ rows }) => rows.length > 0)
}

// ── Draw history ──────────────────────────────────────────
export function filterHistory(historyEntries, game) {
  if (!game || game === 'all') return historyEntries || []
  return (historyEntries || []).filter((d) => d.game === game)
}

function maxBallIn(draws) {
  let max = 0
  for (const d of draws || []) {
    for (const n of d.numbers || []) if (n > max) max = n
  }

  return max || BALL_MAX
}

export function buildFrequency(draws) {
  const list = draws || []
  const maxBall = maxBallIn(list)

  const counts = {}
  for (const game of ['all', ...GAMES]) {
    counts[game] = {}
    for (let n = BALL_MIN; n <= maxBall; n += 1) counts[game][n] = 0
  }
  for (const draw of list) {
    for (const n of draw.numbers || []) {
      counts.all[n] += 1
      if (counts[draw.game]) counts[draw.game][n] += 1
    }
  }
  return counts
}

export function numberRange(draws) {
  return { min: BALL_MIN, max: maxBallIn(draws) }
}

// counts: { [number]: appearances }. Ties are broken by the lower ball number.
export function rankNumbers(counts, limit, order = 'hot') {
  const sign = order === 'hot' ? -1 : 1

  return Object.keys(counts || {})
    .map(Number)
    .sort((a, b) => sign * (counts[a] - counts[b]) || a - b)
    .slice(0, limit)
}

// ── Statistics ────────────────────────────────────────────
export function computeMatchStats(matchesToUse, draws) {
  const bySize = { 3: 0, 4: 0 }
  const matchList = matchesToUse || []
  const drawList = draws || []

  for (const m of matchList) bySize[m.size] = (bySize[m.size] || 0) + 1
  const drawsWithMatch = new Set(matchList.map((m) => `${m.date}::${m.game}`)).size

  return {
    bySize,
    drawsWithMatch,
    hitRate: drawList.length ? drawsWithMatch / drawList.length : 0,
  }
}

export function groupStats(matches, numberSets) {
  return setEntriesFrom(numberSets).map(({ name, sets }) => {
    const groupMatches = matches.filter((m) => m.group === name)
    const distinct = new Set(groupMatches.map((m) => m.index)).size

    return {
      name,
      sets: sets.length,
      matches: groupMatches.length,
      distinct,
      pct: sets.length ? Math.round((distinct / sets.length) * 100) : 0,
    }
  })
}

export function gameStats(matches, draws) {
  return GAMES.map((game) => {
    const gameMatches = matches.filter((m) => m.game === game)
    const drawCount = draws.filter((d) => d.game === game).length
    const drawsWith = new Set(gameMatches.map((m) => m.date)).size

    return {
      game,
      draws: drawCount,
      matches: gameMatches.length,
      drawsWith,
      hitRate: drawCount ? ((drawsWith / drawCount) * 100).toFixed(1) : '0.0',
    }
  }).filter((r) => r.draws > 0)
}

// ── Dates and formatting ──────────────────────────────────
export function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(value))
}

export function localTodayISO() {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${m}-${d}`
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
