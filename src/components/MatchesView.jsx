import { useMemo, useState } from 'react'
import { GAME_LABELS, formatDate, buildFrequency, setEntriesFrom } from '../data.js'
import StatCard from './StatCard.jsx'

export default function MatchesView({ matches = [], sets = {}, draws = [], groupNames = [] }) {
  const [size, setSize] = useState('all')
  const [group, setGroup] = useState('all')

  const hotNumbers = useMemo(() => {
    const freq = buildFrequency(draws)
    const entries = Object.keys(freq.all || {}).map(Number)
    entries.sort((a, b) => (freq.all[b] - freq.all[a]) || (a - b))
    return new Set(entries.slice(0, 6))
  }, [draws])

  const count3 = matches.filter((m) => m.size === 3).length
  const count4 = matches.filter((m) => m.size === 4).length

  const groups = useMemo(() => {
    return setEntriesFrom(sets)
      .filter(({ name }) => group === 'all' || name === group)
      .map(({ name, sets: groupSets }) => {
        const rows = groupSets
          .map((set, i) => {
            const hits = matches
              .filter((m) => m.group === name && m.index === i + 1)
              .sort((a, b) => (a.date < b.date ? 1 : -1))
            return { index: i + 1, set, size: set.length, count: hits.length, hits }
          })
          .filter((r) => size === 'all' || r.size === Number(size))
        rows.sort((a, b) => b.count - a.count || a.index - b.index)
        const total = rows.reduce((sum, r) => sum + r.count, 0)
        return { name, rows, total }
      })
      .filter(({ rows }) => rows.length > 0)
  }, [sets, matches, group, size])

  return (
    <section>
      <div className="view-head">
        <h2>Number-set matches</h2>
        <p>Every full match — each number in the set appears in the draw&apos;s 6 main numbers.</p>
      </div>

      <div className="stat-cards">
        <StatCard label="All set hits" value={matches.length} />
        <StatCard label="3-number hits" value={count3} />
        <StatCard label="4-number hits" value={count4} />
      </div>

      <div className="filters-row">
        <label className="filter-field">
          <span>Set size</span>
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="all">All sizes</option>
            <option value="3">3 numbers</option>
            <option value="4">4 numbers</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Group</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="all">All groups</option>
            {groupNames.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="empty">No sets found for the current filters.</p>
      ) : (
        groups.map(({ name, rows, total }) => (
          <div key={name} className="glass card">
            <h3 className="card-title">
              {name} <span className="muted">· {total} hits</span>
            </h3>
            <div className="table-wrap">
              <table className="stack-table matches-table">
                <thead>
                  <tr>
                    <th>Set #</th>
                    <th>Numbers</th>
                    <th>Size</th>
                    <th>Hits</th>
                    <th>Hit dates</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${name}-${r.index}`}>
                      <td data-label="Set #">{r.index}</td>
                      <td data-label="Numbers">
                        <span className="chips">
                          {r.set.map((n) => (
                            <span key={n} className={`chip ${hotNumbers.has(n) ? 'hot' : ''}`}>
                              {n}
                            </span>
                          ))}
                        </span>
                      </td>
                      <td data-label="Size">{r.size}</td>
                      <td data-label="Hits">{r.count}</td>
                      <td data-label="Hit dates">
                        {r.hits.length === 0 ? (
                          <span className="muted">—</span>
                        ) : (
                          <span className="hit-dates">
                            {r.hits.map((h) => (
                              <span key={`${h.date}-${h.game}`} className="hit-date">
                                {formatDate(h.date)} · {GAME_LABELS[h.game]}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </section>
  )
}

