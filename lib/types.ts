export type CellState = "empty" | "ship" | "hit" | "miss" | "sunk";

export type GamePhase = "setup" | "battle" | "gameover";

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
}

export interface StoredGameState {
  gameState: GameState;
  timestamp: number;
}
