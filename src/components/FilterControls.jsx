// ----------------------------------------------------------------------------------
//  Name:    FilterControls.jsx
//  Author:  Mark Casey
//
//  Purpose: Date-from and game filters. Rendered in the header on desktop and in
//           the sticky filter bar on phones.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { GAME_LABELS, MIN_START_DATE, localTodayISO } from '../data.js'

// ── Component ─────────────────────────────────────────────
export default function FilterControls({ startDate, game, navigate }) {
  return (
    <>
      <label className="filter-field">
        <span>Date from</span>
        <input
          type="date"
          value={startDate}
          min={MIN_START_DATE}
          max={localTodayISO()}
          onChange={(e) => navigate({ startDate: e.target.value || MIN_START_DATE })}
        />
      </label>
      <label className="filter-field">
        <span>Game</span>
        <select value={game} onChange={(e) => navigate({ game: e.target.value })}>
          <option value="all">All games</option>
          {Object.entries(GAME_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
