import { useEffect, useState } from 'react'

const BALL_MIN = 1
const BALL_MAX = 47

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

export default function SetManagerView({ sets = {}, onSave }) {
  const [draft, setDraft] = useState({})
  const [newGroup, setNewGroup] = useState('')
  const [addInputs, setAddInputs] = useState({})
  const [renaming, setRenaming] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    setDraft(sets || {})
    setAddInputs({})
    setRenaming(null)
    setError(null)
    setSuccess(null)
  }, [sets])

  const dirty = JSON.stringify(draft) !== JSON.stringify(sets || {})

  const update = (next) => {
    setDraft(next)
    setSuccess(null)
    setError(null)
  }

  const addGroup = () => {
    const name = newGroup.trim()
    if (!name) return
    if (Object.prototype.hasOwnProperty.call(draft, name)) {
      setError('A group with that name already exists')
      return
    }
    update({ ...draft, [name]: [] })
    setNewGroup('')
  }

  const renameGroup = (oldName, newNameRaw) => {
    const newName = newNameRaw.trim()
    if (!newName || newName === oldName) return
    if (Object.prototype.hasOwnProperty.call(draft, newName)) {
      setError('A group with that name already exists')
      return
    }
    const next = {}
    for (const [k, v] of Object.entries(draft)) {
      next[k === oldName ? newName : k] = v
    }
    update(next)
  }

  const deleteGroup = (name) => {
    const next = { ...draft }
    delete next[name]
    update(next)
  }

  const addSet = (group) => {
    const text = (addInputs[group] || '').trim()
    if (!text) return
    try {
      const nums = parseSetInput(text)
      update({ ...draft, [group]: [...(draft[group] || []), nums] })
      setAddInputs({ ...addInputs, [group]: '' })
    } catch (e) {
      setError(e.message)
    }
  }

  const deleteSet = (group, index) => {
    const next = { ...draft }
    next[group] = (next[group] || []).filter((_, i) => i !== index)
    update(next)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await onSave(draft)
      setSuccess('Changes saved')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const startRename = (group) => {
    setRenaming(group)
    setRenameValue(group)
  }

  const commitRename = (group) => {
    renameGroup(group, renameValue)
    setRenaming(null)
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

      {(error || success) && (
        <div className={`refresh-status ${error ? 'error' : ''}`} role="status">
          {error || success}
        </div>
      )}

      {groups.length === 0 && <p className="empty">No groups yet. Add a group to get started.</p>}

      {groups.map(([name, list]) => (
        <div key={name} className="glass card">
          <div className="manager-group-head">
            {renaming === name ? (
              <input
                className="manager-rename"
                value={renameValue}
                autoFocus
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(name)
                  if (e.key === 'Escape') setRenaming(null)
                }}
                aria-label="Rename group"
              />
            ) : (
              <h3 className="card-title manager-group-title">
                {name} <span className="muted">· {list.length} sets</span>
              </h3>
            )}
            <div className="manager-group-actions">
              <button className="btn-secondary" onClick={() => startRename(name)} type="button">
                Rename
              </button>
              <button className="btn-danger" onClick={() => deleteGroup(name)} type="button">
                Delete group
              </button>
            </div>
          </div>

          {list.length === 0 ? (
            <p className="empty">No sets in this group yet.</p>
          ) : (
            <div className="manager-set-list">
              {list.map((set, i) => (
                <div key={i} className="manager-set-row">
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
