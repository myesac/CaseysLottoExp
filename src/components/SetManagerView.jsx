// ----------------------------------------------------------------------------------
//  Name:    SetManagerView.jsx
//  Author:  Mark Casey
//
//  Purpose: Set Manager view: add, rename and remove number-set groups.
//           Edits a draft shared with Generate Set (see useSetsDraft.js).
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useState } from 'react'
import { BALL_MAX, BALL_MIN, groupNameError, setKey } from '../data.js'
import GroupHeader from './GroupHeader.jsx'
import StatusMessage from './StatusMessage.jsx'

// ── Parsing ───────────────────────────────────────────────
function parseSetInput(text) {
  const nums = text
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number)
  if (nums.length !== 3 && nums.length !== 4) {
    throw new Error('A set must contain 3 or 4 numbers')
  }
  if (nums.some((n) => !Number.isInteger(n) || n < BALL_MIN || n > BALL_MAX)) {
    throw new Error(`Numbers must be integers from ${BALL_MIN} to ${BALL_MAX}`)
  }
  if (new Set(nums).size !== nums.length) {
    throw new Error('A set cannot contain duplicate numbers')
  }
  return nums.sort((a, b) => a - b)
}

function findSet(sets, key) {
  for (const [group, list] of Object.entries(sets)) {
    if (list.some((set) => setKey(set) === key)) return group
  }
  return null
}

// ── Component ─────────────────────────────────────────────
export default function SetManagerView({ draft: setsDraft }) {
  const { draft, dirty, saving, status, update, fail, save, renameGroup, deleteGroup } = setsDraft
  const [newGroup, setNewGroup] = useState('')
  const [addInputs, setAddInputs] = useState({})

  const addGroup = () => {
    const name = newGroup.trim()
    if (!name) return
    const nameError = groupNameError(name)
    if (nameError) {
      fail(nameError)
      return
    }
    if (Object.hasOwn(draft, name)) {
      fail('A group with that name already exists')
      return
    }
    update({ ...draft, [name]: [] })
    setNewGroup('')
  }

  const addSet = (group) => {
    const text = (addInputs[group] || '').trim()
    if (!text) return
    try {
      const nums = parseSetInput(text)
      const existing = findSet(draft, setKey(nums))
      if (existing) throw new Error(`${nums.join(', ')} is already in "${existing}"`)
      update({ ...draft, [group]: [...(draft[group] || []), nums] })
      setAddInputs({ ...addInputs, [group]: '' })
    } catch (e) {
      fail(e.message)
    }
  }

  const deleteSet = (group, index) => {
    update({ ...draft, [group]: draft[group].filter((_, i) => i !== index) })
  }

  const groups = Object.entries(draft)

  return (
    <section>
      <div className="view-head">
        <h2>Number set manager</h2>
        <p>Add, rename, and remove groups and number sets. Saving writes to the data file.</p>
      </div>

      <div className="manager-toolbar">
        <div className="manager-add-group">
          <input
            type="text"
            value={newGroup}
            placeholder="New group name"
            onChange={(e) => setNewGroup(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addGroup()
            }}
          />
          <button className="btn-secondary" onClick={addGroup} type="button">
            Add group
          </button>
        </div>
        <button className="refresh-btn" onClick={save} disabled={saving || !dirty} type="button">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <StatusMessage status={status} />

      {groups.length === 0 && <p className="empty">No groups yet. Add a group to get started.</p>}

      {groups.map(([name, list]) => (
        <div key={name} className="glass card">
          <GroupHeader name={name} count={list.length} onRename={renameGroup} onDelete={deleteGroup} />

          {list.length === 0 ? (
            <p className="empty">No sets in this group yet.</p>
          ) : (
            <div className="manager-set-list">
              {list.map((set, i) => (
                <div key={setKey(set)} className="manager-set-row">
                  <span className="chips">
                    {set.map((n) => (
                      <span key={n} className="chip">
                        {n}
                      </span>
                    ))}
                  </span>
                  <span className="muted">{set.length} numbers</span>
                  <button className="btn-danger" onClick={() => deleteSet(name, i)} type="button">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="manager-add-set">
            <input
              type="text"
              value={addInputs[name] || ''}
              placeholder="e.g. 2, 9, 10, 21"
              onChange={(e) => setAddInputs({ ...addInputs, [name]: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addSet(name)
              }}
              aria-label={`Add set to ${name}`}
            />
            <button className="btn-secondary" onClick={() => addSet(name)} type="button">
              Add set
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
