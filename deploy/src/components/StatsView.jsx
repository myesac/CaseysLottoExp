import { GAMES, GAME_LABELS, computeMatchStats, setEntriesFrom } from '../data.js'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import StatCard from './StatCard.jsx'

const tooltipStyle = {
  background: '#111830',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: 10,
  color: '#eaf0ff',
}

export default function StatsView({ matches, draws, sets = {} }) {
  const s = computeMatchStats(matches, draws)
  const setEntries = setEntriesFrom(sets)

  const groupRows = setEntries.map(({ name, sets }) => {
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

  const gameRows = GAMES.map((g) => {
    const gm = matches.filter((m) => m.game === g)
    const drawsForGame = draws.filter((d) => d.game === g)
    const drawsWith = new Set(gm.map((m) => m.date)).size
    return {
      game: g,
      draws: drawsForGame.length,
      matches: gm.length,
      drawsWith,
      hitRate: drawsForGame.length
        ? ((drawsWith / drawsForGame.length) * 100).toFixed(1)
        : '0.0',
    }
  }).filter((r) => r.draws > 0)

  const sizeData = [
    { name: '3-number', count: s.bySize[3] || 0 },
    { name: '4-number', count: s.bySize[4] || 0 },
  ]
  const gameData = gameRows.map((r) => ({ name: GAME_LABELS[r.game], count: r.matches }))

  return (
    <section>
      <div className="view-head">
        <h2>Statistics</h2>
        <p>Hit rate = share of draws with at least one set match, across the selected scope.</p>
      </div>

      <div className="stat-cards">
        <StatCard label="Draws" value={draws.length} />
        <StatCard label="All set hits" value={matches.length} />
        <StatCard label="Draws with a hit" value={s.drawsWithMatch} />
        <StatCard label="Hit rate" value={`${(s.hitRate * 100).toFixed(1)}%`} accent="accent" />
      </div>

      <div className="chart-grid">
        <div className="glass card">
          <h3 className="card-title">Matches by set size</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sizeData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#93a1c4', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#93a1c4', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#eaf0ff' }}
                  itemStyle={{ color: '#eaf0ff' }}
                  formatter={(value) => [value, 'Matches']}
                />
                <Bar dataKey="count" fill="#38e1ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass card">
          <h3 className="card-title">Matches by game</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gameData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#93a1c4', fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#93a1c4', fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: '#eaf0ff' }}
                  itemStyle={{ color: '#eaf0ff' }}
                  formatter={(value) => [value, 'Matches']}
                />
                <Bar dataKey="count" fill="#a78bfa" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass card table-wrap">
        <h3 className="card-title">By group</h3>
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Sets</th>
              <th>Matches</th>
              <th>Distinct sets hit</th>
              <th>% of sets hit</th>
            </tr>
          </thead>
          <tbody>
            {groupRows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.sets}</td>
                <td>{r.matches}</td>
                <td>{r.distinct}</td>
                <td>{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass card table-wrap">
        <h3 className="card-title">By game</h3>
        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>Draws</th>
              <th>Matches</th>
              <th>Draws with match</th>
              <th>Hit rate</th>
            </tr>
          </thead>
          <tbody>
            {gameRows.map((r) => (
              <tr key={r.game}>
                <td>{GAME_LABELS[r.game]}</td>
                <td>{r.draws}</td>
                <td>{r.matches}</td>
                <td>{r.drawsWith}</td>
                <td>{r.hitRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

