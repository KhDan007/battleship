export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk";

export type GamePhase = "setup" | "battle" | "gameover";

export type GameMode = "pvp" | "pvbot" | "online";

export type BotDifficulty = "easy" | "medium" | "hard";

export interface Ship {
  id: string;
  name: string;
  size: number;
  positions: [number, number][];
}

export interface Player {
  id: 1 | 2;
  name: string;
  grid: CellState[][];
  ships: Ship[];
  shots: [number, number][];
  hits: number;
  ready: boolean;
}

export interface GameState {
  phase: GamePhase;
  currentPlayer: 1 | 2;
  players: {
    player1: Player;
    player2: Player;
  };
  winner: 1 | 2 | null;
  setupPlayer: 1 | 2;
  mode: GameMode;
  botDifficulty?: BotDifficulty;
  gameStartTime?: number;
  shotsHistory: {
    player: 1 | 2;
    row: number;
    col: number;
    hit: boolean;
    timestamp: number;
  }[];
}

export interface StoredGameState {
  gameState: GameState;
  timestamp: number;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalShots: number;
  totalHits: number;
  bestGameDuration: number | null;
  currentStreak: number;
  longestStreak: number;
}

export interface GameRecord {
  id: string;
  player1Id: string | null;
  player2Id: string | null;
  player2IsBot: boolean;
  botDifficulty: BotDifficulty | null;
  winnerId: string | null;
  winner?: 1 | 2;
  shotsPlayer1: number;
  shotsPlayer2: number;
  hitsPlayer1: number;
  hitsPlayer2: number;
  durationSeconds: number;
  createdAt: string;
}

export interface OnlineGameState {
  _id: string;
  status: "waiting" | "setup" | "battle" | "paused" | "completed";
  currentTurn: 1 | 2;
  player1Id?: string;
  player1GuestId?: string;
  player2Id?: string;
  player2GuestId?: string;
  player1Ships?: Ship[];
  player2Ships?: Ship[];
  player1Grid?: CellState[][];
  player2Grid?: CellState[][];
  shots?: { player: 1 | 2; row: number; col: number; hit: boolean; timestamp: number }[];
  winner?: 1 | 2;
  player1LastSeen?: number;
  player2LastSeen?: number;
  pausedAt?: number;
  inviteCode?: string;
  player2IsBot?: boolean;
  botDifficulty?: BotDifficulty;
  gameStartTime?: number;
}
