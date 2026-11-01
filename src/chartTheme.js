// ----------------------------------------------------------------------------------
//  Name:    chartTheme.js
//  Author:  Mark Casey
//
//  Purpose: Shared Recharts styling. Colours mirror the CSS variables in
//           index.css; Recharts needs literal values, not var() references.
//
//  Exported API:
//   • CHART_COLORS   → named colour constants
//   • GRID_STROKE    → CartesianGrid stroke colour
//   • tickStyle()    → axis tick props for a font size
//   • tooltipProps   → shared <Tooltip> props
// ----------------------------------------------------------------------------------

// ── Constants ─────────────────────────────────────────────
export const CHART_COLORS = {
  text: '#eaf0ff',
  muted: '#93a1c4',
  accent: '#38e1ff',
  accent2: '#a78bfa',
  hot: '#ff7a59',
  cold: '#4cc9f0',
}

export const GRID_STROKE = 'rgba(255, 255, 255, 0.06)'

export const tooltipProps = {
  cursor: { fill: 'rgba(255, 255, 255, 0.04)' },
  contentStyle: {
    background: '#111830',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: 10,
    color: CHART_COLORS.text,
  },
  labelStyle: { color: CHART_COLORS.text },
  itemStyle: { color: CHART_COLORS.text },
}

// ── Helpers ───────────────────────────────────────────────
export function tickStyle(fontSize = 12) {
  return { fill: CHART_COLORS.muted, fontSize }
}
