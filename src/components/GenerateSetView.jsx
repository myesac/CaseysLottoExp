// ----------------------------------------------------------------------------------
//  Name:    GenerateSetView.jsx
//  Author:  Mark Casey
//
//  Purpose: Generate Set view: creates groups of 10 random 3-number sets
//           (1-45), unique across every set in every group.
//           Edits a draft shared with Set Manager (see useSetsDraft.js).
//           Generated groups are recognised by their "Generated Set" name prefix.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useState } from 'react'
import { setKey } from '../data.js'
import GroupHeader from './GroupHeader.jsx'
import StatusMessage from './StatusMessage.jsx'

// ── Constants ─────────────────────────────────────────────
const GEN_MIN = 1
const GEN_MAX = 45
const SET_SIZE = 3
const SETS_PER_GROUP = 10
const GROUP_PREFIX = 'Generated Set'
const MAX_DRAW_ATTEMPTS = 10_000

// ── Set helpers ───────────────────────────────────────────
// Every set across all groups, optionally skipping one set (the one being edited).
function usedKeys(sets, skip) {
  const keys = new Set()
  for (const [group, list] of Object.entries(sets)) {
    ;(list || []).forEach((set, i) => {
      if (skip && skip.group === group && skip.index === i) return
      keys.add(setKey(set))
    })
  }
  return keys
}

function randomSet() {
  const nums = new Set()
  while (nums.size < SET_SIZE) {
    nums.add(GEN_MIN + Math.floor(Math.random() * (GEN_MAX - GEN_MIN + 1)))
  }
  return [...nums].sort((a, b) => a - b)
}

// Draws a set not already in `used`, and adds it to `used`.
function uniqueRandomSet(used) {
  for (let attempt = 0; attempt < MAX_DRAW_ATTEMPTS; attempt += 1) {
    const set = randomSet()
    const key = setKey(set)
    if (!used.has(key)) {
      used.add(key)
      return set
    }
  }
  throw new Error('Could not find an unused set, too many 3-number sets already exist')
}

function parseGeneratedInput(text) {
  const nums = text
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number)
  if (nums.length !== SET_SIZE) throw new Error('A generated set must contain exactly 3 numbers')
  if (nums.some((n) => !Number.isInteger(n) || n < GEN_MIN || n > GEN_MAX)) {
    throw new Error(`Numbers must be integers from ${GEN_MIN} to ${GEN_MAX}`)
  }
  if (new Set(nums).size !== SET_SIZE) throw new Error('A set cannot contain duplicate numbers')
  return nums.sort((a, b) => a - b)
}

function nextGroupName(sets) {
  let n = 1
  while (Object.hasOwn(sets, `${GROUP_PREFIX} ${n}`)) n += 1
  return `${GROUP_PREFIX} ${n}`
}

// ── Component ─────────────────────────────────────────────
export default function GenerateSetView({ draft: setsDraft }) {
  const { draft, dirty, saving, status, update, fail, save, renameGroup, deleteGroup } = setsDraft
  const [editing, setEditing] = useState(null)
  const [editValue, setEditValue] = useState('')

  const run = (fn) => {
    try {
      fn()
    } catch (e) {
      fail(e.message)
    }
  }

  const generateGroup = () =>
    run(() => {
      const used = usedKeys(draft)
      const list = Array.from({ length: SETS_PER_GROUP }, () => uniqueRandomSet(used))
      update({ ...draft, [nextGroupName(draft)]: list })
    })

  const fillGroup = (group) =>
    run(() => {
      const used = usedKeys(draft)
      const list = [...draft[group]]
      while (list.length < SETS_PER_GROUP) list.push(uniqueRandomSet(used))
      update({ ...draft, [group]: list })
    })

  const rerollSet = (group, index) =>
    run(() => {
      const used = usedKeys(draft)
      const list = [...draft[group]]
      list[index] = uniqueRandomSet(used)
      update({ ...draft, [group]: list })
    })

  const startEdit = (group, index) => {
    setEditing({ group, index })
    setEditValue(draft[group][index].join(', '))
  }

  const commitEdit = () =>
    run(() => {
      const { group, index } = editing
      const nums = parseGeneratedInput(editValue)
      if (usedKeys(draft, { group, index }).has(setKey(nums))) {
        throw new Error(`${nums.join(', ')} already exists in another set`)
      }
      const list = [...draft[group]]
      list[index] = nums
      update({ ...draft, [group]: list })
      setEditing(null)
    })

  const deleteSet = (group, index) => {
    update({ ...draft, [group]: draft[group].filter((_, i) => i !== index) })
    setEditing(null)
  }

  const groups = Object.entries(draft).filter(([name]) => name.startsWith(GROUP_PREFIX))

  return (
    <section>
      <div className="view-head">
        <h2>Generate sets</h2>
        <p>
          Generate groups of {SETS_PER_GROUP} random 3-number sets ({GEN_MIN}–{GEN_MAX}). No set
          repeats a set in any group. Groups named “{GROUP_PREFIX} …” appear here and in Set
          Manager; renaming without that prefix moves a group to Set Manager only. Saving writes
          them to the data file.
        </p>
      </div>

      <div className="manager-toolbar">
        <button className="btn-secondary" onClick={generateGroup} type="button">
          Generate group
        </button>
        <button className="refresh-btn" onClick={save} disabled={saving || !dirty} type="button">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <StatusMessage status={status} />

      {groups.length === 0 && (
        <p className="empty">No generated groups yet. Click “Generate group” to create one.</p>
      )}

      {groups.map(([name, list]) => (
        <div key={name} className="glass card">
          <GroupHeader name={name} count={list.length} onRename={renameGroup} onDelete={deleteGroup}>
            {list.length < SETS_PER_GROUP && (
              <button className="btn-secondary" onClick={() => fillGroup(name)} type="button">
                Fill to {SETS_PER_GROUP}
              </button>
            )}
          </GroupHeader>

          {list.length === 0 ? (
            <p className="empty">No sets in this group.</p>
          ) : (
            <div className="manager-set-list">
              {list.map((set, i) =>
                editing && editing.group === name && editing.index === i ? (
                  <div key={setKey(set)} className="manager-set-row">
                    <input
                      type="text"
                      className="gen-set-input"
                      value={editValue}
                      autoFocus
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit()
                        if (e.key === 'Escape') setEditing(null)
                      }}
                      aria-label={`Edit set ${i + 1} in ${name}`}
                    />
                    <button className="btn-secondary" onClick={commitEdit} type="button">
                      Done
                    </button>
                    <button className="btn-secondary" onClick={() => setEditing(null)} type="button">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div key={setKey(set)} className="manager-set-row">
                    <span className="chips gen-set-chips">
                      {set.map((n) => (
                        <span key={n} className="chip">
                          {n}
                        </span>
                      ))}
                    </span>
                    <button className="btn-secondary" onClick={() => startEdit(name, i)} type="button">
                      Edit
                    </button>
                    <button className="btn-secondary" onClick={() => rerollSet(name, i)} type="button">
                      Re-roll
                    </button>
                    <button className="btn-danger" onClick={() => deleteSet(name, i)} type="button">
                      Remove
                    </button>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
