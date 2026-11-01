// ----------------------------------------------------------------------------------
//  Name:    ActualsView.jsx
//  Author:  Mark Casey
//
//  Purpose: Draws view: lists draw results for the selected game.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { GAME_LABELS, formatDate } from '../data.js'
import Ball from './Ball.jsx'

// ── Component ─────────────────────────────────────────────
export default function ActualsView({ draws, game }) {
  const byGame = {}
  for (const d of draws) {
    if (!byGame[d.game]) byGame[d.game] = []
    byGame[d.game].push(d)
  }

  const newestFirst = (arr) => [...arr].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <section>
      <div className="view-head">
        <h2>Draw actuals</h2>
        <p>
          {draws.length} draws · {game === 'all' ? 'all games' : GAME_LABELS[game]}
        </p>
      </div>

      {Object.keys(byGame).length === 0 && <p className="empty">No draws to display.</p>}

      {Object.keys(byGame).map((g) => (
        <div key={g} className="glass card">
          <h3 className="card-title">
            {GAME_LABELS[g]} <span className="muted">· {byGame[g].length} draws</span>
          </h3>
          <div className="draw-list">
            {newestFirst(byGame[g]).map((d) => (
              <div key={`${g}-${d.date}`} className="draw-row">
                <div className="draw-date">{formatDate(d.date)}</div>
                <div className="draw-balls">
                  {d.numbers.map((n) => (
                    <Ball key={n} n={n} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
