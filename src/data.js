export const GAMES = ['lotto', 'lotto-plus-1', 'lotto-plus-2']

export const GAME_LABELS = {
  lotto: 'Lotto',
  'lotto-plus-1': 'Lotto Plus 1',
  'lotto-plus-2': 'Lotto Plus 2',
}

export const MIN_START_DATE = '2026-07-01'

export function setEntriesFrom(numberSets) {
  return Object.keys(numberSets || {}).map((name) => ({
    name,
    sets: (numberSets || {})[name],
  }))
}

export function setGroupNamesFrom(numberSets) {
  return Object.keys(numberSets || {})
}

export function isMatch(set, numbers) {
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

export function filterHistory(historyEntries, game) {
  if (!game || game === 'all') return historyEntries || []
  return (historyEntries || []).filter((d) => d.game === game)
}

export function buildFrequency(draws) {
  const list = draws || []
  const allNumbers = list.flatMap((d) => d.numbers || [])
  const maxBall = allNumbers.length ? Math.max(...allNumbers) : 47

  const counts = {}
  for (const game of ['all', ...GAMES]) {
    counts[game] = {}
    for (let n = 1; n <= maxBall; n += 1) counts[game][n] = 0
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
  const allNumbers = (draws || []).flatMap((d) => d.numbers || [])
  const max = allNumbers.length ? Math.max(...allNumbers) : 47
  return { min: 1, max }
}

export function computeMatchStats(matchesToUse, draws) {
  const byGroup = {}
  const byGame = {}
  const bySize = { 3: 0, 4: 0 }
  const bySet = {}
  const matchList = matchesToUse || []
  const drawList = draws || []

  for (const m of matchList) {
    byGroup[m.group] = (byGroup[m.group] || 0) + 1
    byGame[m.game] = (byGame[m.game] || 0) + 1
    bySize[m.size] = (bySize[m.size] || 0) + 1

    const key = `${m.group}::${m.index}`
    if (!bySet[key]) {
      bySet[key] = {
        group: m.group,
        index: m.index,
        set: m.set,
        size: m.size,
        count: 0,
        hits: [],
      }
    }
    bySet[key].count += 1
    bySet[key].hits.push({ date: m.date, game: m.game })
  }

  const drawsWithMatch = new Set(matchList.map((m) => `${m.date}::${m.game}`)).size

  return {
    total: matchList.length,
    byGroup,
    byGame,
    bySize,
    bySet,
    drawsWithMatch,
    totalDraws: drawList.length,
    hitRate: drawList.length ? drawsWithMatch / drawList.length : 0,
  }
}

export function formatDate(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

