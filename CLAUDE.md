# CLAUDE.md

React 18 + Vite 5 app showing Irish Lotto draw history and 3/4-number matches against user-defined sets. See README.md for features and the front-end architecture.

## API

Three endpoints, implemented in two places that must stay in sync:

- `GET /api/data` — public read of history + number sets
- `POST /api/refresh` — scrapes lottery.ie and merges only new draws (admin)
- `POST /api/sets` — replaces number sets (admin)

| Environment | Implementation | Storage |
| --- | --- | --- |
| Local `npm run dev` / `preview` | Vite middleware in `vite.config.js` | `data/*.json` on disk |
| Cloudflare (hosted) | `worker/index.js` | KV namespace bound as `LOTTO_DATA` |

Shared parsing/validation lives in `server/lottery.js` — keep it free of Node APIs so it runs in Workers. On Cloudflare, `data/*.json` is bundled as seed data and copied into storage on first read; later writes never go back to the repo.

Admin writes require a `Bearer` token equal to `ADMIN_PASSWORD`; `src/adminApi.js` prompts for it and keeps it in `sessionStorage`.

## Cloudflare hosting

A Worker with static assets: `dist/` is served via the `ASSETS` binding, and `/api/*` runs the Worker first (`wrangler.jsonc`). No `nodejs_compat` flag — the Worker uses Web APIs only (`crypto.subtle.timingSafeEqual`, `TextEncoder`).

- Local Worker test: put `ADMIN_PASSWORD=...` in `.dev.vars` (gitignored), then `npm run build && npx wrangler dev`
- Deploy: `npm run build && npx wrangler deploy`
- Set the password: `npx wrangler secret put ADMIN_PASSWORD`
- If `wrangler dev` fails on `workerd`, its postinstall was blocked: `npm install-scripts approve workerd && npm rebuild workerd`

Gotchas:
- KV is eventually consistent (up to ~60s across regions) and has no conditional writes; `getOrSeed` is a plain check-then-put. Fine for a single admin.
- lottery.ie may block requests from Cloudflare IPs — verify Refresh after deploying.

## Pending cleanup

Stop tracking `dist/` in git — it is a build output.
