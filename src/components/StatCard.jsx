// ----------------------------------------------------------------------------------
//  Name:    StatCard.jsx
//  Author:  Mark Casey
//
//  Purpose: Renders a labelled statistic tile.
// ----------------------------------------------------------------------------------

export default function StatCard({ label, value, accent = '' }) {
  return (
    <div className={`stat-card glass ${accent}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
