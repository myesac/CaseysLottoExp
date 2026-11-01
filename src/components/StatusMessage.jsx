// ----------------------------------------------------------------------------------
//  Name:    StatusMessage.jsx
//  Author:  Mark Casey
//
//  Purpose: Success or error banner for a { message, error } status object.
//           Optional children (such as a Retry button) render after the text.
// ----------------------------------------------------------------------------------

// ── Component ─────────────────────────────────────────────
export default function StatusMessage({ status, children }) {
  if (!status) return null

  return (
    <div className={`refresh-status ${status.error ? 'error' : ''}`} role="status">
      <span>{status.message}</span>
      {children}
    </div>
  )
}
