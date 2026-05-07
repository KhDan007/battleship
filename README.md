# ⚓ Battleship

A full-featured, multiplayer Battleship game built with **Next.js 14**, **React**, **Tailwind CSS**, **Convex** (backend), and **OpenAI** (AI analysis). Play locally against a friend or AI, challenge someone online with invite codes, then analyze your games with a probability heatmap and AI coach.

[Play Live](https://battleship-flax-one.vercel.app/)

---

## Features

### Game Modes
- **Player vs Player (Local)** — Two players take turns on the same device.
- **Player vs Bot** — Fight an AI with three difficulty levels:
  - *Easy*: Random shots, occasionally makes bad moves.
  - *Medium*: Hunts after hits, avoids known empty cells.
  - *Hard*: Uses a **probability heatmap** to always pick the statistically best shot.
- **Online Multiplayer** — Host a game, get an invite code, and battle a friend in real time.

### Ship Placement
- Click to place, **R** to rotate.
- Auto-place ships randomly with valid positioning.
- Ships cannot touch each other — even diagonally.

### Battle
- Hit = shoot again. Miss = switch turns.
- Online mode shows **both boards** side-by-side (your fleet + opponent's attack grid).
- Disconnect handling: 15s pause warning, 60s auto-forfeit.

### Post-Game Analysis
After any game ends, open **Analysis Mode** to:
- Replay the entire game move-by-move with arrow keys.
- See both players' true fleet layouts (omniscient view).
- View a scrollable move list with hits, misses, and sinks.

### AI Insights (Smart Analysis)
- **Probability Heatmap** — A color-coded 10×10 grid showing where ships were *most likely* hidden from the shooter's perspective at any given move. Uses the same math as the Hard Bot.
- **Top Targets** — Lists the 5 highest-probability cells. Compares the actual shot against optimal targets.
- **AI Coach Tip** — Calls OpenAI with the probability map to generate a concise, actionable tip explaining why a move was good or what better options existed.

### AI Chatbot
A conversational coach built into the analysis sidebar. Ask anything:
- *"Why was this move bad?"*
- *"What does the probability map mean?"*
- *"How do I improve my opening?"*

The bot receives full game context (notation, current move, probability map) with every message.

### Stats & History
- Sign in to track games played, wins, accuracy, streaks, and best time.
- Browse your full game history with filters (PvP, Bot Easy/Medium/Hard).
- Replay any past game with the Analyze button.

### Notation (BSN v1.0)
Every game is recorded in a PGN-inspired text format that stores:
- Metadata (players, mode, result, date)
- Both players' ship setups
- Every shot with hit/miss/ship/sunk status

This notation powers the analysis engine and can be saved or shared.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3, Dark mode support |
| Backend | Convex (serverless database + real-time sync) |
| Auth | Convex Auth (email/password, no external OAuth required) |
| AI | OpenAI GPT-4o-mini via secure API proxy |
| Deployment | Vercel (frontend) + Convex Cloud (backend) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- A [Convex](https://convex.dev) account (free tier)
- An [OpenAI](https://platform.openai.com) API key (optional — AI features won't work without it)

### 1. Clone & Install
```bash
git clone <repo-url>
cd battleship
npm install
```

### 2. Set up Convex
```bash
npx convex dev
```
This will:
- Log you into Convex
- Create a new project (or use an existing one)
- Print your Convex deployment URL

### 3. Environment Variables
Create a `.env.local` file in the project root:

```env
# Convex (required)
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CONVEX_SITE_URL=<your-convex-site-url>
CONVEX_DEPLOYMENT=<your-convex-deployment-id>

# OpenAI (optional — enables AI Insights & Chatbot)
OPENAI_API=<your-openai-api-key>
```

> **Never commit `.env.local`**. It's already in `.gitignore`.

### 4. Run Development Servers
```bash
# Start both Next.js frontend and Convex backend
npm run dev:full
```

Or run them separately:
```bash
npm run dev        # Next.js only (port 3000)
npx convex dev     # Convex backend
```

### 5. Build for Production
```bash
npm run build
```

---

## Deployment

### Frontend (Vercel)
```bash
npx vercel --prod
```

**Required Environment Variables in Vercel Dashboard:**
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CONVEX_SITE_URL`
- `CONVEX_DEPLOYMENT`
- `OPENAI_API` *(optional)*

### Backend (Convex)
```bash
npx convex deploy
```
This pushes your schema and functions to Convex Cloud.

---

## Architecture

```
app/
  page.tsx              # Main entry: auth, mode routing
  join/page.tsx         # Invite link handler (?code=XXX)
  layout.tsx            # Root layout with providers
  api/chat/route.ts     # OpenAI API proxy (secure)

components/
  GameAnalysis.tsx      # Analysis mode UI
  AIFeedbackPanel.tsx   # Probability map + AI tips
  AnalysisChatbot.tsx   # Conversational AI coach
  GameBoard.tsx         # 10×10 interactive grid
  ShipPlacement.tsx     # Ship selector & placement UI
  LocalGameManager.tsx  # Local PvP / PvBot game flow
  OnlineGameManager.tsx # Online multiplayer game flow
  OnlineLobby.tsx       # Host / Join online games
  GameHistory.tsx       # Past games list with filters

lib/
  gameLogic.ts          # Core rules: shooting, placement, win check
  botAI.ts              # AI opponent: Easy / Medium / Hard
  probabilityMap.ts     # Heatmap generation from partial knowledge
  notation.ts           # BSN format: generate, parse, reconstruct
  analysisEngine.ts     # Rule-based tactical insights
  types.ts              # Shared TypeScript types
  constants.ts          # Board size, ship definitions

hooks/
  useGameState.ts       # All local game logic (PvP, PvBot)
  useOnlineGame.ts      # All online multiplayer logic

convex/
  schema.ts             # Database schema
  auth.ts               # Authentication mutations/queries
  games.ts              # Game CRUD + online game state
  invites.ts            # Invite code generation
  stats.ts              # Player statistics
```

---

## Game Rules

1. **Board**: 10×10 grid. Columns A–J, rows 1–10.
2. **Ships**:
   - Carrier (5 cells)
   - Battleship (4 cells)
   - Cruiser (3 cells)
   - Submarine (3 cells)
   - Destroyer (2 cells)
3. **Placement**: Ships cannot overlap or touch — even diagonally.
4. **Turns**: Click a cell to shoot. Hit = shoot again. Miss = opponent's turn.
5. **Win**: Sink all 5 enemy ships first.

---

## Notation Format (BSN v1.0)

A plain-text format inspired by PGN:

```
[BATTLESHIP "1.0"]
[Date "2026.05.08"]
[Time "14:30:00"]
[Player1 "Alice"]
[Player2 "Bob"]
[Mode "pvp"]
[Result "1-0"]
[Termination "All ships sunk"]

[Setup "Player1"]
Carrier A1,A2,A3,A4,A5
Battleship B1,B2,B3,B4
...

[Setup "Player2"]
...

[Moves]
1. P1 A5 o
2. P2 B3 x
3. P1 C7 x Cruiser
4. P1 D7 x Cruiser*
```

---

## AI Features Explained

### Probability Heatmap
The heatmap answers: *"Given only what this player knew, where was the enemy most likely hiding?"*

It works by counting every valid way the remaining (unsunk) ships could fit on the board without violating known constraints (misses = empty, sunk ships block adjacency). Cells that appear in more valid placements get higher scores. This is the exact same algorithm the Hard Bot uses to pick shots.

### AI Coach Tip
When you step to a move, the app:
1. Generates the probability map from that shooter's perspective.
2. Checks if their actual shot was in the top 5 probability cells.
3. Sends the map + move data to OpenAI.
4. Receives a 2-3 sentence tip explaining the decision.

### Chatbot
A general-purpose strategist. It receives:
- Game metadata (players, mode, result)
- Current move being viewed
- Full probability map
- Top 5 targets

You can ask open-ended questions and get personalized advice.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server only |
| `npm run dev:full` | Next.js + Convex concurrently |
| `npm run build` | Production build |
| `npm run lint` | Next.js lint |
| `npx convex dev` | Start Convex backend locally |
| `npx convex deploy` | Deploy backend to Convex Cloud |
| `npx vercel --prod` | Deploy frontend to Vercel |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex client URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Yes | Convex site URL |
| `CONVEX_DEPLOYMENT` | Yes | Convex deployment ID |
| `OPENAI_API` | No | OpenAI API key for AI insights/chatbot |

---

## License

MIT
