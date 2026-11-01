// ----------------------------------------------------------------------------------
//  Name:    StatsView.jsx
//  Author:  Mark Casey
//
//  Purpose: Statistics view: match counts and charts per group and game.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { GAME_LABELS, computeMatchStats, gameStats, groupStats } from '../data.js'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_COLORS, GRID_STROKE, tickStyle, tooltipProps } from '../chartTheme.js'
import StatCard from './StatCard.jsx'

// ── Constants ─────────────────────────────────────────────
const CHART_MARGIN = { top: 8, right: 8, left: -18, bottom: 0 }

// ── Component ─────────────────────────────────────────────
function MatchBarChart({ data, color }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis dataKey="name" tick={tickStyle()} />
        <YAxis allowDecimals={false} tick={tickStyle()} />
        <Tooltip {...tooltipProps} formatter={(value) => [value, 'Matches']} />
        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function StatsView({ matches, draws, sets = {} }) {
  const s = computeMatchStats(matches, draws)
  const groupRows = groupStats(matches, sets)
  const gameRows = gameStats(matches, draws)

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
            <MatchBarChart data={sizeData} color={CHART_COLORS.accent} />
          </div>
        </div>

        <div className="glass card">
          <h3 className="card-title">Matches by game</h3>
          <div className="chart-box">
            <MatchBarChart data={gameData} color={CHART_COLORS.accent2} />
          </div>
        </div>
      </div>

      <div className="glass card table-wrap">
        <h3 className="card-title">By group</h3>
        <table className="stack-table">
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
                <td data-label="Group">{r.name}</td>
                <td data-label="Sets">{r.sets}</td>
                <td data-label="Matches">{r.matches}</td>
                <td data-label="Distinct sets hit">{r.distinct}</td>
                <td data-label="% of sets hit">{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass card table-wrap">
        <h3 className="card-title">By game</h3>
        <table className="stack-table">
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
                <td data-label="Game">{GAME_LABELS[r.game]}</td>
                <td data-label="Draws">{r.draws}</td>
                <td data-label="Matches">{r.matches}</td>
                <td data-label="Draws with match">{r.drawsWith}</td>
                <td data-label="Hit rate">{r.hitRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

