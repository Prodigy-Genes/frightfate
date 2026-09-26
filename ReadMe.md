## Project structure

frightfate-game/
├── frontend/                 # Next.js (App Router) + TypeScript + Tailwind
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx    # Root layout (imports globals.css)
│   │   │   ├── page.tsx      # Composes the screens + boots the game
│   │   │   └── globals.css   # Tailwind theme + state classes
│   │   ├── components/
│   │   │   ├── AiStatusBadge.tsx     # Tiny "model is working" indicator
│   │   │   ├── AudioHud.tsx          # Fixed audio controls
│   │   │   ├── BackgroundEffects.tsx # Fog, vignette + themed ghost glyph
│   │   │   ├── GameTitle.tsx
│   │   │   ├── ScreenHead.tsx        # Per-screen themed banner
│   │   │   ├── ThemeSelector.tsx     # Themed world portal cards
│   │   │   └── screens/              # Home / Join / Lobby / Game / Elimination / Results / Leaderboard
│   ├── public/
│   │   └── icon.svg         # Spooky skull favicon
│   │   └── lib/
│   │       ├── audio.ts      # Procedural WebAudio sound engine
│   │       ├── aiStatus.ts   # Observable AI-activity store
│   │       ├── types.ts      # Shared domain types
│   │       ├── time.ts       # Timing + adaptive time limits
│   │       ├── validation.ts # Answer validation
│   │       ├── themes.ts     # Per-theme design system (palette/fonts/icon/score)
│   │       ├── dom.ts        # Typed DOM helpers
│   │       └── game/         # Game controller, split by concern
│   │           ├── index.ts        # initGame() entrypoint
│   │           ├── controller.ts   # FrightFateGame composition + listeners
│   │           ├── session.ts      # Create/join/lobby
│   │           ├── round.ts        # Scenario + answer flow
│   │           ├── results.ts      # Elimination + results
│   │           ├── overlays.ts     # Loading + score reveal
│   │           ├── socket.ts       # WebSocket
│   │           ├── timer.ts        # Question countdown
│   │           ├── leaderboard.ts  # High-score table + theme tabs
│   │           ├── ui.ts           # Screens/notifications
│   │           ├── api.ts          # REST client
│   │           ├── state.ts        # GameState
│   │           ├── templates.ts    # Overlay HTML builders
│   │           ├── content.ts      # Static content + keywords
│   │           └── timers.ts       # Tracked timer teardown
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app
│   │   ├── models/          # SQLAlchemy models (incl. leaderboard_entries)
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── database.py      # DB connection
│   ├── alembic/             # DB migrations
│   ├── requirements.txt
│   └── .env
└── README.md

## Quick Start

You can start both the backend and frontend together with a single command using **Bun**:

```bash
# From project root:
bun run dev

# Or from inside the frontend directory:
cd frontend
bun run dev
```

This starts:
- **FastAPI backend**: `http://127.0.0.1:8000` (auto-started if not already running)
- **Next.js frontend**: `http://localhost:5173`

> The frontend calls the backend at `http://localhost:8000` while running on port
> 5173. Override with `NEXT_PUBLIC_API_BASE_URL` for other environments.

## Themed worlds

Each of the five worlds (`haunted_house`, `zombie_outbreak`, `slasher_movie`,
`alien_invasion`, `deep_sea_terror`) ships its own visual identity **and** its own
procedural soundtrack:

- **Palette & backdrop** — accent colour, surface, borders and background gradient
  are pushed onto `<html>` as CSS custom properties by `applyTheme()`, so switching
  a world restyles the whole app instantly (no React re-render).
- **Type** — each world has a display + body font stack (Creepster, Special Elite,
  Metal Mania, Orbitron, Cinzel Decorative) loaded with graceful fallbacks.
- **Icon** — each world has an emblem used on its portal card and as the huge
  ghost glyph behind the UI.
- **Soundtrack** — `playThemeAmbience()` cross-fades a distinct WebAudio drone per
  world (organ dirge, quarantine hum, stalker pulse, FM drone, pressure sonar).

## Leaderboard

No accounts are required. When a session's final results are generated, each
player's name, world, score and fate are written to a `leaderboard_entries` table.

```
GET /api/game/leaderboard?theme=<theme_id>&limit=25
```

Returns ranked entries (`rank`, `player_name`, `theme`, `score`, `survived`,
`eliminated_at`). Omit `theme` (or pass `all`) for the global board.

## AI narration

The model does more than write scenery — it runs a persistent simulation and
speaks as a **world-specific host**.

- **Host personas** — every piece of feedback (analysis, verdicts, death scenes,
  elimination notifications, even the loading-screen tips) is delivered in the
  voice of the selected world: Madame Vesper (haunted house), QUARANTINE-9
  (zombie outbreak), The Counselor (slasher), THE COLLECTIVE (alien), and
  HADAL-STATION (deep sea).
- **Antagonist doctrine** — each world has hard rules (the infected track sound;
  the killer cuts the power first; the station floods compartment by compartment)
  so the threat behaves consistently instead of arbitrarily.
- **World-state ledger** — every scenario returns a `world_state` object
  (location, threat proximity/awareness, noise level, injuries, inventory, blocked
  routes). The client echoes it back with the next scenario request, so injuries
  and dead ends genuinely persist across all three rounds.
- **Calibrated scoring** — the analyser receives the player's score history with
  explicit calibration anchors, so an equally good decision scores equally well
  instead of drifting.
- **In-character feedback fields** — responses include `host_verdict` (a one-line
  quip in the host's voice) and `death_epitaph`, surfaced in the score-reveal card
  and the elimination screen.
- **Honest telemetry** — every AI-backed response carries an `engine` field
  (`"ai"` or `"fallback"`). The subtle badge in the bottom-left corner shows
  *Fate Engine · AI* when the model answered, *Fate Engine · Scripted* when the
  offline writer did, and pulses while a request is in flight.
