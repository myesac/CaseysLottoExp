// ----------------------------------------------------------------------------------
//  Name:    App.jsx
//  Author:  Mark Casey
//
//  Purpose: Root component: wires data loading, hash routing and the shared
//           number-set draft into the header, navigation and active view.
//           Phones get a compact header, a sticky filter bar and a bottom tab bar.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useMemo, useState } from 'react'
import { buildMatches, filterHistory, formatDateTime, setGroupNamesFrom } from './data.js'
import { SET_VIEWS, VIEWS, useRoute } from './routing.js'
import useLottoData from './useLottoData.js'
import useMediaQuery, { MOBILE_QUERY } from './useMediaQuery.js'
import useSetsDraft from './useSetsDraft.js'
import ActualsView from './components/ActualsView.jsx'
import MatchesView from './components/MatchesView.jsx'
import StatsView from './components/StatsView.jsx'
import FrequencyView from './components/FrequencyView.jsx'
import SetManagerView from './components/SetManagerView.jsx'
import GenerateSetView from './components/GenerateSetView.jsx'
import StatusMessage from './components/StatusMessage.jsx'
import FilterControls from './components/FilterControls.jsx'
import BottomNav, { SetsSwitch } from './components/BottomNav.jsx'
import Icon from './components/Icon.jsx'

// ── Component ─────────────────────────────────────────────
export default function App() {
  const [route, navigate] = useRoute()
  const { view, game, startDate } = route
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const data = useLottoData()
  const { history, numberSets, updatedAt, loading, loadError, refreshing, refreshStatus, refresh } = data
  const setsDraft = useSetsDraft(numberSets, data.saveNumberSets)

  const [lastSetsView, setLastSetsView] = useState(SET_VIEWS[0])
  if (SET_VIEWS.includes(view) && view !== lastSetsView) setLastSetsView(view)

  const scopedHistory = useMemo(
    () => history.filter((d) => d.date >= startDate),
    [history, startDate],
  )
  const draws = useMemo(() => filterHistory(scopedHistory, game), [scopedHistory, game])
  const matches = useMemo(() => buildMatches(scopedHistory, numberSets), [scopedHistory, numberSets])
  const scopedMatches = useMemo(
    () => (game === 'all' ? matches : matches.filter((m) => m.game === game)),
    [matches, game],
  )
  const groupNames = useMemo(() => setGroupNamesFrom(numberSets), [numberSets])

  const panels = {
    draws: () => <ActualsView draws={draws} game={game} />,
    matches: () => (
      <MatchesView matches={scopedMatches} sets={numberSets} draws={draws} groupNames={groupNames} />
    ),
    frequency: () => <FrequencyView draws={draws} />,
    stats: () => <StatsView matches={scopedMatches} draws={draws} sets={numberSets} />,
    'sets-manager': () => <SetManagerView draft={setsDraft} />,
    generate: () => <GenerateSetView draft={setsDraft} />,
  }
  const ready = !loading && !loadError

  return (
    <div className={`app ${isMobile ? 'app-mobile' : ''}`}>
      <header className="app-header glass">
        <div className="brand">
          <img src="/logo.svg" alt="" className="app-logo" />
          <div className="brand-text">
            <h1 className="app-title">Casey&apos;s Lotto Experiment</h1>
            {!isMobile && (
              <p className="app-subtitle">Irish Lotto results &amp; number-set match analyser</p>
            )}
            {updatedAt && (
              <p className="last-updated">
                {isMobile ? 'Updated' : 'Data updated'} {formatDateTime(updatedAt)}
              </p>
            )}
          </div>
        </div>
        {isMobile ? (
          <button
            className={`refresh-btn icon-btn ${refreshing ? 'spinning' : ''}`}
            onClick={refresh}
            disabled={refreshing}
            aria-label={refreshing ? 'Refreshing draws' : 'Refresh draws'}
            title="Refresh draws"
            type="button"
          >
            <Icon name="refresh" size={20} />
          </button>
        ) : (
          <div className="header-controls">
            <FilterControls startDate={startDate} game={game} navigate={navigate} />
            <button className="refresh-btn" onClick={refresh} disabled={refreshing} type="button">
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        )}
      </header>

      <StatusMessage status={refreshStatus}>
        {refreshStatus?.error && (
          <button className="btn-secondary" onClick={refresh} type="button">
            Retry
          </button>
        )}
      </StatusMessage>

      {isMobile && ready && (
        <div className="filter-bar glass">
          <FilterControls startDate={startDate} game={game} navigate={navigate} />
        </div>
      )}

      {loading && <p className="empty">Loading data…</p>}
      {!loading && loadError && <p className="empty error">Could not load data: {loadError}</p>}

      {ready && (
        <>
          {!isMobile && (
            <nav className="tabs glass" role="tablist" aria-label="Views">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  id={`tab-${v.id}`}
                  role="tab"
                  aria-selected={view === v.id}
                  aria-controls={`panel-${v.id}`}
                  className={`tab ${view === v.id ? 'active' : ''}`}
                  onClick={() => navigate({ view: v.id })}
                  type="button"
                >
                  {v.label}
                </button>
              ))}
            </nav>
          )}

          <main className="content" id="main">
            {isMobile && SET_VIEWS.includes(view) && <SetsSwitch view={view} navigate={navigate} />}
            <div
              role={isMobile ? undefined : 'tabpanel'}
              id={`panel-${view}`}
              aria-labelledby={isMobile ? undefined : `tab-${view}`}
            >
              {panels[view]()}
            </div>
          </main>

          {isMobile && <BottomNav view={view} lastSetsView={lastSetsView} navigate={navigate} />}
        </>
      )}
    </div>
  )
}
