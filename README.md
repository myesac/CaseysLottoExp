# Casey's Lotto Experiment

A dark glass-styled React web app that lists Irish Lotto draw history and finds 3- and 4-number matches against user-defined number sets.

## Features

- **Refresh** — a *Refresh* button reads the latest draws from `lottery.ie` and appends only new draws to the history; the header shows when the data was last updated.
- **Date selector** — choose the start date for the history review (defaults to 1 July 2026, and cannot go earlier).
- **Game filter** — filter every view by Lotto, Lotto Plus 1, or Lotto Plus 2.
- **Six views** — Draws, Matches, Frequency, Statistics, Set Manager, and Generate Set.
- **Number-set manager** — add, rename, and remove groups and sets in the UI; changes persist via `POST /api/sets`.
- **Set generator** — create groups of 10 random 3-number sets (1–45), then edit, re-roll, or remove them. No set may appear twice anywhere; the server enforces this too.
- **Phone layout** — at 640px and below: a compact header with a Refresh icon, a sticky date/game filter row, and a bottom tab bar (Draws, Matches, Frequency, Stats, Sets; Sets switches between Manage and Generate).
- **Shareable views** — the active view and filters are kept in the URL hash, so they can be bookmarked and shared.
- **Branding** — an "MKC" SVG logo used as the favicon, with matching PNG favicon and Apple touch icon.

## Architecture

### Tech stack

| Layer | Choice |
| --- | --- |
| UI framework | React 18 |
| Build tool | Vite 8 |
| Tests / lint | Vitest (`npm run test`), ESLint with react-hooks and security plugins (`npm run lint`) |
| Styling | Plain CSS (glassmorphism) + Recharts for charts |
| Data | Loaded at runtime from `/api/data`; Cloudflare uses persistent Workers KV storage, while local development writes to the JSON files in `data/` |
| State | React `useState` / `useMemo` with lightweight hash-based routing |

### High-level data flow

```
lottery.ie (official draw history)
        │
        ▼  POST /api/refresh  (merges only new draws)
        ┌──────────────────────────┐
        │ Local: Vite middleware   │ ──► data/*.json
        │ Cloudflare: Worker +     │
        │ Workers KV               │ ──► persistent hosted data
        └──────────────────────────┘
        │ GET /api/data
        │ POST /api/sets
        ▼
   App.jsx (loads data, view + date + game state in the URL hash)
        │
        ▼
   src/data.js ──► derived data (matches, frequency, stats)
        │
        ▼
   ActualsView · MatchesView · StatsView · FrequencyView · SetManagerView · GenerateSetView
```

- The local Vite middleware and Cloudflare Worker expose the same endpoints: `GET /api/data`, `POST /api/refresh`, and `POST /api/sets`. On Cloudflare, the files in `data/` are bundled as the initial data and copied into the `LOTTO_DATA` KV namespace on first use. Later refreshes and set changes update the hosted store and survive deploys; they do not write back to the repository.
- Writes require the admin password, both hosted (the `ADMIN_PASSWORD` secret) and locally (`ADMIN_PASSWORD` in `.dev.vars`). The app asks for it in a masked dialog when an admin refreshes or saves number sets. Reads remain public.
- `POST /api/sets` accepts only `application/json` bodies up to 100 KB. Hosted admin requests are rate limited to 10 per minute per IP (the `ADMIN_LIMITER` binding).
- `useLottoData.js` fetches `/api/data` and provides refresh and save; `routing.js` keeps the **view**, **start-date**, and **game-filter** state in the URL hash (`#/view?game=…&from=…`).
- `useSetsDraft.js` holds unsaved number-set edits in `App`, shared by Set Manager and Generate Set, so switching tabs keeps them and closing the page with unsaved changes asks first.
- `src/data.js` is a set of pure helpers that derive matches, frequency, and statistics from the loaded data. View components render what they are given.

### Project structure

```
CaseysLottoExp/
├── data/
│   ├── number_history.json   # Draw results: { date, game, numbers[6], bonus }
│   └── numberSets.json       # Named groups of 3- and 4-number sets
├── images/
│   └── TheBailey.jpeg        # Original logo source
├── public/
│   ├── _headers              # Cloudflare security headers (CSP etc.)
│   ├── apple-touch-icon.png  # 180×180 iOS home-screen icon (rendered from the logo)
│   ├── favicon.png           # 32×32 PNG favicon (rendered from the logo)
│   └── logo.svg              # MKC logo, also the SVG favicon
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Layout, tabs, date + game filters
│   ├── routing.js            # Hash routing
│   ├── useLottoData.js       # Load, refresh, and save data
│   ├── useSetsDraft.js       # Unsaved number-set edits
│   ├── adminApi.js           # Admin password dialog + authorised fetch
│   ├── data.js               # Pure data-derivation helpers
│   ├── chartTheme.js         # Shared Recharts styling
│   ├── useMediaQuery.js      # Media query hook
│   ├── index.css             # Dark glass styling
│   └── components/
│       ├── ActualsView.jsx   # Draw listing
│       ├── MatchesView.jsx   # Per-set hit history with filters
│       ├── StatsView.jsx     # Aggregate statistics + charts
│       ├── FrequencyView.jsx # Number frequency histogram + hot/cold
│       ├── SetManagerView.jsx# Add/rename/remove groups and sets
│       ├── GenerateSetView.jsx # Generate random 3-number set groups
│       ├── GroupHeader.jsx   # Group title with rename/delete
│       ├── StatusMessage.jsx # Success/error banner
│       ├── FilterControls.jsx# Date-from + game filters
│       ├── MultiSelect.jsx   # Checkbox dropdown (Matches group filter)
│       ├── BottomNav.jsx     # Phone bottom tab bar + Sets switch
│       ├── Icon.jsx          # Inline SVG icons
│       ├── Ball.jsx          # Reusable number ball
│       └── StatCard.jsx      # Reusable stat card
├── tests/                    # Vitest tests (shared module, data helpers, Worker)
├── index.html
├── vite.config.js            # Local API middleware
├── eslint.config.js          # Lint rules
├── server/lottery.js         # Shared parsing, merging, validation, and auth
├── worker/index.js           # Hosted API (Cloudflare Worker), backed by Workers KV
├── wrangler.jsonc            # Cloudflare Worker, static assets, and KV settings
└── package.json
```

### Data model

`data/number_history.json` — one object per draw:

```json
{
  "date": "2026-09-02",
  "game": "lotto",
  "numbers": [2, 13, 37, 38, 41, 46],
  "bonus": 18
}
```

`data/numberSets.json` — an object keyed by group name, each holding an array of sets:

```json
{
  "Current 3 Set 1": [[2, 9, 10], [2, 9, 21], [2, 9, 27]]
}
```

### Matching logic

A number set **matches** a draw when **every number in the set appears in the draw's 6 main numbers** (full match).

- The bonus ball is excluded.
- A set with 3 numbers is a **3-number match**; a set with 4 numbers is a **4-number match**.
- Every set in every group is checked against every draw of every game.

### Views

| View | Purpose |
| --- | --- |
| **Draws** | Lists every draw (date and 6 main balls), grouped by game. |
| **Matches** | Per-set hit history — hits and hit dates, filterable by set size and by one or more groups (multi-select; none selected shows all). |
| **Frequency** | Per-number appearance histogram with hottest/coldest numbers. |
| **Statistics** | Totals, hit rate, and breakdowns by set size, group, and game, with charts. |
| **Set Manager** | Add, rename, and remove groups and number sets; saved to the active data store. |
| **Generate Set** | Generate groups of 10 unique random 3-number sets; edit, re-roll, or remove sets. Groups named "Generated Set …" appear here. |

A global **game filter** (All / Lotto / Lotto Plus 1 / Lotto Plus 2) applies to every view. It sits in the header on desktop and in the sticky filter row on phones.

### Design

Dark glassmorphism styling in `src/index.css`:

- Deep gradient background with subtle radial color glows.
- Translucent cards with `backdrop-filter: blur()` and soft borders.
- Cyan/violet gradient accents for titles, active tabs, and key metrics.
- Circular "ball" components with gradient fills and inner shadows.

## Getting started

```powershell
# install dependencies
npm install

# run the dev server
npm run dev

# run tests and lint
npm run test
npm run lint
```

Then open the URL printed by Vite (default `http://localhost:5173`). To refresh or save locally, put `ADMIN_PASSWORD=...` in a `.dev.vars` file (gitignored); without it, local writes return 503.

Production build:

```powershell
npm run build
npm run preview
```

> Note: on this machine `npm.ps1` is blocked by PowerShell execution policy, so use `npm.cmd` instead of `npm` when running from PowerShell.

## Deploying to Cloudflare

The site runs as a Cloudflare Worker with static assets: `dist/` is served directly and `/api/*` is handled by `worker/index.js`.

1. Log in with `npx wrangler login`.
2. Create the KV namespace with `npx wrangler kv namespace create LOTTO_DATA` and put the printed `id` in `wrangler.jsonc`.
3. Set the admin password with `npx wrangler secret put ADMIN_PASSWORD`. Do not use a `VITE_` prefix or put it in source; this password must remain server-side.
4. Deploy with `npm run build` then `npx wrangler deploy`. On its first API request, the Worker seeds KV from `data/number_history.json` and `data/numberSets.json`.
5. Use **Refresh** to add new draws and **Set Manager → Save changes** to update number sets. Enter the admin password when prompted. These updates persist across future deploys.

To test the Worker locally, put `ADMIN_PASSWORD=...` in a `.dev.vars` file (gitignored), then run `npm run build` and `npx wrangler dev`.

### Deploying a change

Run these from the project folder each time you change the app and want to publish it. (Use `npm.cmd` / `npx.cmd` in PowerShell — see the note above.)

1. **Test locally** — `npm.cmd run test` and `npm.cmd run lint`, then `npm.cmd run dev`, check the change at `http://localhost:5173`, and press Ctrl+C.
2. **Build** — `npm.cmd run build`. Always rebuild first; `wrangler deploy` uploads whatever is in `dist/`.
3. **Optional: test the Worker** — if you changed `worker/index.js` or `server/lottery.js`, run `npx.cmd wrangler dev` and try loading data, **Refresh**, and saving a set. Requires `.dev.vars`.
4. **Deploy** — `npx.cmd wrangler deploy`. It prints the live URL when done.
5. **Verify** — open the live site, press Ctrl+F5 to skip the browser cache, and check the change.
6. **Commit** — `git add -A`, `git commit -m "Describe the change"`, `git push`.

**Shortcut:** `npm.cmd run deploy` runs steps 2 and 4 together (`vite build && wrangler deploy`), so a typical release is: test locally, `npm.cmd run deploy`, verify, commit.

Deploying does not touch the hosted draw history or number sets, and `ADMIN_PASSWORD` persists between deploys — re-run `wrangler secret put` only to change it.

The hosted JSON is stored in Workers KV rather than as editable files in the static `dist` directory. The checked-in files in `data/` are the initial seed only; once seeded, changing those files and redeploying will not overwrite the hosted data.

## Data source

Draw history in `data/number_history.json` comes from the official Irish National Lottery results (`lottery.ie`). In local development, the API reads and updates this file; on Cloudflare, it provides the initial seed for persistent hosted storage.
