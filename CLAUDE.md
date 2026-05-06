# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **UI**: React 18, TypeScript, Tailwind CSS
- **Backend**: Convex (real-time backend with schema, mutations, and queries)
- **Auth**: Custom auth via Convex mutations with localStorage persistence

## Commands

```bash
npm run dev          # Start Next.js dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run Next.js linting
npx convex dev       # Start Convex backend (needed for full functionality)
```

## Architecture

### App Structure
- `app/` - Next.js App Router (layout.tsx, page.tsx, globals.css)
- `components/` - Client-side React components for game UI
- `hooks/` - Custom React hooks (useGameState manages all game logic)
- `lib/` - Pure utility functions (game logic, constants, types, bot AI, storage)
- `contexts/` - React contexts (AuthContext, ThemeContext)
- `convex/` - Backend functions (auth.ts, games.ts, stats.ts, schema.ts)

### Game State Management

All game state is managed through `hooks/useGameState.ts` which handles:
- Ship placement phase (setup)
- Battle phase with turn switching
- Bot AI integration for PvBot mode (bot is internally represented as player 2)
- Game persistence via localStorage (`lib/storage.ts`)
- Convex backend sync for authenticated users (game history, stats)
- Bot turns are managed reactively via a `pendingAction` state and `useEffect` to avoid setTimeout chain issues

### Game Flow

1. **Mode Selection** (`components/GameModeSelector.tsx`): Choose PvP or PvBot with difficulty
2. **Setup Phase**: Players place 5 ships (Carrier:5, Battleship:4, Cruiser:3, Submarine:3, Destroyer:2) on 10x10 grid
3. **Battle Phase**: In PvP, players alternate turns shooting. In PvBot, Player 1 shoots, then the bot (player 2) automatically takes its turn.
4. **Game Over**: When all ships of one player are sunk

### Key Types (`lib/types.ts`)

- `GameState` - Central state object with phase, players, current player, mode
- `Player` - Player data with grid, ships, shots, hits
- `Ship` - Ship definition with positions
- `CellState` - Grid cell state: "empty" | "ship" | "hit" | "miss" | "sunk"
- `GameMode` - "pvp" | "pvbot"
- `BotDifficulty` - "easy" | "medium" | "hard"

### Convex Backend

- `convex/schema.ts` - Defines users, profiles (stats), and games tables
- `convex/auth.ts` - Sign up/in mutations (stores password in plain text - dev only)
- `convex/games.ts` - Save game mutations
- `convex/stats.ts` - Update user stats mutations
- Generated types in `convex/_generated/`

### Bot AI (`lib/botAI.ts`)

Implements three difficulty levels with different targeting strategies. Bot shots are computed based on current game state and difficulty.

## Important Patterns

- All components are client-side ("use client" directive) since game requires browser APIs
- Game state persistence: localStorage for guests, Convex for authenticated users
- Press "R" key during ship placement to rotate orientation
- Bot thinking is simulated with setTimeout delays (1-2 seconds), managed via a reactive useEffect hook
- `SHIP_DEFINITIONS` in `lib/constants.ts` drives ship configuration
- Board size is 10x10 (defined in `lib/constants.ts` as `BOARD_SIZE`)
- In PvBot mode, the bot is internally represented as player 2; the UI shows "Bot" instead of "Player 2"
