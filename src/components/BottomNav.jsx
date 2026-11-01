// ----------------------------------------------------------------------------------
//  Name:    BottomNav.jsx
//  Author:  Mark Casey
//
//  Purpose: Phone navigation: a fixed bottom tab bar, plus the Set Manager /
//           Generate switch shown at the top of the "Sets" tab.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { MOBILE_TABS, SET_VIEWS, VIEWS } from '../routing.js'
import Icon from './Icon.jsx'

// ── Constants ─────────────────────────────────────────────
const SET_VIEW_LABELS = { 'sets-manager': 'Manage', generate: 'Generate' }

// ── Components ────────────────────────────────────────────
// lastSetsView: the set view to reopen when the "Sets" tab is tapped.
export default function BottomNav({ view, lastSetsView, navigate }) {
  return (
    <nav className="bottom-nav" aria-label="Views">
      {MOBILE_TABS.map((tab) => {
        const active = tab.views ? tab.views.includes(view) : view === tab.id
        const target = tab.views ? lastSetsView : tab.id

        return (
          <button
            key={tab.id}
            className={`bottom-tab ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate({ view: target })}
            type="button"
          >
            <Icon name={tab.icon} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export function SetsSwitch({ view, navigate }) {
  return (
    <div className="sets-switch glass" role="tablist" aria-label="Number sets">
      {SET_VIEWS.map((id) => (
        <button
          key={id}
          role="tab"
          aria-selected={view === id}
          className={`tab ${view === id ? 'active' : ''}`}
          onClick={() => navigate({ view: id })}
          type="button"
          title={VIEWS.find((v) => v.id === id).label}
        >
          {SET_VIEW_LABELS[id]}
        </button>
      ))}
    </div>
  )
}
