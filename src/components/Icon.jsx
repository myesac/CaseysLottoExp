// ----------------------------------------------------------------------------------
//  Name:    Icon.jsx
//  Author:  Mark Casey
//
//  Purpose: Inline stroke icons for the phone navigation and buttons.
//           Decorative only (aria-hidden); the surrounding control has the label.
// ----------------------------------------------------------------------------------

// ── Constants ─────────────────────────────────────────────
const PATHS = {
  draws: (
    <>
      <circle cx="7" cy="15" r="4" />
      <circle cx="17" cy="15" r="4" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  matches: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16.2 9.6" />
    </>
  ),
  frequency: <path d="M5 20v-8M10 20V5M15 20v-6M20 20V9" />,
  stats: (
    <>
      <path d="M11 4a8 8 0 1 0 9 9h-9z" />
      <path d="M14 3.2A8 8 0 0 1 20.8 10H14z" />
    </>
  ),
  sets: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 0 1-14.2 5" />
      <path d="M4 12a8 8 0 0 1 14.2-5" />
      <path d="M18.5 3v4h-4M5.5 21v-4h4" />
    </>
  ),
}

// ── Component ─────────────────────────────────────────────
export default function Icon({ name, size = 22 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
