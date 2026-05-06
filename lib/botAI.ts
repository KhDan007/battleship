import { GameState, BotDifficulty, CellState } from "./types";
import { BOARD_SIZE as SIZE } from "./constants";
import { canPlaceShip } from "./gameLogic";

interface BotShotResult {
  row: number;
  col: number;
}

type GridState = CellState[][];

export function getBotShot(
  gameState: GameState,
  difficulty: BotDifficulty
): BotShotResult {
  const botId = gameState.currentPlayer;
  const opponentId = botId === 1 ? 2 : 1;
  const opponent = opponentId === 1 ? gameState.players.player1 : gameState.players.player2;
  const bot = botId === 1 ? gameState.players.player1 : gameState.players.player2;

  switch (difficulty) {
    case "easy":
      return getEasyShot(opponent.grid, bot.shots);
    case "medium":
      return getMediumShot(opponent.grid, bot.shots);
    case "hard":
      return getHardShot(opponent.grid, bot.shots, opponent.ships);
    default:
      return getEasyShot(opponent.grid, bot.shots);
  }
}

function getEasyShot(grid: GridState, shots: [number, number][]): BotShotResult {
  const available: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!shots.some(([sr, sc]) => sr === r && sc === c)) {
        available.push([r, c]);
      }
    }
  }
  if (available.length === 0) return { row: 0, col: 0 };
  const [row, col] = pickRandom(available);
  return { row, col };
}

function getMediumShot(grid: GridState, shots: [number, number][]): BotShotResult {
  const lastHit = findLastHit(grid, shots);

  if (lastHit) {
    const adjacent = getAdjacentCells(lastHit.row, lastHit.col, shots);
    if (adjacent.length > 0) {
      const [row, col] = pickRandom(adjacent);
      return { row, col };
    }
  }

  return getEasyShot(grid, shots);
}

function getHardShot(
  grid: GridState,
  shots: [number, number][],
  ships: { size: number; positions: [number, number][] }[]
): BotShotResult {
  const remainingShips = ships.filter(
    (ship) => !ship.positions.every(([r, c]) => grid[r][c] === "sunk")
  );

  if (remainingShips.length === 0) {
    return getEasyShot(grid, shots);
  }

  const probabilityMap = createProbabilityMap(grid, shots, remainingShips);

  let bestScore = -1;
  let bestCells: [number, number][] = [];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (probabilityMap[r][c] > bestScore) {
        bestScore = probabilityMap[r][c];
        bestCells = [[r, c]];
      } else if (probabilityMap[r][c] === bestScore) {
        bestCells.push([r, c]);
      }
    }
  }

  if (bestCells.length > 0) {
    const [row, col] = pickRandom(bestCells);
    return { row, col };
  }

  return getEasyShot(grid, shots);
}

function createProbabilityMap(
  grid: GridState,
  shots: [number, number][],
  remainingShips: { size: number }[]
): number[][] {
  const map = Array(SIZE)
    .fill(0)
    .map(() => Array(SIZE).fill(0));

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (shots.some(([sr, sc]) => sr === r && sc === c)) {
        map[r][c] = -1;
        continue;
      }

      for (const ship of remainingShips) {
        if (canPlaceShip(grid, ship.size, r, c, true)) {
          for (let i = 0; i < ship.size; i++) {
            map[r][c + i]++;
          }
        }
        if (canPlaceShip(grid, ship.size, r, c, false)) {
          for (let i = 0; i < ship.size; i++) {
            map[r + i][c]++;
          }
        }
      }
    }
  }

  return map;
}

function findLastHit(
  grid: GridState,
  shots: [number, number][]
): { row: number; col: number } | null {
  for (let i = shots.length - 1; i >= 0; i--) {
    const [r, c] = shots[i];
    if (grid[r][c] === "hit") {
      return { row: r, col: c };
    }
  }
  return null;
}

function getAdjacentCells(
  row: number,
  col: number,
  shots: [number, number][]
): [number, number][] {
  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const adjacent: [number, number][] = [];

  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (
      nr >= 0 &&
      nr < SIZE &&
      nc >= 0 &&
      nc < SIZE &&
      !shots.some(([sr, sc]) => sr === nr && sc === nc)
    ) {
      adjacent.push([nr, nc]);
    }
  }

  return adjacent;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
