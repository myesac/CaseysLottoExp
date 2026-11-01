// ----------------------------------------------------------------------------------
//  Name:    MultiSelect.jsx
//  Author:  Mark Casey
//
//  Purpose: Dropdown filter with a checkbox per option. An empty selection means
//           "all"; ticking the "all" row clears the selection.
//           Closes on outside click or Escape.
// ----------------------------------------------------------------------------------

// ── Imports ───────────────────────────────────────────────
import { useEffect, useId, useRef, useState } from 'react'

// ── Component ─────────────────────────────────────────────
export default function MultiSelect({ label, options, selected, onChange, allLabel }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const labelId = useId()
  const triggerId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!rootRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Keep the selection in option order so the summary is stable.
  const toggle = (option) => {
    const next = selected.includes(option)
      ? selected.filter((o) => o !== option)
      : options.filter((o) => o === option || selected.includes(o))
    onChange(next)
  }

  const summary =
    selected.length === 0 ? allLabel : selected.length === 1 ? selected[0] : `${selected.length} selected`

  return (
    <div className="filter-field multi-select" ref={rootRef}>
      <span id={labelId}>{label}</span>
      <button
        ref={triggerRef}
        id={triggerId}
        className="multi-select-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${triggerId}`}
        onClick={() => setOpen(!open)}
        type="button"
      >
        {summary}
      </button>
      {open && (
        <div className="multi-select-panel" role="group" aria-labelledby={labelId}>
          <label className="multi-select-option">
            <input type="checkbox" checked={selected.length === 0} onChange={() => onChange([])} />
            <span>{allLabel}</span>
          </label>
          {options.map((option) => (
            <label key={option} className="multi-select-option">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
