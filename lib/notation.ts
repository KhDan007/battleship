import { GameState, Ship, CellState } from "./types";
import { SHIP_DEFINITIONS } from "./constants";

// ---------------------------------------------------------------------------
// Battleship Notation (BSN) v1.0
// ---------------------------------------------------------------------------
// A rigid, PGN-inspired format for recording complete Battleship games.
//
// Format:
// [BATTLESHIP "1.0"]
// [Date "YYYY.MM.DD"]
// [Time "HH:MM:SS"]
// [Player1 "username"]
// [Player2 "username"]
// [Mode "pvp"]
// [Result "1-0" | "0-1" | "*"]
// [Termination "All ships sunk" | "Abandoned" | "Disconnected"]
//
// [Setup "Player1"]
// Carrier A1,A2,A3,A4,A5
// Battleship B1,B2,B3,B4
// ...
//
// [Setup "Player2"]
// Carrier J1,J2,J3,J4,J5
// ...
//
// [Moves]
// 1. P1 A5 o
// 2. P2 B3 x
// 3. P1 C7 x Cruiser
// 4. P1 D7 x Cruiser*
// 5. P2 E5 o
// 6. P1 F1 x Destroyer*
//
// Move syntax: {n}. P{player} {coord} {result} [{shipName}][*]
//   result: x = hit, o = miss
//   shipName: included only on hit
//   *: suffixed when the hit sinks the ship
// ---------------------------------------------------------------------------

export interface NotationMove {
  number: number;
  player: 1 | 2;
  row: number;
  col: number;
  hit: boolean;
  shipName?: string;
  sunk: boolean;
}

export interface NotationSetup {
  player: 1 | 2;
  ships: { name: string; positions: [number, number][] }[];
}

export interface ParsedNotation {
  version: string;
  date: string;
  time: string;
  player1Name: string;
  player2Name: string;
  mode: string;
  result: string;
  termination: string;
  setup: NotationSetup[];
  moves: NotationMove[];
}

export interface AnalysisBoardState {
  player1Grid: CellState[][];
  player2Grid: CellState[][];
  player1Ships: Ship[];
  player2Ships: Ship[];
  currentMove: number; // -1 = initial setup, 0..moves.length-1 = after that move
}

function coordToString(row: number, col: number): string {
  const cols = "ABCDEFGHIJ";
  return `${cols[col]}${row + 1}`;
}

function stringToCoord(coord: string): [number, number] | null {
  const cols = "ABCDEFGHIJ";
  const match = coord.match(/^([A-Ja-j])(\d{1,2})$/);
  if (!match) return null;
  const col = cols.indexOf(match[1].toUpperCase());
  const row = parseInt(match[2], 10) - 1;
  if (row < 0 || row > 9 || col < 0 || col > 9) return null;
  return [row, col];
}

function formatShipPositions(ship: Ship): string {
  return ship.positions.map(([r, c]) => coordToString(r, c)).join(",");
}

export function generateNotation(gameState: GameState): string {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0].replace(/-/g, ".");
  const timeStr = now.toTimeString().split(" ")[0];

  const p1 = gameState.players.player1;
  const p2 = gameState.players.player2;

  const result =
    gameState.winner === 1
      ? "1-0"
      : gameState.winner === 2
      ? "0-1"
      : "*";

  const lines: string[] = [];
  lines.push(`[BATTLESHIP "1.0"]`);
  lines.push(`[Date "${dateStr}"]`);
  lines.push(`[Time "${timeStr}"]`);
  lines.push(`[Player1 "${p1.name}"]`);
  lines.push(`[Player2 "${p2.name}"]`);
  lines.push(`[Mode "${gameState.mode}"]`);
  lines.push(`[Result "${result}"]`);
  lines.push(`[Termination "All ships sunk"]`);
  lines.push(``);

  // Setup sections
  [1, 2].forEach((pid) => {
    const player = pid === 1 ? p1 : p2;
    lines.push(`[Setup "Player${pid}"]`);
    for (const ship of player.ships) {
      lines.push(`${ship.name} ${formatShipPositions(ship)}`);
    }
    lines.push(``);
  });

  // Moves section
  lines.push(`[Moves]`);
  if (gameState.shotsHistory && gameState.shotsHistory.length > 0) {
    const moveDetails = getMoveDetails(gameState);
    for (const md of moveDetails) {
      let line = `${md.number}. P${md.player} ${coordToString(md.row, md.col)} ${
        md.hit ? "x" : "o"
      }`;
      if (md.hit && md.shipName) {
        line += ` ${md.shipName}${md.sunk ? "*" : ""}`;
      }
      lines.push(line);
    }
  }

  return lines.join("\n");
}

interface MoveDetail extends NotationMove {}

function getMoveDetails(gameState: GameState): MoveDetail[] {
  const details: MoveDetail[] = [];
  const p1Ships = gameState.players.player1.ships.map((s) => ({
    ...s,
    hits: 0,
    sunk: false,
  }));
  const p2Ships = gameState.players.player2.ships.map((s) => ({
    ...s,
    hits: 0,
    sunk: false,
  }));

  let moveNum = 0;
  let lastPlayer: 1 | 2 | null = null;

  for (const shot of gameState.shotsHistory) {
    if (lastPlayer !== shot.player) {
      moveNum++;
      lastPlayer = shot.player;
    }

    const targetShips = shot.player === 1 ? p2Ships : p1Ships;
    let shipName: string | undefined;
    let sunk = false;

    if (shot.hit) {
      const hitShip = targetShips.find((s) =>
        s.positions.some(([r, c]) => r === shot.row && c === shot.col)
      );
      if (hitShip) {
        hitShip.hits++;
        shipName = hitShip.name;
        if (hitShip.hits >= hitShip.size && !hitShip.sunk) {
          hitShip.sunk = true;
          sunk = true;
        }
      }
    }

    details.push({
      number: moveNum,
      player: shot.player,
      row: shot.row,
      col: shot.col,
      hit: shot.hit,
      shipName,
      sunk,
    });
  }

  return details;
}

export function parseNotation(bsn: string): ParsedNotation | null {
  const lines = bsn
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsed: Partial<ParsedNotation> = {
    setup: [],
    moves: [],
  };

  let currentSection: "header" | "setup" | "moves" = "header";
  let currentSetupPlayer: 1 | 2 | null = null;

  for (const line of lines) {
    // Header tags
    const tagMatch = line.match(/^\[(\w+)\s+"([^"]*)"\]$/);
    if (tagMatch) {
      const [, key, value] = tagMatch;
      switch (key) {
        case "BATTLESHIP":
          parsed.version = value;
          break;
        case "Date":
          parsed.date = value;
          break;
        case "Time":
          parsed.time = value;
          break;
        case "Player1":
          parsed.player1Name = value;
          break;
        case "Player2":
          parsed.player2Name = value;
          break;
        case "Mode":
          parsed.mode = value;
          break;
        case "Result":
          parsed.result = value;
          break;
        case "Termination":
          parsed.termination = value;
          break;
      }
      continue;
    }

    // Section headers
    if (line === "[Moves]") {
      currentSection = "moves";
      continue;
    }
    const setupMatch = line.match(/^\[Setup\s+"Player(\d)"\]$/);
    if (setupMatch) {
      currentSection = "setup";
      currentSetupPlayer = parseInt(setupMatch[1], 10) as 1 | 2;
      if (currentSetupPlayer) {
        parsed.setup!.push({
          player: currentSetupPlayer,
          ships: [],
        });
      }
      continue;
    }

    // Setup lines
    if (currentSection === "setup" && currentSetupPlayer) {
      const setupEntry = parsed.setup!.find(
        (s) => s.player === currentSetupPlayer
      );
      if (setupEntry) {
        const parts = line.split(" ");
        if (parts.length >= 2) {
          const name = parts[0];
          const coordStrs = parts.slice(1).join(" ").split(",");
          const positions: [number, number][] = [];
          for (const cs of coordStrs) {
            const coord = stringToCoord(cs.trim());
            if (coord) positions.push(coord);
          }
          if (positions.length > 0) {
            setupEntry.ships.push({ name, positions });
          }
        }
      }
      continue;
    }

    // Moves
    if (currentSection === "moves") {
      const moveMatch = line.match(
        /^(\d+)\.\s+P([12])\s+([A-Ja-j]\d{1,2})\s+([xo])(?:\s+(.+?))?(\*)?$/
      );
      if (moveMatch) {
        const [, numStr, playerStr, coordStr, result, shipPart, sunkMark] = moveMatch;
        const coord = stringToCoord(coordStr);
        if (!coord) continue;

        const hit = result === "x";
        let shipName: string | undefined;
        let sunk = false;

        if (hit && shipPart) {
          shipName = shipPart.trim();
          sunk = !!sunkMark;
        }

        parsed.moves!.push({
          number: parseInt(numStr, 10),
          player: parseInt(playerStr, 10) as 1 | 2,
          row: coord[0],
          col: coord[1],
          hit,
          shipName,
          sunk,
        });
      }
      continue;
    }
  }

  if (!parsed.version) return null;

  return parsed as ParsedNotation;
}

export function reconstructBoards(
  parsed: ParsedNotation,
  moveIndex: number
): AnalysisBoardState {
  // Create fresh empty grids
  const p1Grid: CellState[][] = Array(10)
    .fill(null)
    .map(() => Array(10).fill("empty"));
  const p2Grid: CellState[][] = Array(10)
    .fill(null)
    .map(() => Array(10).fill("empty"));

  const p1Ships: Ship[] = [];
  const p2Ships: Ship[] = [];

  // Place ships from setup
  const p1Setup = parsed.setup.find((s) => s.player === 1);
  const p2Setup = parsed.setup.find((s) => s.player === 2);

  if (p1Setup) {
    for (const s of p1Setup.ships) {
      const shipDef = SHIP_DEFINITIONS.find(
        (sd) => sd.name.toLowerCase() === s.name.toLowerCase()
      );
      p1Ships.push({
        id: shipDef?.id || s.name.toLowerCase(),
        name: s.name,
        size: s.positions.length,
        positions: s.positions,
      });
      for (const [r, c] of s.positions) {
        if (r >= 0 && r < 10 && c >= 0 && c < 10) {
          p1Grid[r][c] = "ship";
        }
      }
    }
  }

  if (p2Setup) {
    for (const s of p2Setup.ships) {
      const shipDef = SHIP_DEFINITIONS.find(
        (sd) => sd.name.toLowerCase() === s.name.toLowerCase()
      );
      p2Ships.push({
        id: shipDef?.id || s.name.toLowerCase(),
        name: s.name,
        size: s.positions.length,
        positions: s.positions,
      });
      for (const [r, c] of s.positions) {
        if (r >= 0 && r < 10 && c >= 0 && c < 10) {
          p2Grid[r][c] = "ship";
        }
      }
    }
  }

  // Apply moves up to moveIndex
  const targetMoves = parsed.moves.slice(0, moveIndex + 1);
  for (const move of targetMoves) {
    const targetGrid = move.player === 1 ? p2Grid : p1Grid;
    const targetShips = move.player === 1 ? p2Ships : p1Ships;

    if (move.hit) {
      targetGrid[move.row][move.col] = "hit";
      // Check if ship should be marked sunk
      if (move.shipName && move.sunk) {
        const ship = targetShips.find(
          (s) => s.name.toLowerCase() === (move.shipName || "").toLowerCase()
        );
        if (ship) {
          for (const [r, c] of ship.positions) {
            targetGrid[r][c] = "sunk";
          }
        }
      }
    } else {
      targetGrid[move.row][move.col] = "miss";
    }
  }

  return {
    player1Grid: p1Grid,
    player2Grid: p2Grid,
    player1Ships: p1Ships,
    player2Ships: p2Ships,
    currentMove: moveIndex,
  };
}
