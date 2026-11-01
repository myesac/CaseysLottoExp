// ----------------------------------------------------------------------------------
//  Name:    routing.js
//  Author:  Mark Casey
//
//  Purpose: Hash routing: #/<view>?game=<id>&from=<YYYY-MM-DD>.
//
//  Exported API:
//   • VIEWS         → [{ id, label }] in tab order
//   • SET_VIEWS     → string[] of the views under the phone "Sets" tab
//   • MOBILE_TABS   → [{ id, label, icon, views? }] for the phone bottom bar
//   • parseHash()   → { view, game, startDate }
//   • buildHash()   → hash string for a route
//   • useRoute()    → [route, navigate(patch)]
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { GAME_LABELS, MIN_START_DATE, isIsoDate } from './data.js'

// ── Constants ─────────────────────────────────────────────
export const VIEWS = [
  { id: 'draws', label: 'Draws' },
  { id: 'matches', label: 'Matches' },
  { id: 'frequency', label: 'Frequency' },
  { id: 'stats', label: 'Statistics' },
  { id: 'sets-manager', label: 'Set Manager' },
  { id: 'generate', label: 'Generate Set' },
]

// Phone bottom bar: one tab per view, except "Sets" which covers both set views.
export const SET_VIEWS = ['sets-manager', 'generate']

export const MOBILE_TABS = [
  { id: 'draws', label: 'Draws', icon: 'draws' },
  { id: 'matches', label: 'Matches', icon: 'matches' },
  { id: 'frequency', label: 'Frequency', icon: 'frequency' },
  { id: 'stats', label: 'Stats', icon: 'stats' },
  { id: 'sets', label: 'Sets', icon: 'sets', views: SET_VIEWS },
]

const DEFAULT_VIEW = 'stats'

// ── Hash parsing ──────────────────────────────────────────
export function parseHash(hash = window.location.hash) {
  const [viewPart, queryPart] = hash.replace(/^#\/?/, '').split('?')
  const params = new URLSearchParams(queryPart || '')
  const game = params.get('game')
  const from = params.get('from')

  return {
    view: VIEWS.some((v) => v.id === viewPart) ? viewPart : DEFAULT_VIEW,
    game: Object.hasOwn(GAME_LABELS, game || '') ? game : 'all',
    startDate: isIsoDate(from) && from >= MIN_START_DATE ? from : MIN_START_DATE,
  }
}

export function buildHash({ view, game, startDate }) {
  const params = new URLSearchParams()
  if (game !== 'all') params.set('game', game)
  if (startDate !== MIN_START_DATE) params.set('from', startDate)
  const qs = params.toString()

  return `#/${view}${qs ? `?${qs}` : ''}`
}

// ── Hook ──────────────────────────────────────────────────
export function useRoute() {
  const [route, setRoute] = useState(() => parseHash())

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (patch) => {
    const next = { ...route, ...patch }
    setRoute(next)
    const nextLocation = buildHash(next)
    if (window.location.hash !== nextLocation) window.location.hash = nextLocation
  }

  return [route, navigate]
}
