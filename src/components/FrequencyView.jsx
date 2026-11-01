// ----------------------------------------------------------------------------------
//  Name:    FrequencyView.jsx
//  Author:  Mark Casey
//
//  Purpose: Frequency view: how often each number has been drawn.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useMemo } from 'react'
import { buildFrequency, numberRange, rankNumbers } from '../data.js'
import useMediaQuery, { MOBILE_QUERY } from '../useMediaQuery.js'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { CHART_COLORS, GRID_STROKE, tickStyle, tooltipProps } from '../chartTheme.js'

// ── Constants ─────────────────────────────────────────────
const RANK_COUNT = 6

// ── Component ─────────────────────────────────────────────
export default function FrequencyView({ draws }) {
  const freq = useMemo(() => buildFrequency(draws), [draws])
  const { min, max } = useMemo(() => numberRange(draws), [draws])
  const isMobile = useMediaQuery(MOBILE_QUERY)

  const entries = []
  for (let n = min; n <= max; n += 1) {
    entries.push({ n, count: freq.all[n] || 0 })
  }

  const hot = rankNumbers(freq.all, RANK_COUNT, 'hot')
  const cold = rankNumbers(freq.all, RANK_COUNT, 'cold')
  const hotSet = new Set(hot)
  const coldSet = new Set(cold)

  const hotEntries = hot.map((n) => ({ n, count: freq.all[n] }))
  const coldEntries = cold.map((n) => ({ n, count: freq.all[n] }))

  return (
    <section>
      <div className="view-head">
        <h2>Number frequency</h2>
        <p>How often each number has appeared across the selected draws.</p>
      </div>

      <div className="stat-cards">
        <div className="stat-card glass">
          <div className="stat-label">Hottest numbers</div>
          <div className="chips">
            {hotEntries.map(({ n, count }) => (
              <span key={n} className="chip hot">
                {n} · {count}
              </span>
            ))}
          </div>
        </div>
        <div className="stat-card glass">
          <div className="stat-label">Coldest numbers</div>
          <div className="chips">
            {coldEntries.map(({ n, count }) => (
              <span key={n} className="chip cold">
                {n} · {count}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="view-foot">
        Hottest/coldest are the top and bottom six by appearance count; ties are broken by ball
        number.
      </p>

      <div className="glass card">
        <h3 className="card-title">Appearance count</h3>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={entries}
              margin={{ top: 8, right: isMobile ? 2 : 8, left: isMobile ? -24 : -18, bottom: 0 }}
            >
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="n" tick={tickStyle(isMobile ? 10 : 11)} interval={isMobile ? 4 : 1} />
              <YAxis allowDecimals={false} tick={tickStyle(11)} />
              <Tooltip
                {...tooltipProps}
                formatter={(value) => [`${value} draws`, 'Appearances']}
                labelFormatter={(n) => `Number ${n}`}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {entries.map((e) => (
                  <Cell
                    key={e.n}
                    fill={
                      hotSet.has(e.n)
                        ? CHART_COLORS.hot
                        : coldSet.has(e.n)
                          ? CHART_COLORS.cold
                          : CHART_COLORS.accent
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

