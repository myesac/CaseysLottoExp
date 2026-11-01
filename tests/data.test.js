// ----------------------------------------------------------------------------------
//  Name:    data.test.js
//  Author:  Mark Casey
//
//  Purpose: Tests for src/data.js and the hash parsing in src/routing.js.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  buildFrequency,
  buildMatches,
  computeMatchStats,
  gameStats,
  groupStats,
  isIsoDate,
  matchRowsByGroup,
  numberRange,
  rankNumbers,
} from '../src/data.js'
import { buildHash, parseHash } from '../src/routing.js'

// ── Fixtures ──────────────────────────────────────────────
const draws = [
  { date: '2026-10-01', game: 'lotto', numbers: [1, 2, 3, 4, 5, 6] },
  { date: '2026-10-04', game: 'lotto', numbers: [1, 2, 3, 10, 11, 12] },
  { date: '2026-10-04', game: 'lotto-plus-1', numbers: [20, 21, 22, 23, 24, 25] },
]

const sets = {
  A: [[1, 2, 3], [4, 5, 6, 7]],
  B: [[20, 21, 22]],
}

// ── Matching ──────────────────────────────────────────────
describe('buildMatches', () => {
  it('finds sets fully contained in a draw', () => {
    const matches = buildMatches(draws, sets)

    expect(matches.map((m) => `${m.date}:${m.group}#${m.index}`)).toEqual([
      '2026-10-01:A#1',
      '2026-10-04:A#1',
      '2026-10-04:B#1',
    ])
  })
})

describe('matchRowsByGroup', () => {
  const matches = buildMatches(draws, sets)

  it('sorts rows by hits and hit dates newest first', () => {
    const [groupA] = matchRowsByGroup(sets, matches)

    expect(groupA.name).toBe('A')
    expect(groupA.total).toBe(2)
    expect(groupA.rows[0].hits.map((h) => h.date)).toEqual(['2026-10-04', '2026-10-01'])
  })

  it('applies group and size filters', () => {
    expect(matchRowsByGroup(sets, matches, { groups: ['B'] }).map((g) => g.name)).toEqual(['B'])
    expect(matchRowsByGroup(sets, matches, { groups: ['A', 'B'] }).map((g) => g.name)).toEqual([
      'A',
      'B',
    ])
    expect(matchRowsByGroup(sets, matches, { groups: [] })).toHaveLength(2)
    expect(matchRowsByGroup(sets, matches, { size: '4' })[0].rows).toHaveLength(1)
  })
})

// ── Frequency ─────────────────────────────────────────────
describe('frequency helpers', () => {
  it('counts appearances per game and overall', () => {
    const freq = buildFrequency(draws)

    expect(freq.all[1]).toBe(2)
    expect(freq['lotto-plus-1'][20]).toBe(1)
    expect(numberRange(draws)).toEqual({ min: 1, max: 25 })
  })

  it('ranks hot and cold numbers with ties broken by ball number', () => {
    const counts = { 1: 3, 2: 3, 3: 0, 4: 1 }

    expect(rankNumbers(counts, 2, 'hot')).toEqual([1, 2])
    expect(rankNumbers(counts, 2, 'cold')).toEqual([3, 4])
  })
})

// ── Statistics ────────────────────────────────────────────
describe('statistics', () => {
  const matches = buildMatches(draws, sets)

  it('computes hit rate across draws', () => {
    expect(computeMatchStats(matches, draws)).toEqual({
      bySize: { 3: 3, 4: 0 },
      drawsWithMatch: 3,
      hitRate: 1,
    })
  })

  it('summarises groups and games', () => {
    expect(groupStats(matches, sets)[0]).toMatchObject({ name: 'A', sets: 2, distinct: 1, pct: 50 })
    expect(gameStats(matches, draws).map((r) => [r.game, r.hitRate])).toEqual([
      ['lotto', '100.0'],
      ['lotto-plus-1', '100.0'],
    ])
  })
})

// ── Routing ───────────────────────────────────────────────
describe('hash routing', () => {
  it('round-trips a route', () => {
    const route = { view: 'matches', game: 'lotto', startDate: '2026-08-01' }
    expect(parseHash(buildHash(route))).toEqual(route)
  })

  it('falls back to defaults for unknown or invalid values', () => {
    expect(parseHash('#/nope?game=keno&from=garbage')).toEqual({
      view: 'stats',
      game: 'all',
      startDate: '2026-07-01',
    })
    expect(isIsoDate('2026-13-45')).toBe(false)
  })
})
