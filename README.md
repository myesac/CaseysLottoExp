# Casey's Lotto Experiment

A dark glass-styled React web app that lists Irish Lotto draw history and finds 3- and 4-number matches against user-defined number sets.

## Features

- **Refresh** — a *Refresh* button reads the latest draws from `lottery.ie` and appends only new draws to `data/number_history.json`; the header shows when the data was last updated.
- **Date selector** — choose the start date for the history review (defaults to 1 July 2026, and cannot go earlier).
- **Game filter** — filter every view by Lotto, Lotto Plus 1, or Lotto Plus 2.
- **Five views** — Draws, Matches, Frequency, Statistics, and Set Manager.
- **Number-set manager** — add, rename, and remove groups and sets in the UI; changes persist to `data/numberSets.json` via `POST /api/sets`.
- **Shareable views** — the active view and filters are kept in the URL hash, so they can be bookmarked and shared.
- **Branding** — a generated SVG logo with a matching favicon.

## Architecture

### Tech stack

| Layer | Choice |
| --- | --- |
| UI framework | React 18 |
| Build tool | Vite 5 |
| Styling | Plain CSS (glassmorphism) + Recharts for charts |
| Data | Loaded at runtime from `/api/data`; refresh writes back to `data/number_history.json`; sets persisted via `POST /api/sets` |
| State | React `useState` / `useMemo` with lightweight hash-based routing |

### High-level data flow

```
lottery.ie (official draw history)
        │
        ▼  POST /api/refresh  (merges only new draws)
vite.config.js — API middleware
        │                        └──► writes data/number_history.json
        │  GET /api/data
        │  POST /api/sets ──────────► writes data/numberSets.json
        ▼
   App.jsx (loads data, view + date + game state in the URL hash)
        │
        ▼
   src/data.js ──► derived data (matches, frequency, stats)
        │
        ▼
   ActualsView · MatchesView · StatsView · FrequencyView · SetManagerView
```

- `vite.config.js` exposes three endpoints: `GET /api/data` (reads both JSON files plus the last-updated timestamp), `POST /api/refresh` (fetches the latest draws from `lottery.ie` and appends only new ones to `data/number_history.json`), and `POST /api/sets` (validates and writes `data/numberSets.json`).
- `App.jsx` fetches `/api/data` on load and after a refresh, then owns the **view**, **start-date**, and **game-filter** state via a lightweight hash router (`#/view?game=…&from=…`).
- `src/data.js` is a set of pure helpers that derive matches, frequency, and statistics from the loaded data.
- View components are pure renderers of the data handed to them.

### Project structure

```
Lotto-54321/
├── data/
│   ├── number_history.json   # Draw results: { date, game, numbers[6], bonus }
│   └── numberSets.json       # Named groups of 3- and 4-number sets
├── images/
│   └── TheBailey.jpeg        # Original logo source
├── public/
│   ├── favicon.png           # Generated 32×32 favicon
│   └── logo.svg              # Generated SVG logo
├── src/
│   ├── main.jsx              # React entry point
│   ├── App.jsx               # Layout, tabs, date + game filters, refresh
│   ├── data.js               # Pure data-derivation helpers
│   ├── index.css             # Dark glass styling
│   └── components/
│       ├── ActualsView.jsx   # Draw listing
│       ├── MatchesView.jsx   # Per-set hit history with filters
│       ├── StatsView.jsx     # Aggregate statistics + charts
│       ├── FrequencyView.jsx # Number frequency histogram + hot/cold
│       ├── SetManagerView.jsx# Add/rename/remove groups and sets
│       ├── Ball.jsx          # Reusable number ball
│       └── StatCard.jsx      # Reusable stat card
├── index.html
├── vite.config.js            # API middleware (/api/data, /api/refresh)
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
| **Matches** | Per-set hit history — hits and hit dates, filterable by set size and group. |
| **Frequency** | Per-number appearance histogram with hottest/coldest numbers. |
| **Statistics** | Totals, hit rate, and breakdowns by set size, group, and game, with charts. |
| **Set Manager** | Add, rename, and remove groups and number sets; saved to the data file. |

A global **game filter** (All / Lotto / Lotto Plus 1 / Lotto Plus 2) in the header applies to every view.

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
```

Then open the URL printed by Vite (default `http://localhost:5173`).

Production build:

```powershell
npm run build
npm run preview
```

> Note: on this machine `npm.ps1` is blocked by PowerShell execution policy, so use `npm.cmd` instead of `npm` when running from PowerShell.

## Data source

Draw history in `data/number_history.json` comes from the official Irish National Lottery results (`lottery.ie`). The app imports the JSON directly, so adding new draws to the file and refreshing the dev server automatically updates all views.
