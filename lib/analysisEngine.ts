import { ParsedNotation, NotationMove, NotationSetup } from "./notation";

// ---------------------------------------------------------------------------
// Analysis Engine — rule-based tactical insights from game notation
// ---------------------------------------------------------------------------

export type InsightType =
  | "setup"
  | "opening"
  | "hunting"
  | "turning-point"
  | "accuracy"
  | "strategy"
  | "verdict";

export interface Insight {
  type: InsightType;
  player: 1 | 2;
  title: string;
  description: string;
  severity: "positive" | "neutral" | "negative" | "highlight";
}

export interface GameInsights {
  insights: Insight[];
  player1Stats: PlayerAnalysisStats;
  player2Stats: PlayerAnalysisStats;
}

export interface PlayerAnalysisStats {
  totalShots: number;
  hits: number;
  misses: number;
  accuracy: number; // 0-100
  shipsSunk: number;
  avgShotsToSink: number;
  firstBlood: boolean;
  huntEfficiency: number; // 0-100
}

const COLS = "ABCDEFGHIJ";

function coordStr(row: number, col: number): string {
  return `${COLS[col]}${row + 1}`;
}

function distance(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function getShipPositions(setup: NotationSetup | undefined): [number, number][] {
  if (!setup) return [];
  return setup.ships.flatMap((s) => s.positions);
}

function analyzeSetup(setup: NotationSetup | undefined): {
  edgeBias: number; // % of cells touching edge
  clustering: number; // avg distance from fleet centroid
  spreadScore: number; // 0-100, higher = more spread out
} {
  const positions = getShipPositions(setup);
  if (positions.length === 0) return { edgeBias: 0, clustering: 0, spreadScore: 50 };

  let edgeCells = 0;
  for (const [r, c] of positions) {
    if (r === 0 || r === 9 || c === 0 || c === 9) edgeCells++;
  }
  const edgeBias = (edgeCells / positions.length) * 100;

  const avgR = positions.reduce((s, [r]) => s + r, 0) / positions.length;
  const avgC = positions.reduce((s, [, c]) => s + c, 0) / positions.length;
  const avgDist =
    positions.reduce((s, [r, c]) => s + distance(r, c, avgR, avgC), 0) /
    positions.length;

  // Spread score: max possible avg dist from centroid is ~4.5
  const spreadScore = Math.min(100, Math.round((avgDist / 4.5) * 100));

  return { edgeBias, clustering: avgDist, spreadScore };
}

function getPlayerMoves(moves: NotationMove[], player: 1 | 2): NotationMove[] {
  return moves.filter((m) => m.player === player);
}

function analyzeOpening(moves: NotationMove[], player: 1 | 2): {
  spreadScore: number;
  pattern: string;
} {
  const playerMoves = getPlayerMoves(moves, player);
  const first5 = playerMoves.slice(0, 5);
  if (first5.length < 3) return { spreadScore: 50, pattern: "too few moves" };

  let closeShots = 0;
  for (let i = 0; i < first5.length; i++) {
    for (let j = i + 1; j < first5.length; j++) {
      const d = distance(first5[i].row, first5[i].col, first5[j].row, first5[j].col);
      if (d <= 2) closeShots++;
    }
  }
  const pairs = (first5.length * (first5.length - 1)) / 2;
  const spreadScore = Math.max(0, Math.round(100 - (closeShots / pairs) * 100));

  let pattern = "balanced spread";
  if (spreadScore >= 80) pattern = "excellent spacing";
  else if (spreadScore <= 40) pattern = "clustered shots";

  return { spreadScore, pattern };
}

function analyzeHunting(moves: NotationMove[], player: 1 | 2): number {
  const playerMoves = getPlayerMoves(moves, player);
  let huntOpportunities = 0;
  let huntSuccesses = 0;

  for (let i = 1; i < playerMoves.length; i++) {
    const prev = playerMoves[i - 1];
    const curr = playerMoves[i];
    // If previous was a hit that didn't sink, check if current is adjacent
    if (prev.hit && !prev.sunk) {
      huntOpportunities++;
      const d = distance(prev.row, prev.col, curr.row, curr.col);
      if (d === 1) huntSuccesses++;
    }
  }

  if (huntOpportunities === 0) return 100;
  return Math.round((huntSuccesses / huntOpportunities) * 100);
}

function getTurningPoints(moves: NotationMove[]): Insight[] {
  const insights: Insight[] = [];
  if (moves.length === 0) return insights;

  // First blood
  const firstHit = moves.find((m) => m.hit);
  if (firstHit) {
    insights.push({
      type: "turning-point",
      player: firstHit.player,
      title: "First Blood",
      description: `Player ${firstHit.player} scored the first hit at ${coordStr(
        firstHit.row,
        firstHit.col
      )}.`,
      severity: "highlight",
    });
  }

  // First sunk ship
  const firstSunk = moves.find((m) => m.sunk);
  if (firstSunk) {
    insights.push({
      type: "turning-point",
      player: firstSunk.player,
      title: "First Sink",
      description: `Player ${firstSunk.player} sank the ${firstSunk.shipName} first, gaining a significant advantage.`,
      severity: "highlight",
    });
  }

  // Momentum shift: 3+ consecutive hits by one player
  let consecutiveHits = 0;
  let lastPlayer: 1 | 2 | null = null;
  for (const move of moves) {
    if (move.hit && move.player === lastPlayer) {
      consecutiveHits++;
      if (consecutiveHits === 3) {
        insights.push({
          type: "turning-point",
          player: move.player,
          title: "Hot Streak",
          description: `Player ${move.player} landed 3+ consecutive hits — devastating momentum.`,
          severity: "positive",
        });
      }
    } else if (move.hit) {
      consecutiveHits = 1;
      lastPlayer = move.player;
    } else {
      consecutiveHits = 0;
      lastPlayer = null;
    }
  }

  return insights;
}

function findMissedOpportunities(moves: NotationMove[], player: 1 | 2): Insight[] {
  const insights: Insight[] = [];
  const playerMoves = getPlayerMoves(moves, player);
  const shots = new Set(playerMoves.map((m) => `${m.row},${m.col}`));

  // For each hit that didn't immediately sink, check if orthogonal neighbors were shot later (not next)
  for (let i = 0; i < playerMoves.length; i++) {
    const move = playerMoves[i];
    if (!move.hit || move.sunk) continue;

    const neighbors = [
      [move.row - 1, move.col],
      [move.row + 1, move.col],
      [move.row, move.col - 1],
      [move.row, move.col + 1],
    ];

    let missedNeighbors = 0;
    for (const [nr, nc] of neighbors) {
      if (nr < 0 || nr > 9 || nc < 0 || nc > 9) continue;
      if (!shots.has(`${nr},${nc}`)) {
        missedNeighbors++;
      }
    }

    // If 2+ orthogonal neighbors were never shot, that might be a missed opportunity
    // But we only flag if the player eventually found the ship (meaning it existed)
    if (missedNeighbors >= 2 && i < playerMoves.length - 2) {
      const nextMoves = playerMoves.slice(i + 1, i + 4);
      const foundAdjacent = nextMoves.some(
        (m) => distance(m.row, m.col, move.row, move.col) <= 1
      );
      if (!foundAdjacent) {
        insights.push({
          type: "strategy",
          player,
          title: "Missed Hunt",
          description: `After hitting ${coordStr(move.row, move.col)}, Player ${player} didn't explore adjacent cells immediately.`,
          severity: "negative",
        });
        // Only show one per player to avoid spam
        break;
      }
    }
  }

  return insights;
}

function calculatePlayerStats(
  moves: NotationMove[],
  player: 1 | 2
): PlayerAnalysisStats {
  const playerMoves = getPlayerMoves(moves, player);
  const hits = playerMoves.filter((m) => m.hit).length;
  const misses = playerMoves.length - hits;
  const accuracy = playerMoves.length > 0 ? Math.round((hits / playerMoves.length) * 100) : 0;
  const shipsSunk = playerMoves.filter((m) => m.sunk).length;

  const firstHit = moves.find((m) => m.hit);
  const firstBlood = firstHit ? firstHit.player === player : false;

  const huntEfficiency = analyzeHunting(moves, player);

  // Average shots to sink: total shots by this player / ships they sunk
  const avgShotsToSink = shipsSunk > 0 ? Math.round((playerMoves.length / shipsSunk) * 10) / 10 : 0;

  return {
    totalShots: playerMoves.length,
    hits,
    misses,
    accuracy,
    shipsSunk,
    avgShotsToSink,
    firstBlood,
    huntEfficiency,
  };
}

export function analyzeGame(parsed: ParsedNotation): GameInsights {
  const insights: Insight[] = [];
  const { moves, setup, player1Name, player2Name } = parsed;

  // --- Setup insights ---
  const p1Setup = setup.find((s) => s.player === 1);
  const p2Setup = setup.find((s) => s.player === 2);

  const p1SetupAnalysis = analyzeSetup(p1Setup);
  const p2SetupAnalysis = analyzeSetup(p2Setup);

  for (const [player, stats, name] of [
    [1, p1SetupAnalysis, player1Name],
    [2, p2SetupAnalysis, player2Name],
  ] as [1 | 2, ReturnType<typeof analyzeSetup>, string][]) {
    if (stats.spreadScore >= 75) {
      insights.push({
        type: "setup",
        player,
        title: "Well-Spread Fleet",
        description: `${name} spread ships across the board, making them harder to find in clusters.`,
        severity: "positive",
      });
    } else if (stats.spreadScore <= 35) {
      insights.push({
        type: "setup",
        player,
        title: "Clustered Fleet",
        description: `${name}'s ships were grouped closely together — once one was found, others were nearby.`,
        severity: "negative",
      });
    }

    if (stats.edgeBias >= 60) {
      insights.push({
        type: "setup",
        player,
        title: "Edge Bias",
        description: `${name} placed most ships along the board edges. Edges reduce adjacency exposure but are common targets.`,
        severity: "neutral",
      });
    }
  }

  // --- Opening insights ---
  const p1Opening = analyzeOpening(moves, 1);
  const p2Opening = analyzeOpening(moves, 2);

  for (const [player, opening, name] of [
    [1, p1Opening, player1Name],
    [2, p2Opening, player2Name],
  ] as [1 | 2, ReturnType<typeof analyzeOpening>, string][]) {
    if (opening.spreadScore >= 80) {
      insights.push({
        type: "opening",
        player,
        title: "Strong Opening",
        description: `${name} spaced early shots well, maximizing coverage of the search grid.`,
        severity: "positive",
      });
    } else if (opening.spreadScore <= 40) {
      insights.push({
        type: "opening",
        player,
        title: "Clustered Opening",
        description: `${name}'s first shots were too close together, leaving large areas unscouted.`,
        severity: "negative",
      });
    }
  }

  // --- Turning points ---
  insights.push(...getTurningPoints(moves));

  // --- Missed opportunities ---
  insights.push(...findMissedOpportunities(moves, 1));
  insights.push(...findMissedOpportunities(moves, 2));

  // --- Hunting efficiency ---
  const p1Hunt = analyzeHunting(moves, 1);
  const p2Hunt = analyzeHunting(moves, 2);

  for (const [player, hunt, name] of [
    [1, p1Hunt, player1Name],
    [2, p2Hunt, player2Name],
  ] as [1 | 2, number, string][]) {
    if (hunt >= 90) {
      insights.push({
        type: "hunting",
        player,
        title: "Sharp Hunter",
        description: `${name} almost always followed up hits with adjacent shots, efficiently sinking ships.`,
        severity: "positive",
      });
    } else if (hunt <= 50) {
      insights.push({
        type: "hunting",
        player,
        title: "Erratic Hunting",
        description: `${name} often wandered away from hits instead of finishing ships quickly.`,
        severity: "negative",
      });
    }
  }

  // --- Accuracy insights ---
  const p1Stats = calculatePlayerStats(moves, 1);
  const p2Stats = calculatePlayerStats(moves, 2);

  for (const [player, stats, name] of [
    [1, p1Stats, player1Name],
    [2, p2Stats, player2Name],
  ] as [1 | 2, PlayerAnalysisStats, string][]) {
    if (stats.accuracy >= 40) {
      insights.push({
        type: "accuracy",
        player,
        title: "High Accuracy",
        description: `${name} maintained a ${stats.accuracy}% hit rate across ${stats.totalShots} shots.`,
        severity: "positive",
      });
    } else if (stats.accuracy <= 18 && stats.totalShots > 10) {
      insights.push({
        type: "accuracy",
        player,
        title: "Low Accuracy",
        description: `${name} struggled with a ${stats.accuracy}% hit rate — more systematic searching would help.`,
        severity: "negative",
      });
    }
  }

  // --- Verdict ---
  const p1Score = p1Stats.accuracy + p1Hunt + p1SetupAnalysis.spreadScore;
  const p2Score = p2Stats.accuracy + p2Hunt + p2SetupAnalysis.spreadScore;

  const winner = parsed.result === "1-0" ? 1 : parsed.result === "0-1" ? 2 : null;
  if (winner) {
    const winnerName = winner === 1 ? player1Name : player2Name;
    const loserName = winner === 1 ? player2Name : player1Name;
    insights.push({
      type: "verdict",
      player: winner,
      title: "Match Verdict",
      description: `${winnerName} outplayed ${loserName} with superior ${
        p1Score > p2Score
          ? winner === 1
            ? "positioning and accuracy"
            : "targeting discipline"
          : winner === 2
          ? "positioning and accuracy"
          : "targeting discipline"
      }.`,
      severity: "highlight",
    });
  }

  return {
    insights,
    player1Stats: p1Stats,
    player2Stats: p2Stats,
  };
}
