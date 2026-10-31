import { useMemo } from 'react'
import { buildFrequency, numberRange } from '../data.js'
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

const tooltipStyle = {
  background: '#111830',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: 10,
  color: '#eaf0ff',
}

export default function FrequencyView({ draws }) {
  const freq = useMemo(() => buildFrequency(draws), [draws])
  const { min, max } = useMemo(() => numberRange(draws), [draws])
  const isMobile = useMediaQuery(MOBILE_QUERY)

  const entries = []
  for (let n = min; n <= max; n += 1) {
    entries.push({ n, count: freq.all[n] || 0 })
  }

  const hot = [...entries]
    .sort((a, b) => b.count - a.count || a.n - b.n)
    .slice(0, 6)
    .map((e) => e.n)
  const cold = [...entries]
    .sort((a, b) => a.count - b.count || a.n - b.n)
    .slice(0, 6)
    .map((e) => e.n)
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
              <CartesianGrid stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
              <XAxis
                dataKey="n"
                tick={{ fill: '#93a1c4', fontSize: isMobile ? 10 : 11 }}
                interval={isMobile ? 4 : 1}
              />
              <YAxis allowDecimals={false} tick={{ fill: '#93a1c4', fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                contentStyle={tooltipStyle}
                labelStyle={{ color: '#eaf0ff' }}
                itemStyle={{ color: '#eaf0ff' }}
                formatter={(value) => [`${value} draws`, 'Appearances']}
                labelFormatter={(n) => `Number ${n}`}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {entries.map((e) => (
                  <Cell
                    key={e.n}
                    fill={
                      hotSet.has(e.n) ? '#ff7a59' : coldSet.has(e.n) ? '#4cc9f0' : '#38e1ff'
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

