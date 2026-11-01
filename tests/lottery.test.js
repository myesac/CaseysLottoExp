// ----------------------------------------------------------------------------------
//  Name:    lottery.test.js
//  Author:  Mark Casey
//
//  Purpose: Tests for server/lottery.js: scraping, validation, merging and auth.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { describe, expect, it } from 'vitest'
import {
  checkAdminAuth,
  groupNameError,
  mergeDraws,
  parseOfficialEntries,
  setKey,
  validateNumberSets,
} from '../server/lottery.js'

// ── Fixtures ──────────────────────────────────────────────
function pageWith(list) {
  const json = JSON.stringify({ props: { pageProps: { list } } })
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${json}</script></body></html>`
}

const game = (date, standard, bonus) => ({
  drawDates: [`${date}T20:00:00Z`],
  grids: [{ standard: [standard], additional: [[bonus]] }],
})

// ── parseOfficialEntries ──────────────────────────────────
describe('parseOfficialEntries', () => {
  it('reads Lotto and both Plus games', () => {
    const html = pageWith([
      {
        standard: game('2026-10-28', [6, 8, 11, 34, 40, 43], 26),
        addonGames: [
          { gameTitle: 'Lotto Plus 1', ...game('2026-10-28', [1, 2, 3, 4, 5, 6], 7) },
          { gameTitle: 'Lotto Plus 2', ...game('2026-10-28', [10, 20, 30, 40, 41, 42], 9) },
        ],
      },
    ])

    expect(parseOfficialEntries(html)).toEqual([
      { date: '2026-10-28', game: 'lotto', numbers: [6, 8, 11, 34, 40, 43], bonus: 26 },
      { date: '2026-10-28', game: 'lotto-plus-1', numbers: [1, 2, 3, 4, 5, 6], bonus: 7 },
      { date: '2026-10-28', game: 'lotto-plus-2', numbers: [10, 20, 30, 40, 41, 42], bonus: 9 },
    ])
  })

  it('drops draws with out-of-range, duplicate or non-integer numbers', () => {
    const html = pageWith([
      { standard: game('2026-10-28', [1, 2, 3, 4, 5, 99], 7) },
      { standard: game('2026-10-29', [1, 1, 3, 4, 5, 6], 7) },
      { standard: game('2026-10-30', ['1', 2, 3, 4, 5, 6], 7) },
    ])

    expect(parseOfficialEntries(html)).toEqual([])
  })

  it('throws when the page has no draw data', () => {
    expect(() => parseOfficialEntries('<html></html>')).toThrow(/Could not locate/)
  })
})

// ── validateNumberSets ────────────────────────────────────
describe('validateNumberSets', () => {
  it('accepts valid groups', () => {
    expect(() => validateNumberSets({ A: [[1, 2, 3], [4, 5, 6, 7]], B: [] })).not.toThrow()
  })

  it.each([
    ['a non-object payload', []],
    ['a set of the wrong size', { A: [[1, 2]] }],
    ['an out-of-range number', { A: [[1, 2, 48]] }],
    ['a repeated number', { A: [[1, 1, 2]] }],
    ['a set repeated across groups', { A: [[1, 2, 3]], B: [[3, 2, 1]] }],
    ['a blank group name', { ' ': [] }],
    ['a reserved group name', JSON.parse('{"__proto__": []}')],
  ])('rejects %s', (_label, payload) => {
    expect(() => validateNumberSets(payload)).toThrow()
  })

  it('caps the number of groups', () => {
    const many = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`G${i}`, []]))
    expect(() => validateNumberSets(many)).toThrow(/At most/)
  })
})

describe('groupNameError and setKey', () => {
  it('flags reserved and over-long names only', () => {
    expect(groupNameError('Generated Set 1')).toBeNull()
    expect(groupNameError('constructor')).toMatch(/cannot be used/)
    expect(groupNameError('x'.repeat(101))).toMatch(/1 to 100/)
  })

  it('ignores number order', () => {
    expect(setKey([9, 2, 10])).toBe(setKey([2, 9, 10]))
  })
})

// ── mergeDraws ────────────────────────────────────────────
describe('mergeDraws', () => {
  it('adds only new draws and orders Lotto first within a date', () => {
    const existing = [{ date: '2026-10-01', game: 'lotto-plus-1' }]
    const fetched = [
      { date: '2026-10-01', game: 'lotto-plus-2' },
      { date: '2026-10-01', game: 'lotto' },
      { date: '2026-10-01', game: 'lotto-plus-1' },
    ]
    const { history, added } = mergeDraws(existing, fetched)

    expect(added).toBe(2)
    expect(history.map((d) => d.game)).toEqual(['lotto', 'lotto-plus-1', 'lotto-plus-2'])
  })
})

// ── checkAdminAuth ────────────────────────────────────────
describe('checkAdminAuth', () => {
  it('returns null when no password is configured', async () => {
    expect(await checkAdminAuth('Bearer x', undefined)).toBeNull()
  })

  it('matches only the exact Bearer token', async () => {
    expect(await checkAdminAuth('Bearer s3cret', 's3cret')).toBe(true)
    expect(await checkAdminAuth('bearer s3cret', 's3cret')).toBe(true)
    expect(await checkAdminAuth('Bearer s3cre', 's3cret')).toBe(false)
    expect(await checkAdminAuth('s3cret', 's3cret')).toBe(false)
    expect(await checkAdminAuth(null, 's3cret')).toBe(false)
  })
})
