import { useEffect, useMemo, useState } from 'react'
import {
  GAME_LABELS,
  MIN_START_DATE,
  buildMatches,
  filterHistory,
  setGroupNamesFrom,
} from './data.js'
import ActualsView from './components/ActualsView.jsx'
import MatchesView from './components/MatchesView.jsx'
import StatsView from './components/StatsView.jsx'
import FrequencyView from './components/FrequencyView.jsx'
import SetManagerView from './components/SetManagerView.jsx'
import { fetchAdmin } from './adminApi.js'

const VIEWS = [
  { id: 'draws', label: 'Draws' },
  { id: 'matches', label: 'Matches' },
  { id: 'frequency', label: 'Frequency' },
  { id: 'stats', label: 'Statistics' },
  { id: 'sets-manager', label: 'Set Manager' },
]

function localTodayISO() {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

function parseHash() {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '')
  const [viewPart, queryPart] = raw.split('?')
  const params = new URLSearchParams(queryPart || '')
  const view = VIEWS.some((v) => v.id === viewPart) ? viewPart : 'stats'
  return {
    view,
    game: params.get('game') || 'all',
    startDate: params.get('from') || MIN_START_DATE,
  }
}

function buildHash({ view, game, startDate }) {
  const params = new URLSearchParams()
  if (game !== 'all') params.set('game', game)
  if (startDate !== MIN_START_DATE) params.set('from', startDate)
  const qs = params.toString()
  return `#/${view}${qs ? `?${qs}` : ''}`
}

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function App() {
  const [route, setRoute] = useState(parseHash)

  const [history, setHistory] = useState([])
  const [numberSets, setNumberSets] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState(null)
  const [refreshError, setRefreshError] = useState(null)

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (patch) => {
    const next = { ...route, ...patch }
    setRoute(next)
    const hash = buildHash(next)
    if (window.location.hash !== hash) window.location.hash = hash
  }

  const view = route.view
  const game = route.game
  const startDate = route.startDate

  useEffect(() => {
    let cancelled = false
    fetch('/api/data')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data (${res.status})`)
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        setHistory(data.history || [])
        setNumberSets(data.numberSets || {})
        setUpdatedAt(data.updatedAt || null)
        setLoadError(null)
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refresh = async () => {
    setRefreshing(true)
    setRefreshMessage(null)
    setRefreshError(null)
    try {
      const res = await fetchAdmin('/api/refresh', { method: 'POST' })
      if (!res.ok) {
        let msg = `Refresh failed (${res.status})`
        try {
          const body = await res.json()
          if (body.error) msg = body.error
        } catch {
          // ignore
        }
        throw new Error(msg)
      }
      const data = await res.json()
      setHistory(data.history || [])
      setNumberSets(data.numberSets || {})
      setUpdatedAt(data.updatedAt || null)
      setRefreshMessage(`Added ${data.added ?? 0} new draw(s)`)
    } catch (e) {
      setRefreshError(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const saveNumberSets = async (sets) => {
    const res = await fetchAdmin('/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numberSets: sets }),
    })
    if (!res.ok) {
      let msg = `Save failed (${res.status})`
      try {
        const body = await res.json()
        if (body.error) msg = body.error
      } catch {
        // ignore
      }
      throw new Error(msg)
    }
    const data = await res.json()
    setNumberSets(data.numberSets || {})
    return data
  }

  const scopedHistory = useMemo(
    () => (history || []).filter((d) => d.date >= startDate),
    [history, startDate],
  )

  const draws = useMemo(() => filterHistory(scopedHistory, game), [scopedHistory, game])
  const matches = useMemo(() => buildMatches(scopedHistory, numberSets), [scopedHistory, numberSets])
  const scopedMatches = useMemo(
    () => (game === 'all' ? matches : matches.filter((m) => m.game === game)),
    [matches, game],
  )
  const groupNames = useMemo(() => setGroupNamesFrom(numberSets), [numberSets])

  return (
    <div className="app">
      <header className="app-header glass">
        <div className="brand">
          <img src="/logo.svg" alt="Casey's Lotto Experiment logo" className="app-logo" />
          <div>
            <h1 className="app-title">Casey&apos;s Lotto Experiment</h1>
            <p className="app-subtitle">Irish Lotto results &amp; number-set match analyser</p>
            {updatedAt && <p className="last-updated">Data updated {formatDateTime(updatedAt)}</p>}
          </div>
        </div>
        <div className="header-controls">
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
          <button className="refresh-btn" onClick={refresh} disabled={refreshing} type="button">
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {(refreshMessage || refreshError) && (
        <div className={`refresh-status ${refreshError ? 'error' : ''}`} role="status">
          <span>{refreshError || refreshMessage}</span>
          {refreshError && (
            <button className="btn-secondary" onClick={refresh} type="button">
              Retry
            </button>
          )}
        </div>
      )}

      {loading && <p className="empty">Loading data…</p>}
      {!loading && loadError && <p className="empty error">Could not load data: {loadError}</p>}

      {!loading && !loadError && (
        <>
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

          <main className="content" id="main">
            {view === 'draws' && (
              <div role="tabpanel" id="panel-draws" aria-labelledby="tab-draws">
                <ActualsView draws={draws} game={game} />
              </div>
            )}
            {view === 'matches' && (
              <div role="tabpanel" id="panel-matches" aria-labelledby="tab-matches">
                <MatchesView
                  matches={scopedMatches}
                  sets={numberSets}
                  draws={draws}
                  groupNames={groupNames}
                />
              </div>
            )}
            {view === 'frequency' && (
              <div role="tabpanel" id="panel-frequency" aria-labelledby="tab-frequency">
                <FrequencyView draws={draws} />
              </div>
            )}
            {view === 'stats' && (
              <div role="tabpanel" id="panel-stats" aria-labelledby="tab-stats">
                <StatsView matches={scopedMatches} draws={draws} sets={numberSets} />
              </div>
            )}
            {view === 'sets-manager' && (
              <div role="tabpanel" id="panel-sets-manager" aria-labelledby="tab-sets-manager">
                <SetManagerView sets={numberSets} onSave={saveNumberSets} />
              </div>
            )}
          </main>
        </>
      )}
    </div>
  )
}
