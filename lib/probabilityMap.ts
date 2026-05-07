import { ParsedNotation } from "./notation";
import { BOARD_SIZE as SIZE, SHIP_DEFINITIONS } from "./constants";
import { CellState } from "./types";
import { canPlaceShip } from "./gameLogic";

// ---------------------------------------------------------------------------
// Probability Map for Analysis Mode
// Generates a heatmap of where remaining ships could be hidden,
// given ONLY the information available to a specific player at a given move.
// ---------------------------------------------------------------------------

export interface ProbabilityCell {
  row: number;
  col: number;
  probability: number; // 0-100
  label: string;
}

/**
 * Reconstruct what a specific player KNOWS about the opponent's board
 * at a given move index. This is their partial information state.
 */
export function getPlayerKnowledge(
  parsed: ParsedNotation,
  player: 1 | 2,
  moveIndex: number
): CellState[][] {
  const grid: CellState[][] = Array(SIZE)
    .fill(null)
    .map(() => Array(SIZE).fill("empty"));

  // Player only knows their own shots and the results
  const playerMoves = parsed.moves
    .slice(0, moveIndex + 1)
    .filter((m) => m.player === player);

  for (const move of playerMoves) {
    if (move.hit) {
      grid[move.row][move.col] = "hit";
    } else {
      grid[move.row][move.col] = "miss";
    }
  }

  // Mark sunk ships as sunk (player knows when they sink a ship)
  const opponentSetup = parsed.setup.find((s) => s.player === (player === 1 ? 2 : 1));
  if (opponentSetup) {
    for (const ship of opponentSetup.ships) {
      const hitsOnShip = playerMoves.filter((m) =>
        m.hit && ship.positions.some(([r, c]) => r === m.row && c === m.col)
      );
      // If all positions of this ship have been hit, mark as sunk
      if (hitsOnShip.length === ship.positions.length) {
        for (const [r, c] of ship.positions) {
          grid[r][c] = "sunk";
        }
      }
    }
  }

  return grid;
}

function isShotFromGrid(row: number, col: number, grid: CellState[][]): boolean {
  const cell = grid[row][col];
  return cell === "hit" || cell === "miss" || cell === "sunk";
}

function getSunkAdjacentCells(grid: CellState[][]): Set<string> {
  const sunkAdjacent = new Set<string>();
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (grid[r][c] === "sunk") {
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
            sunkAdjacent.add(`${nr},${nc}`);
          }
        }
      }
    }
  }
  return sunkAdjacent;
}

/**
 * Check if a ship can be placed on the knowledge grid for probability counting.
 * Rules:
 * - Can't overlap misses (known empty)
 * - Can't overlap sunk ships (already accounted for)
 * - Can't be on cells adjacent to sunk ships (guaranteed empty by game rules)
 * - CAN overlap hit cells (we know a ship is there)
 * - Adjacency to other ships: we don't know full layout, so we only block
 *   cells adjacent to sunk ships
 */
function canPlaceShipOnKnowledge(
  grid: CellState[][],
  shipSize: number,
  row: number,
  col: number,
  isHorizontal: boolean,
  sunkAdjacent: Set<string>
): boolean {
  // Bounds check and basic overlap check
  if (isHorizontal) {
    if (col + shipSize > SIZE) return false;
  } else {
    if (row + shipSize > SIZE) return false;
  }

  for (let i = 0; i < shipSize; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;
    const cell = grid[r][c];

    // Can't place over a miss or sunk cell
    if (cell === "miss" || cell === "sunk") return false;

    // Can't place on a cell known to be empty (adjacent to sunk)
    if (sunkAdjacent.has(`${r},${c}`)) return false;
  }

  // Check that no cell of the placement is adjacent to a sunk ship
  // (ships can't touch, even diagonally)
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ];

  for (let i = 0; i < shipSize; i++) {
    const r = isHorizontal ? row : row + i;
    const c = isHorizontal ? col + i : col;

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
        if (grid[nr][nc] === "sunk") return false;
      }
    }
  }

  return true;
}

/**
 * Generate a probability heatmap from a player's perspective.
 * Returns a 10x10 grid where each cell is a probability score (0-100+).
 * Higher = more likely to contain an unsunk ship cell.
 */
export function generateProbabilityMap(
  parsed: ParsedNotation,
  player: 1 | 2,
  moveIndex: number
): { map: number[][]; maxScore: number } {
  const knowledgeGrid = getPlayerKnowledge(parsed, player, moveIndex);
  const sunkAdjacent = getSunkAdjacentCells(knowledgeGrid);

  // Determine remaining ships (by size)
  const opponentSetup = parsed.setup.find((s) => s.player === (player === 1 ? 2 : 1));
  const remainingShipSizes: number[] = [];

  if (opponentSetup) {
    for (const ship of opponentSetup.ships) {
      const playerMoves = parsed.moves
        .slice(0, moveIndex + 1)
        .filter((m) => m.player === player);
      const hitsOnShip = playerMoves.filter((m) =>
        m.hit && ship.positions.some(([r, c]) => r === m.row && c === m.col)
      );
      if (hitsOnShip.length < ship.positions.length) {
        remainingShipSizes.push(ship.positions.length);
      }
    }
  }

  // If no remaining ships or no setup, return empty map
  if (remainingShipSizes.length === 0) {
    return {
      map: Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)),
      maxScore: 0,
    };
  }

  const map = Array(SIZE).fill(0).map(() => Array(SIZE).fill(0));

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      // Skip already-shot cells (including hits, misses, sunk)
      if (isShotFromGrid(r, c, knowledgeGrid)) {
        map[r][c] = -1;
        continue;
      }

      // Skip sunk-adjacent (guaranteed empty)
      if (sunkAdjacent.has(`${r},${c}`)) {
        map[r][c] = 0;
        continue;
      }

      for (const shipSize of remainingShipSizes) {
        // Horizontal placements
        if (canPlaceShipOnKnowledge(knowledgeGrid, shipSize, r, c, true, sunkAdjacent)) {
          for (let i = 0; i < shipSize; i++) {
            const nr = r;
            const nc = c + i;
            if (!isShotFromGrid(nr, nc, knowledgeGrid) && !sunkAdjacent.has(`${nr},${nc}`)) {
              map[nr][nc]++;
            }
          }
        }

        // Vertical placements
        if (canPlaceShipOnKnowledge(knowledgeGrid, shipSize, r, c, false, sunkAdjacent)) {
          for (let i = 0; i < shipSize; i++) {
            const nr = r + i;
            const nc = c;
            if (!isShotFromGrid(nr, nc, knowledgeGrid) && !sunkAdjacent.has(`${nr},${nc}`)) {
              map[nr][nc]++;
            }
          }
        }
      }
    }
  }

  // Normalize to 0-100 scale
  let maxScore = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (map[r][c] > maxScore) maxScore = map[r][c];
    }
  }

  if (maxScore > 0) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (map[r][c] > 0) {
          map[r][c] = Math.round((map[r][c] / maxScore) * 100);
        }
      }
    }
  }

  return { map, maxScore };
}

/**
 * Format probability map as a readable string for OpenAI prompts.
 */
export function formatProbabilityMap(map: number[][]): string {
  const cols = "  ABCDEFGHIJ";
  let result = cols + "\n";
  for (let r = 0; r < SIZE; r++) {
    let row = `${r + 1} `.padStart(3);
    for (let c = 0; c < SIZE; c++) {
      const val = map[r][c];
      if (val === -1) row += " XX";
      else if (val === 0) row += "  .";
      else row += ` ${val.toString().padStart(2)}`;
    }
    result += row + "\n";
  }
  return result;
}

/**
 * Get the top N highest-probability cells.
 */
export function getTopProbabilityCells(
  map: number[][],
  n: number = 5
): ProbabilityCell[] {
  const cells: ProbabilityCell[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (map[r][c] > 0) {
        cells.push({
          row: r,
          col: c,
          probability: map[r][c],
          label: `${"ABCDEFGHIJ"[c]}${r + 1}`,
        });
      }
    }
  }
  return cells.sort((a, b) => b.probability - a.probability).slice(0, n);
}
