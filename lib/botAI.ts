import { GameState, BotDifficulty, CellState, Ship } from "./types";
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
      return getEasyShot(opponent.grid, bot.shots, opponent.ships);
    case "medium":
      return getMediumShot(opponent.grid, bot.shots, opponent.ships);
    case "hard":
      return getHardShot(opponent.grid, bot.shots, opponent.ships);
    default:
      return getEasyShot(opponent.grid, bot.shots, opponent.ships);
  }
}

// Helper: Check if cell is already shot
function isShot(row: number, col: number, shots: [number, number][]): boolean {
  return shots.some(([sr, sc]) => sr === row && sc === col);
}

// Helper: Get unsunk hit cells from grid
function getUnsunkHitCells(
  grid: GridState,
  shots: [number, number][],
  ships: Ship[]
): [number, number][] {
  const sunkCells = new Set<string>();
  for (const ship of ships) {
    const isSunk = ship.positions.every(([r, c]) => grid[r][c] === "sunk");
    if (isSunk) {
      for (const [r, c] of ship.positions) {
        sunkCells.add(`${r},${c}`);
      }
    }
  }

  const hits: [number, number][] = [];
  for (const [r, c] of shots) {
    if (grid[r][c] === "hit" && !sunkCells.has(`${r},${c}`)) {
      hits.push([r, c]);
    }
  }
  return hits;
}

// Helper: Get orthogonal adjacent cells (up/down/left/right) that are unshot
function getOrthogonalAdjacent(
  row: number,
  col: number,
  shots: [number, number][]
): [number, number][] {
  const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
  const result: [number, number][] = [];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (
      nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
      !isShot(nr, nc, shots)
    ) {
      result.push([nr, nc]);
    }
  }
  return result;
}

// Helper: Group hits into orthogonal-connected clusters
function groupHitsIntoClusters(hits: [number, number][]): [number, number][][] {
  const visited = new Set<string>();
  const clusters: [number, number][][] = [];

  for (const hit of hits) {
    const key = `${hit[0]},${hit[1]}`;
    if (visited.has(key)) continue;

    const cluster: [number, number][] = [];
    const stack = [hit];
    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      const k = `${r},${c}`;
      if (visited.has(k)) continue;
      visited.add(k);
      cluster.push([r, c]);

      // Check orthogonal neighbors
      const dirs = [[-1,0], [1,0], [0,-1], [0,1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (hits.some(([hr, hc]) => hr === nr && hc === nc)) {
          stack.push([nr, nc]);
        }
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

// Helper: Filter out cells diagonal to any hit/sunk (guaranteed empty)
function filterDiagonalEmpty(
  cells: [number, number][],
  grid: GridState
): [number, number][] {
  const dirs = [[-1,-1], [-1,1], [1,-1], [1,1]];
  return cells.filter(([r, c]) => {
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        if (grid[nr][nc] === "hit" || grid[nr][nc] === "sunk") {
          return false;
        }
      }
    }
    return true;
  });
}

// Easy Bot: Random shots, 30% chance to shoot diagonal-adjacent to hits (empty cells)
function getEasyShot(
  grid: GridState,
  shots: [number, number][],
  ships: Ship[]
): BotShotResult {
  const badShots: [number, number][] = [];
  const allShots: [number, number][] = [];

  // Collect all unshot cells
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isShot(r, c, shots)) {
        allShots.push([r, c]);
        // Check if diagonal to any hit/sunk cell (guaranteed empty)
        const dirs = [[-1,-1], [-1,1], [1,-1], [1,1]];
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
            if (grid[nr][nc] === "hit" || grid[nr][nc] === "sunk") {
              badShots.push([r, c]);
              break;
            }
          }
        }
      }
    }
  }

  // 30% chance to pick a bad shot (diagonal to hit, guaranteed empty)
  if (badShots.length > 0 && Math.random() < 0.3) {
    return pickRandomCoord(badShots);
  }

  // Fallback to random shot
  if (allShots.length === 0) return { row: 0, col: 0 };
  return pickRandomCoord(allShots);
}

// Medium Bot: Track all unsunk hits, target orthogonal adjacents, use adjacency rules
function getMediumShot(
  grid: GridState,
  shots: [number, number][],
  ships: Ship[]
): BotShotResult {
  const unsunkHits = getUnsunkHitCells(grid, shots, ships);

  if (unsunkHits.length > 0) {
    // Get all orthogonal adjacent cells to unsunk hits, unshot
    const targetCells: [number, number][] = [];
    for (const [r, c] of unsunkHits) {
      const adj = getOrthogonalAdjacent(r, c, shots);
      targetCells.push(...adj);
    }

    // Remove duplicates and cells that are diagonal to any hit/sunk (guaranteed empty)
    const uniqueTargets = Array.from(new Set(targetCells.map(([r,c]) => `${r},${c}`)))
      .map(s => s.split(",").map(Number) as [number, number]);
    const validTargets = filterDiagonalEmpty(uniqueTargets, grid);

    if (validTargets.length > 0) {
      // Prioritize cells that form a line with existing hits
      const lineTargets = validTargets.filter(([r, c]) => {
        return unsunkHits.some(([hr, hc]) => {
          return (hr === r && Math.abs(hc - c) === 1) ||
                 (hc === c && Math.abs(hr - r) === 1);
        });
      });
      return pickRandomCoord(lineTargets.length > 0 ? lineTargets : validTargets);
    }
  }

  // Fallback: random shots that avoid known empty cells (diagonal to hits, shot cells)
  const validShots: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isShot(r, c, shots)) continue;
      // Skip diagonal to hits/sunk
      const dirs = [[-1,-1], [-1,1], [1,-1], [1,1]];
      let skip = false;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
          if (grid[nr][nc] === "hit" || grid[nr][nc] === "sunk") {
            skip = true;
            break;
          }
        }
      }
      if (!skip) validShots.push([r, c]);
    }
  }

  if (validShots.length === 0) return getEasyShot(grid, shots, ships);
  return pickRandomCoord(validShots);
}

// Hard Bot: Hunt/Target hybrid with probability map
function getHardShot(
  grid: GridState,
  shots: [number, number][],
  ships: Ship[]
): BotShotResult {
  const unsunkHits = getUnsunkHitCells(grid, shots, ships);

  // Target mode: if there are unsunk hits, target adjacent cells to sink ships
  if (unsunkHits.length > 0) {
    const clusters = groupHitsIntoClusters(unsunkHits);
    for (const cluster of clusters) {
      if (cluster.length === 0) continue;

      // Guess orientation: if 2+ hits in a line
      let isHorizontal = false;
      if (cluster.length >= 2) {
        const rowSame = cluster.every(([r]) => r === cluster[0][0]);
        const colSame = cluster.every(([,c]) => c === cluster[0][1]);
        isHorizontal = rowSame || colSame;
      }

      // Get target cells based on orientation
      let targetCells: [number, number][] = [];
      if (cluster.length === 1) {
        targetCells = getOrthogonalAdjacent(cluster[0][0], cluster[0][1], shots);
      } else {
        // Sort cluster to find ends
        const sorted = isHorizontal
          ? [...cluster].sort((a,b) => a[1] - b[1])
          : [...cluster].sort((a,b) => a[0] - b[0]);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        // Get next cell in line from first and last
        if (isHorizontal) {
          targetCells.push([first[0], first[1]-1], [last[0], last[1]+1]);
        } else {
          targetCells.push([first[0]-1, first[1]], [last[0]+1, last[1]]);
        }
        // Filter valid (in bounds, unshot)
        targetCells = targetCells.filter(([r,c]) => {
          return r >= 0 && r < SIZE && c >= 0 && c < SIZE && !isShot(r,c,shots);
        });
      }

      // Filter out diagonal to hits/sunk (guaranteed empty)
      const validTargets = filterDiagonalEmpty(targetCells, grid);

      if (validTargets.length > 0) {
        return pickRandomCoord(validTargets);
      }
    }
  }

  // Hunt mode: probability map
  const remainingShips = ships.filter(ship => {
    return !ship.positions.every(([r,c]) => grid[r][c] === "sunk");
  });

  if (remainingShips.length === 0) {
    return getEasyShot(grid, shots, ships);
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
    return pickRandomCoord(bestCells);
  }

  return getEasyShot(grid, shots, ships);
}

// Probability map: count valid ship placements per cell
function createProbabilityMap(
  grid: GridState,
  shots: [number, number][],
  remainingShips: { size: number }[]
): number[][] {
  const map = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (isShot(r, c, shots)) {
        map[r][c] = -1;
        continue;
      }

      for (const ship of remainingShips) {
        // Horizontal
        if (canPlaceShip(grid, ship.size, r, c, true)) {
          for (let i = 0; i < ship.size; i++) {
            map[r][c + i]++;
          }
        }
        // Vertical
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

function pickRandomCoord(arr: [number, number][]): BotShotResult {
  const [r, c] = arr[Math.floor(Math.random() * arr.length)];
  return { row: r, col: c };
}
