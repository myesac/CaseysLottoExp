export default function Ball({ n, kind = 'main' }) {
  return <span className={`ball ${kind}`}>{n}</span>
}
