// ----------------------------------------------------------------------------------
//  Name:    useSetsDraft.js
//  Author:  Mark Casey
//
//  Purpose: Unsaved edits to the number sets, shared by Set Manager and
//           Generate Set. Lives in App so switching tabs keeps the draft, and
//           warns before the page is closed with unsaved changes.
//
//  Exported API:
//   • default useSetsDraft(sets, onSave)  → { draft, dirty, saving, status,
//                                             update, fail, save, renameGroup,
//                                             deleteGroup }
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { groupNameError } from './data.js'

// ── Hook ──────────────────────────────────────────────────
export default function useSetsDraft(sets, onSave) {
  const [base, setBase] = useState(sets)
  const [draft, setDraft] = useState(sets)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  const dirty = JSON.stringify(draft) !== JSON.stringify(base)

  // Saved data changed (load, refresh or save): adopt it unless there are unsaved edits.
  if (sets !== base) {
    setBase(sets)
    if (!dirty) setDraft(sets)
  }

  useEffect(() => {
    if (!dirty) return undefined
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = (next) => {
    setDraft(next)
    setStatus(null)
  }

  const fail = (message) => setStatus({ message, error: true })

  const save = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const data = await onSave(draft)
      setDraft(data.numberSets || {})
      setStatus({ message: 'Changes saved' })
    } catch (e) {
      fail(e.message)
    } finally {
      setSaving(false)
    }
  }

  const renameGroup = (oldName, newNameRaw) => {
    const newName = newNameRaw.trim()
    if (!newName || newName === oldName) return
    const nameError = groupNameError(newName)
    if (nameError) {
      fail(nameError)
      return
    }
    if (Object.hasOwn(draft, newName)) {
      fail('A group with that name already exists')
      return
    }
    const next = {}
    for (const [k, v] of Object.entries(draft)) next[k === oldName ? newName : k] = v
    update(next)
  }

  const deleteGroup = (name) => {
    const next = { ...draft }
    delete next[name]
    update(next)
  }

  return { draft, dirty, saving, status, update, fail, save, renameGroup, deleteGroup }
}
