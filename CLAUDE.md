# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **UI**: React 18, TypeScript, Tailwind CSS
- **Backend**: Convex (real-time backend with schema, mutations, and queries)
- **Auth**: Custom auth via Convex mutations with localStorage persistence
- **Online Multiplayer**: Real-time multiplayer via Convex backend with invite codes and shareable links

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
- `app/` - Next.js App Router (layout.tsx, page.tsx, globals.css, join/[code]/page.tsx)
- `components/` - Client-side React components for game UI
- `hooks/` - Custom React hooks (useGameState manages all game logic, useOnlineGame for multiplayer)
- `lib/` - Pure utility functions (game logic, constants, types, bot AI, storage)
- `contexts/` - React contexts (AuthContext, ThemeContext)
- `convex/` - Backend functions (auth.ts, games.ts, stats.ts, invites.ts, schema.ts)

### Game State Management

All game state is managed through `hooks/useGameState.ts` which handles:
- Ship placement phase (setup)
- Battle phase with turn switching
- Bot AI integration for PvBot mode (bot is internally represented as player 2)
- Game persistence via localStorage (`lib/storage.ts`)
- Convex backend sync for authenticated users (game history, stats)
- Bot turns are managed reactively via a `pendingAction` state and `useEffect` to avoid setTimeout chain issues

### Online Multiplayer (`hooks/useOnlineGame.ts`)

Real-time multiplayer using Convex backend (no separate WebSocket server):

- **Invite system**: Host creates game → gets 6-char invite code + shareable link (`/join?code=XXXXXX`)
- **Join methods**: By invite code entry or by clicking invite link
- **Guest support**: Guests can play (no login required) - uses `guestId` in localStorage
- **Real-time sync**: Convex `useQuery` subscribes to game state changes automatically
- **Ship placement**: Both players place ships sequentially, then `startBattle()` begins
- **Battle phase**: Players take turns shooting; `recordShot` mutation updates both players' views
- **Heartbeat**: Every 5s, `updateLastSeen` mutation keeps player "alive"
- **Disconnect handling**: 
  - >15s since last seen → game pauses (`status: "paused"`)
  - >60s since last seen → opponent wins by forfeit
  - Reconnect within 60s → game resumes (`status: "battle"`)
- **Game phases**: `"waiting"` → `"setup"` → `"battle"` → `"completed"` (with `"paused"` possible during battle)

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
- `GameMode` - "pvp" | "pvbot" | "online" (online added for multiplayer)
- `BotDifficulty` - "easy" | "medium" | "hard"
- `GameRecord` - Game history record with `winner` field (1 or 2, optional for backward compatibility)

### Convex Backend

- `convex/schema.ts` - Defines users, profiles (stats), games, and invites tables
  - `games` table has `winner` field (1 or 2) to track which player won
  - `winnerId` stores the user ID of the winner (for PvP), undefined when bot wins
  - **New fields for online multiplayer**: `status` ("waiting"|"setup"|"battle"|"paused"|"completed"), `player1Ships`, `player2Ships`, `player1Grid`, `player2Grid`, `shots`, `currentTurn`, `player1LastSeen`, `player2LastSeen`, `pausedAt`, `inviteCode`, `player1GuestId`, `player2GuestId`
  - **New `invites` table**: `code` (6-char), `createdBy`, `createdByGuestId`, `targetUsername`, `targetUserId`, `gameId`, `status` ("pending"|"accepted"|"expired"), `expiresAt`
- `convex/auth.ts` - Sign up/in mutations (stores password in plain text - dev only); `getUserByUsername` query
- `convex/games.ts` - Save game mutations (supports `winner` field); **New**: `getOnlineGame`, `updatePlayerShips`, `recordShot`, `updateLastSeen`, `checkDisconnects`, `startBattle`
- `convex/invites.ts` (NEW) - `createInvite`, `getInviteByCode`, `getPendingInvitesForUser`, `acceptInvite`, `cleanupExpiredInvites`
- `convex/stats.ts` - Update user stats mutations (records `winner` field)
- Generated types in `convex/_generated/`

### Online Multiplayer Components

- **`components/OnlineLobby.tsx` (NEW)** - Lobby UI with Host/Join tabs, invite code display, copy-to-clipboard, and join-by-code
- **`components/WaitingRoom.tsx` (NEW)** - Shown while waiting for opponent to join or place ships
- **`components/DisconnectNotification.tsx` (NEW)** - Overlay shown when opponent disconnects, with 60s countdown timer
- **`app/join/page.tsx` (NEW)** - Join page that reads `?code=XXXXXX` from URL, auto-joins game, redirects to `/` on success
- **`hooks/useOnlineGame.ts` (NEW)** - Central hook for online multiplayer: manages gameId/playerNum via localStorage, Convex real-time sync, heartbeat, disconnect detection, ship placement, and shot handling

### Bot AI (`lib/botAI.ts`)

Implements three difficulty levels with distinct strategies:

**Easy**:
- Primarily random shot selection
- 30% chance to intentionally shoot diagonal-adjacent cells to hits/sunk ships (guaranteed empty per adjacency rules)
- Plays worse than random by targeting known-empty cells

**Medium**:
- Tracks ALL unsunk hit cells (not just last hit)
- Targets orthogonal (up/down/left/right) adjacent cells to unsunk hits
- Prioritizes cells that form a line with existing hits (guesses ship orientation)
- Never shoots cells diagonal to hits/sunk (guaranteed empty per adjacency rules)
- Falls back to random shots that avoid known-empty cells

**Hard** (Hunt/Target hybrid):
- **Target mode**: When unsunk hits exist, groups hits into orthogonal-connected clusters, guesses ship orientation, shoots next cell in line
- **Hunt mode**: Probability map counting valid ship placements per cell using `canPlaceShip()` (enforces 8-direction adjacency rule)
- Correctly accounts for sunk ships: all 8 adjacent cells to sunk ships are guaranteed empty
- Never shoots cells adjacent (8 directions) to sunk ships
- Most efficient at sinking ships quickly

### Ship Adjacency Rules

**Critical rule**: Ships CANNOT be placed adjacent to each other in ANY direction (all 8 neighbors).
- If a cell contains a ship or sunk ship, all 8 neighboring cells cannot contain another ship
- This means: diagonal cells of a hit/sunk are GUARANTEED EMPTY
- `canPlaceShip()` in `lib/gameLogic.ts` enforces this by checking all 8 directions

## Important Patterns

- All components are client-side ("use client" directive) since game requires browser APIs
- Game state persistence: localStorage for guests, Convex for authenticated users
- Press "R" key during ship placement to rotate orientation
- Bot thinking is simulated with setTimeout delays (1-2 seconds), managed via a reactive useEffect hook
- `SHIP_DEFINITIONS` in `lib/constants.ts` drives ship configuration
- Board size is 10x10 (defined in `lib/constants.ts` as `BOARD_SIZE`)
- In PvBot mode, the bot is internally represented as player 2; the UI shows "Bot" instead of "Player 2"
- Game history fix: `winner` field (1 or 2) was added to `games` table to correctly show Wins/Losses (never Draws - Battleship has no draws)
