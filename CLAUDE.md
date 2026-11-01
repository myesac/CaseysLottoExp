# CLAUDE.md

React 18 + Vite 8 app showing Irish Lotto draw history and 3/4-number matches against user-defined sets. See README.md for features and the front-end architecture.

## API

Three endpoints, implemented in two places that must stay in sync:

- `GET /api/data` — public read of history + number sets
- `POST /api/refresh` — scrapes lottery.ie and merges only new draws (admin)
- `POST /api/sets` — replaces number sets (admin)

| Environment | Implementation | Storage |
| --- | --- | --- |
| Local `npm run dev` / `preview` | Vite middleware in `vite.config.js` | `data/*.json` on disk |
| Cloudflare (hosted) | `worker/index.js` | KV namespace bound as `LOTTO_DATA` |

Shared logic lives in `server/lottery.js`: parsing, the lottery.ie fetch, validation (including no duplicate sets across groups), and `checkAdminAuth`. Keep it free of Node APIs so it runs in Workers. On Cloudflare, `data/*.json` is bundled as seed data and copied into storage on first read; later writes never go back to the repo.

Admin writes require a `Bearer` token equal to `ADMIN_PASSWORD`, in both environments: the Worker reads the secret, the Vite middleware reads `.dev.vars`. `src/adminApi.js` asks for it in a masked dialog and keeps it in `sessionStorage`. `POST /api/sets` requires `Content-Type: application/json` and a body of 100 KB or less.

Run `npm run test` (Vitest, `tests/`) and `npm run lint` (ESLint) before deploying. `tests/worker.test.js` exercises the Worker with fake KV and rate-limit bindings.

## Cloudflare hosting

A Worker with static assets: `dist/` is served via the `ASSETS` binding, and `/api/*` runs the Worker first (`wrangler.jsonc`). No `nodejs_compat` flag — the Worker uses Web APIs only (`crypto.subtle.digest`, `TextEncoder`). Admin POSTs are rate limited per IP by the `ADMIN_LIMITER` binding; page security headers come from `public/_headers`.

- Local Worker test: put `ADMIN_PASSWORD=...` in `.dev.vars` (gitignored), then `npm run build && npx wrangler dev`
- Deploy: `npm run build && npx wrangler deploy`
- Set the password: `npx wrangler secret put ADMIN_PASSWORD`
- If `wrangler dev` fails on `workerd`, its postinstall was blocked: `npm install-scripts approve workerd && npm rebuild workerd`

Gotchas:
- KV is eventually consistent (up to ~60s across regions) and has no conditional writes; `getOrSeed` is a plain check-then-put. Fine for a single admin.
- lottery.ie may block requests from Cloudflare IPs — verify Refresh after deploying.
- `minimatch` is pinned to ^11 via `overrides` in `package.json` to clear an advisory in ESLint's dependency tree.
- Generated groups are recognised only by the "Generated Set" name prefix.
- The icon links in `index.html` carry a `?v=` query to bust cached favicons. If `public/logo.svg` changes, re-render `favicon.png` (32×32, transparent corners) and `apple-touch-icon.png` (180×180, opaque, square corners) and bump `?v=`.

## Front end notes

- Phone layout is driven by `useMediaQuery(MOBILE_QUERY)` (`src/useMediaQuery.js`, max-width 640px), with matching CSS in the 640px block of `src/index.css`. `MOBILE_TABS` in `src/routing.js` folds Set Manager and Generate Set into one "Sets" tab.
- The Matches group filter (`MultiSelect.jsx`) passes an array to `matchRowsByGroup(..., { groups })`; an empty array means all groups.
