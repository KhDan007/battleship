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
- `app/` - Next.js App Router (layout.tsx, page.tsx, globals.css, join/page.tsx)
- `components/` - Client-side React components for game UI
  - `OnlineGameManager.tsx` - Manages all online multiplayer game phases (waiting, setup, battle, completed)
  - `LocalGameManager.tsx` - Manages all local game modes (pvp, pvbot) with all game phases
  - `OnlineLobby.tsx` - Lobby UI with Host/Join tabs, invite code display, copy-to-clipboard
  - `WaitingRoom.tsx` - Shown while waiting for opponent to join or place ships
  - `DisconnectNotification.tsx` - Overlay shown when opponent disconnects
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
- `gameMode` is persisted to localStorage (`battleship_gameMode`) to survive page navigations (critical for online mode flow after redirect from `/join`)

### Online Multiplayer (`hooks/useOnlineGame.ts`)

Real-time multiplayer using Convex backend (no separate WebSocket server):

- **Invite system**: Host creates game → gets 6-char invite code + shareable link (`/join?code=XXXXXX`)
- **Join methods**: By invite code entry or by clicking invite link
- **Guest support**: Guests can play (no login required) - uses `guestId` in localStorage
- **Real-time sync**: Convex `useQuery` subscribes to game state changes automatically
- **Host auto-connect**: `OnlineLobby` receives `hostGame` and `joinGame` as props from parent's `useOnlineGame()` hook instance (not a separate instance) so state persists correctly when opponent joins
- **Ship placement**: Both players place ships; `useEffect` watches both `player1Ships` and `player2Ships` to auto-start battle via `startBattle()`
- **Battle phase**: 
  - Players take turns shooting; `recordShot` mutation updates both players' views
  - **Hit = go again**: Turn stays same on hit, switches only on miss (backend `recordShot` mutation preserves `currentTurn` on hit)
  - **Hit/miss animation**: `OnlineGameManager` uses `shotResult` and `onlineIsProcessing` states with `useEffect` watching `onlineState?.shots` to show "Hit! Go again!" or "Miss!" feedback for 2000ms
- **Heartbeat**: Every 5s, `updateLastSeen` mutation keeps player "alive"
- **Disconnect handling**: 
  - >15s since last seen → game pauses (`status: "paused"`)
  - >60s since last seen → opponent wins by forfeit
  - Reconnect within 60s → game resumes (`status: "battle"`)
- **Game phases**: `"waiting"` → `"setup"` → `"battle"` → `"completed"` (with `"paused"` possible during battle)
- **Usernames**: `getOnlineGame` Convex query fetches and returns `player1Username` and `player2Username`; UI displays actual usernames instead of "Player 1"/"Player 2"

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
- `convex/games.ts` - Save game mutations (supports `winner` field); **New**: `getOnlineGame` (returns `player1Username`/`player2Username`), `updatePlayerShips`, `recordShot` (preserves `currentTurn` on hit so player goes again; switches only on miss), `updateLastSeen`, `checkDisconnects`, `startBattle`
- `convex/invites.ts` (NEW) - `createInvite`, `getInviteByCode`, `getPendingInvitesForUser`, `acceptInvite`, `cleanupExpiredInvites`
- `convex/stats.ts` - Update user stats mutations (records `winner` field)
- Generated types in `convex/_generated/`

### Page Architecture (after refactoring)

- **`app/page.tsx`** - Simplified routing (~50 lines): handles auth check, determines online vs local mode, renders appropriate manager component
- **`components/OnlineGameManager.tsx`** - Manages all online multiplayer phases: waiting room, ship placement, battle, and game over
- **`components/LocalGameManager.tsx`** - Manages all local game modes (pvp, pvbot): setup, battle, and game over phases

### Online Multiplayer Components

- **`components/OnlineLobby.tsx`** - Lobby UI with Host/Join tabs, invite code display, copy-to-clipboard. Receives `hostGame` and `joinGame` as props from parent's `useOnlineGame()` hook instance (NOT its own instance) to ensure state persistence
- **`components/WaitingRoom.tsx`** - Shown while waiting for opponent to join (status: "waiting")
- **`components/DisconnectNotification.tsx`** - Overlay shown when opponent disconnects, with 60s countdown timer
- **`app/join/page.tsx`** - Join page that reads `?code=XXXXXX` from URL, auto-joins game, sets `gameMode` to "online", redirects to `/` on success
- **`hooks/useOnlineGame.ts`** - Central hook for online multiplayer: manages gameId/playerNum via localStorage, Convex real-time sync, heartbeat, disconnect detection, ship placement, and shot handling
- **`components/OnlineGameManager.tsx`** - Manages all online phases; includes `shotResult` and `onlineIsProcessing` states for hit/miss animation, `useEffect` watches `onlineState?.shots` to detect shot results

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

## Recent Fixes (2026-05-06)

1. **Online multiplayer 404 error**: `OnlineLobby.tsx` was redirecting to `/play/online?gameId=...` which doesn't exist. Fixed to redirect to `/` and properly use `useOnlineGame()` hook for state persistence.

2. **Game stuck on "Waiting for opponent"**: The condition in `app/page.tsx` was catching ALL non-battle/non-completed statuses (including "setup"), preventing ship placement UI from rendering. Fixed to only show `WaitingRoom` when `status === "waiting"`.

3. **Game mode not persisting across navigation**: `useGameState.ts` wasn't persisting `gameMode` to localStorage. Added persistence so `gameMode` survives page navigations (critical for online mode flow after redirect from `/join`).

4. **Code refactoring**: Split 670-line `app/page.tsx` into modular components:
   - `app/page.tsx` - Simplified to ~50 lines (auth check + routing)
   - `components/OnlineGameManager.tsx` - All online multiplayer game phases
   - `components/LocalGameManager.tsx` - All local game modes (pvp, pvbot)

5. **Host not auto-connecting when opponent joins**: `OnlineLobby` was calling its own `useOnlineGame()` creating a separate instance, so `hostGame()` updated the wrong state. Fixed by passing `hostGame` and `joinGame` from the parent's hook instance as props to `OnlineLobby`. Host now automatically transitions to ship placement when opponent joins.

6. **No hit/miss animation in online games**: Added `shotResult` and `onlineIsProcessing` states to `OnlineGameManager`. Added `useEffect` that watches `onlineState?.shots` and detects new shots to show "Hit! Go again!" or "Miss!" feedback with 2000ms animation.

7. **Turn switching on hit instead of miss**: Updated `recordShot` Convex mutation to NOT switch `currentTurn` on hit. Player keeps shooting until they miss. Turn only switches after a miss, matching local game behavior.

8. **Show actual usernames instead of "Player 1"/"Player 2"**: Updated `getOnlineGame` Convex query to fetch and return `player1Username` and `player2Username`. Added fields to `OnlineGameState` interface. Updated `OnlineGameManager` and `GameStatus` to display actual usernames throughout the UI.
