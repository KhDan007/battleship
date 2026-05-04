import {
  GameState,
  Player,
  Ship,
  CellState,
} from "./types";
import { BOARD_SIZE as SIZE, SHIP_DEFINITIONS } from "./constants";

export function createEmptyGrid(): CellState[][] {
  return Array(SIZE)
    .fill(null)
    .map(() => Array(SIZE).fill("empty" as CellState));
}

export function createPlayer(id: 1 | 2, name: string): Player {
  return {
    id,
    name,
    grid: createEmptyGrid(),
    ships: [],
    shots: [],
    ready: false,
  };
}

export function createInitialGameState(): GameState {
  return {
    phase: "setup",
    currentPlayer: 1,
    players: {
      player1: createPlayer(1, "Player 1"),
      player2: createPlayer(2, "Player 2"),
    },
    winner: null,
    setupPlayer: 1,
  };
}

export function canPlaceShip(
  grid: CellState[][],
  shipSize: number,
  row: number,
  col: number,
  isHorizontal: boolean
): boolean {
  if (isHorizontal) {
    if (col + shipSize > SIZE) return false;
    for (let i = 0; i < shipSize; i++) {
      if (grid[row][col + i] !== "empty") return false;
    }
  } else {
    if (row + shipSize > SIZE) return false;
    for (let i = 0; i < shipSize; i++) {
      if (grid[row + i][col] !== "empty") return false;
    }
  }
  return true;
}

export function placeShipOnGrid(
  grid: CellState[][],
  shipSize: number,
  row: number,
  col: number,
  isHorizontal: boolean
): CellState[][] {
  const newGrid = grid.map((r) => [...r]);
  for (let i = 0; i < shipSize; i++) {
    if (isHorizontal) {
      newGrid[row][col + i] = "ship";
    } else {
      newGrid[row + i][col] = "ship";
    }
  }
  return newGrid;
}

export function createShip(
  shipDefId: string,
  shipSize: number,
  row: number,
  col: number,
  isHorizontal: boolean
): Ship {
  const positions: [number, number][] = [];
  for (let i = 0; i < shipSize; i++) {
    positions.push(
      isHorizontal ? [row, col + i] : [row + i, col]
    );
  }
  return {
    id: shipDefId,
    name: SHIP_DEFINITIONS.find((s) => s.id === shipDefId)?.name || "",
    size: shipSize,
    positions,
  };
}

export function processShot(
  gameState: GameState,
  targetPlayerId: 1 | 2,
  row: number,
  col: number
): GameState {
  const newState = JSON.parse(JSON.stringify(gameState));
  const attackerId = gameState.currentPlayer;
  const attacker =
    attackerId === 1 ? newState.players.player1 : newState.players.player2;
  const target =
    targetPlayerId === 1
      ? newState.players.player1
      : newState.players.player2;

  if (attacker.shots.some(([r, c]: [number, number]) => r === row && c === col)) {
    return gameState;
  }

  attacker.shots.push([row, col]);

  if (target.grid[row][col] === "ship") {
    target.grid[row][col] = "hit";
    const hitShip = target.ships.find((ship: Ship) =>
      ship.positions.some(([r, c]: [number, number]) => r === row && c === col)
    );
    if (hitShip) {
      const allHit = hitShip.positions.every(
        ([r, c]: [number, number]) => target.grid[r][c] === "hit"
      );
      if (allHit) {
        hitShip.positions.forEach(([r, c]: [number, number]) => {
          target.grid[r][c] = "sunk";
        });
      }
    }
    if (checkWin(target)) {
      newState.phase = "gameover";
      newState.winner = attackerId;
      return newState;
    }
    return newState;
  } else {
    target.grid[row][col] = "miss";
    newState.currentPlayer = targetPlayerId;
    return newState;
  }
}

export function checkWin(player: Player): boolean {
  return player.ships.every((ship) =>
    ship.positions.every(
      ([r, c]: [number, number]) => player.grid[r][c] === "sunk"
    )
  );
}

export function getRemainingShips(player: Player): number {
  return player.ships.filter(
    (ship) =>
      !ship.positions.every(
        ([r, c]: [number, number]) => player.grid[r][c] === "sunk"
      )
  ).length;
}
