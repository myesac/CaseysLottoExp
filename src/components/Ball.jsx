// ----------------------------------------------------------------------------------
//  Name:    Ball.jsx
//  Author:  Mark Casey
//
//  Purpose: Renders a single lottery ball.
// ----------------------------------------------------------------------------------

export default function Ball({ n, kind = 'main' }) {
  return <span className={`ball ${kind}`}>{n}</span>
}
