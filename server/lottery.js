export const GAME_ORDER = { lotto: 0, 'lotto-plus-1': 1, 'lotto-plus-2': 2 }

export function validateNumberSets(sets) {
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

export function parseOfficialEntries(html) {
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
    return (GAME_ORDER[a.game] || 9) - (GAME_ORDER[b.game] || 9)
  })

  return { history: merged, added }
}
