// ----------------------------------------------------------------------------------
//  Name:    MatchesView.jsx
//  Author:  Mark Casey
//
//  Purpose: Matches view: draws where a number set fully matched.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useMemo, useState } from 'react'
import {
  GAME_LABELS,
  buildFrequency,
  formatDate,
  matchRowsByGroup,
  rankNumbers,
} from '../data.js'
import StatCard from './StatCard.jsx'
import MultiSelect from './MultiSelect.jsx'

// ── Constants ─────────────────────────────────────────────
const HOT_COUNT = 6

// ── Component ─────────────────────────────────────────────
export default function MatchesView({ matches = [], sets = {}, draws = [], groupNames = [] }) {
  const [size, setSize] = useState('all')
  const [selectedGroups, setGroups] = useState([])
  // Renamed or deleted groups drop out; if none are left this means "All groups".
  const groupFilter = useMemo(
    () => selectedGroups.filter((g) => groupNames.includes(g)),
    [selectedGroups, groupNames],
  )

  const hotNumbers = useMemo(
    () => new Set(rankNumbers(buildFrequency(draws).all, HOT_COUNT, 'hot')),
    [draws],
  )

  const count3 = matches.filter((m) => m.size === 3).length
  const count4 = matches.filter((m) => m.size === 4).length

  const groups = useMemo(
    () => matchRowsByGroup(sets, matches, { groups: groupFilter, size }),
    [sets, matches, groupFilter, size],
  )

  return (
    <section>
      <div className="view-head">
        <h2>Number-set matches</h2>
        <p>Every full match, each number in the set appears in the draw&apos;s 6 main numbers.</p>
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
        <MultiSelect
          label="Groups"
          options={groupNames}
          selected={groupFilter}
          onChange={setGroups}
          allLabel="All groups"
        />
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
                    <tr key={r.set.join('-')}>
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

