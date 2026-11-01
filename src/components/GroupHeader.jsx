// ----------------------------------------------------------------------------------
//  Name:    GroupHeader.jsx
//  Author:  Mark Casey
//
//  Purpose: Number-set group title with inline rename and delete, shared by
//           Set Manager and Generate Set. Extra actions go in `children`.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useState } from 'react'

// ── Component ─────────────────────────────────────────────
export default function GroupHeader({ name, count, onRename, onDelete, children }) {
  const [renaming, setRenaming] = useState(false)
  const [value, setValue] = useState(name)

  const commit = () => {
    setRenaming(false)
    onRename(name, value)
  }

  return (
    <div className="manager-group-head">
      {renaming ? (
        <input
          className="manager-rename"
          value={value}
          autoFocus
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setRenaming(false)
          }}
          aria-label="Rename group"
        />
      ) : (
        <h3 className="card-title manager-group-title">
          {name} <span className="muted">· {count} sets</span>
        </h3>
      )}
      <div className="manager-group-actions">
        {children}
        <button
          className="btn-secondary"
          onClick={() => {
            setValue(name)
            setRenaming(true)
          }}
          type="button"
        >
          Rename
        </button>
        <button className="btn-danger" onClick={() => onDelete(name)} type="button">
          Delete group
        </button>
      </div>
    </div>
  )
}
