// ----------------------------------------------------------------------------------
//  Name:    useMediaQuery.js
//  Author:  Mark Casey
//
//  Purpose: React hook that tracks a CSS media query.
//
//  Exported API:
//   • MOBILE_QUERY             → media query string
//   • default useMediaQuery()  → boolean
// ----------------------------------------------------------------------------------

import { useEffect, useState } from 'react'

// Keep in sync with the mobile breakpoint in index.css
export const MOBILE_QUERY = '(max-width: 640px)'

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
