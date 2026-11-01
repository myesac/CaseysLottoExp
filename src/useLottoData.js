// ----------------------------------------------------------------------------------
//  Name:    useLottoData.js
//  Author:  Mark Casey
//
//  Purpose: React hook that loads /api/data and exposes refresh and save actions.
//
//  Exported API:
//   • default useLottoData()  → { history, numberSets, updatedAt, loading,
//                                 loadError, refreshing, refreshStatus,
//                                 refresh(), saveNumberSets(sets) }
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { fetchAdmin, readErrorMessage } from './adminApi.js'

// ── Hook ──────────────────────────────────────────────────
export default function useLottoData() {
  const [history, setHistory] = useState([])
  const [numberSets, setNumberSets] = useState({})
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshStatus, setRefreshStatus] = useState(null)

  const apply = (data) => {
    setHistory(data.history || [])
    setNumberSets(data.numberSets || {})
    setUpdatedAt(data.updatedAt || null)
  }

  useEffect(() => {
    let cancelled = false
    fetch('/api/data')
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load data (${res.status})`)
        return res.json()
      })

      .then((data) => {
        if (!cancelled) apply(data)
      })

      .catch((e) => {
        console.error('Loading /api/data failed:', e)
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
    setRefreshStatus(null)
    try {
      const res = await fetchAdmin('/api/refresh', { method: 'POST' })
      if (!res.ok) throw new Error(await readErrorMessage(res, `Refresh failed (${res.status})`))
      const data = await res.json()
      apply(data)
      setRefreshStatus({ message: `Added ${data.added ?? 0} new draw(s)` })
    } catch (e) {
      setRefreshStatus({ message: e.message, error: true })
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
    if (!res.ok) throw new Error(await readErrorMessage(res, `Save failed (${res.status})`))
    const data = await res.json()
    setNumberSets(data.numberSets || {})

    return data
  }

  return {
    history,
    numberSets,
    updatedAt,
    loading,
    loadError,
    refreshing,
    refreshStatus,
    refresh,
    saveNumberSets,
  }
}
