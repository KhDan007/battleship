"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ParsedNotation } from "../lib/notation";
import {
  generateProbabilityMap,
  formatProbabilityMap,
  getTopProbabilityCells,
  ProbabilityCell,
} from "../lib/probabilityMap";

interface AIFeedbackPanelProps {
  parsed: ParsedNotation;
  currentMove: number;
}

function coordStr(row: number, col: number): string {
  return `${"ABCDEFGHIJ"[col]}${row + 1}`;
}

function getHeatColor(value: number): string {
  if (value <= 0) return "bg-slate-800/30 dark:bg-slate-800/50";
  if (value < 20) return "bg-blue-200 dark:bg-blue-900/40";
  if (value < 40) return "bg-blue-300 dark:bg-blue-800/50";
  if (value < 60) return "bg-amber-300 dark:bg-amber-700/50";
  if (value < 80) return "bg-orange-400 dark:bg-orange-600/60";
  return "bg-red-500 dark:bg-red-500/70";
}

function ProbabilityGrid({ map }: { map: number[][] }) {
  const cols = "ABCDEFGHIJ";
  return (
    <div className="inline-block">
      <div className="grid grid-cols-11 gap-0.5">
        <div className="w-5 h-5" />
        {cols.split("").map((c) => (
          <div
            key={c}
            className="w-5 h-5 flex items-center justify-center text-[9px] dark:text-slate-500 text-slate-400 font-mono"
          >
            {c}
          </div>
        ))}
      </div>
      {map.map((row, rIdx) => (
        <div key={rIdx} className="grid grid-cols-11 gap-0.5">
          <div className="w-5 h-5 flex items-center justify-center text-[9px] dark:text-slate-500 text-slate-400 font-mono">
            {rIdx + 1}
          </div>
          {row.map((val, cIdx) => (
            <div
              key={cIdx}
              className={`w-5 h-5 rounded-sm ${getHeatColor(val)} flex items-center justify-center text-[7px] font-mono ${
                val > 0 ? "text-white/90" : "dark:text-slate-600 text-slate-400"
              }`}
              title={val === -1 ? "Shot" : val === 0 ? "Impossible" : `${val}% probability`}
            >
              {val > 0 ? val : val === -1 ? "×" : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

interface SmartInsight {
  moveNumber: number;
  player: 1 | 2;
  shot: string;
  actualResult: string;
  wasOptimal: boolean;
  topCells: ProbabilityCell[];
  explanation: string;
}

export default function AIFeedbackPanel({ parsed, currentMove }: AIFeedbackPanelProps) {
  const [smartInsight, setSmartInsight] = useState<SmartInsight | null>(null);
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartError, setSmartError] = useState<string | null>(null);

  const currentPlayerMove = useMemo(() => {
    if (currentMove < 0) return null;
    return parsed.moves[currentMove];
  }, [parsed, currentMove]);

  // Generate local probability map for the current move's player
  const probabilityMap = useMemo(() => {
    if (currentMove < 0) return null;
    const player = parsed.moves[currentMove]?.player || 1;
    return generateProbabilityMap(parsed, player, currentMove);
  }, [parsed, currentMove]);

  // Fetch smart insight from OpenAI when move changes
  useEffect(() => {
    if (currentMove < 0 || !currentPlayerMove) {
      setSmartInsight(null);
      return;
    }

    let cancelled = false;

    async function fetchInsight() {
      setSmartLoading(true);
      setSmartError(null);

      try {
        const player = currentPlayerMove!.player;
        const { map } = generateProbabilityMap(parsed, player, currentMove);
        const topCells = getTopProbabilityCells(map, 5);
        const actualShot = coordStr(currentPlayerMove!.row, currentPlayerMove!.col);

        const isOptimal = topCells.some(
          (c) => c.row === currentPlayerMove!.row && c.col === currentPlayerMove!.col
        );

        const systemPrompt = `You are a Battleship strategy coach. Analyze ONE move and give a single concise tip (2-3 sentences max) in simple, friendly language.

Move: Player ${player} shot ${actualShot} at move ${currentPlayerMove!.number}.
Result: ${currentPlayerMove!.hit ? "HIT" : "MISS"}${currentPlayerMove!.shipName ? ` on ${currentPlayerMove!.shipName}` : ""}${currentPlayerMove!.sunk ? " and SUNK the ship" : ""}.

Top probability cells before this shot: ${topCells
          .map((c) => `${c.label} (${c.probability}%)`)
          .join(", ")}.

The shot WAS${isOptimal ? "" : " NOT"} one of the top probability cells.

Probability map (XX = already shot, . = impossible, numbers = % chance):
${formatProbabilityMap(map)}

Give one specific, actionable tip about this move. If it was optimal, explain WHY the probability map favored it. If it was suboptimal, explain what higher-probability cells were available and why. Keep it under 60 words.`;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: "Analyze this move." },
            ],
            temperature: 0.6,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "API error");
        }

        const data = await res.json();
        const explanation = data.choices?.[0]?.message?.content || "No insight available.";

        if (!cancelled) {
          setSmartInsight({
            moveNumber: currentPlayerMove!.number,
            player,
            shot: actualShot,
            actualResult: currentPlayerMove!.hit
              ? `HIT${currentPlayerMove!.sunk ? " + SINK" : ""}`
              : "MISS",
            wasOptimal: isOptimal,
            topCells,
            explanation,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setSmartError(err instanceof Error ? err.message : "Failed to get insight");
        }
      } finally {
        if (!cancelled) {
          setSmartLoading(false);
        }
      }
    }

    fetchInsight();

    return () => {
      cancelled = true;
    };
  }, [currentMove, parsed, currentPlayerMove]);

  if (currentMove < 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs dark:text-slate-400 text-slate-500 leading-relaxed">
          The AI Insights panel shows a <strong>probability heatmap</strong> and smart analysis for each move.
          Use the arrow keys or click a move in the Move List to start analyzing.
        </p>
        <div className="rounded-lg border dark:border-slate-700 border-slate-200 p-3 dark:bg-slate-800/50 bg-slate-50">
          <h4 className="text-xs font-bold dark:text-slate-300 text-slate-600 mb-1">How it works</h4>
          <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">
            The heatmap counts how many valid ship placements could include each cell, given what the player knew at that moment. Red = high probability. Blue = low. XX = already shot. This is the same math the Hard Bot uses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Move header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold dark:text-slate-200 text-slate-700">
          Move {currentPlayerMove?.number} — Player {currentPlayerMove?.player}
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            currentPlayerMove?.hit
              ? "bg-red-500/20 text-red-400"
              : "bg-blue-500/20 text-blue-400"
          }`}
        >
          {currentPlayerMove?.hit ? "HIT" : "MISS"}
          {currentPlayerMove?.sunk ? " + SINK" : ""}
        </span>
      </div>

      {/* Smart Insight Card */}
      <div className="rounded-lg border dark:border-purple-500/30 border-purple-300/50 dark:bg-purple-500/5 bg-purple-50 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-sm">🧠</span>
          <h4 className="text-xs font-bold dark:text-purple-300 text-purple-700">AI Coach Tip</h4>
        </div>
        {smartLoading ? (
          <div className="flex items-center gap-2 text-xs dark:text-slate-400 text-slate-500">
            <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            Analyzing move with probability map...
          </div>
        ) : smartError ? (
          <p className="text-xs text-red-400">{smartError}</p>
        ) : smartInsight ? (
          <p className="text-xs dark:text-slate-300 text-slate-600 leading-relaxed">
            {smartInsight.explanation}
          </p>
        ) : null}
      </div>

      {/* Probability Heatmap */}
      {probabilityMap && (
        <div className="rounded-lg border dark:border-slate-700 border-slate-200 p-3 dark:bg-slate-800/50 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold dark:text-slate-300 text-slate-600">
              Probability Heatmap
            </h4>
            <span className="text-[10px] dark:text-slate-500 text-slate-400">
              P{currentPlayerMove?.player}&apos;s view
            </span>
          </div>
          <div className="flex justify-center overflow-x-auto">
            <ProbabilityGrid map={probabilityMap.map} />
          </div>
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-blue-200 dark:bg-blue-900/40" />
              <span className="text-[9px] dark:text-slate-500 text-slate-400">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-amber-300 dark:bg-amber-700/50" />
              <span className="text-[9px] dark:text-slate-500 text-slate-400">Med</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-red-500 dark:bg-red-500/70" />
              <span className="text-[9px] dark:text-slate-500 text-slate-400">High</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Cells */}
      {probabilityMap && (
        <div className="rounded-lg border dark:border-slate-700 border-slate-200 p-3 dark:bg-slate-800/50 bg-slate-50">
          <h4 className="text-xs font-bold dark:text-slate-300 text-slate-600 mb-1.5">
            Top Targets
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {getTopProbabilityCells(probabilityMap.map, 5).map((cell, i) => (
              <span
                key={i}
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  cell.row === currentPlayerMove?.row && cell.col === currentPlayerMove?.col
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50"
                    : "dark:bg-slate-700 dark:text-slate-300 bg-slate-200 text-slate-600"
                }`}
              >
                {cell.label} {cell.probability}%
                {cell.row === currentPlayerMove?.row && cell.col === currentPlayerMove?.col && " ✓"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* General tip */}
      <div className="rounded-lg border dark:border-slate-700 border-slate-200 p-3 dark:bg-slate-800/50 bg-slate-50">
        <h4 className="text-xs font-bold dark:text-slate-300 text-slate-600 mb-1">Reading the Map</h4>
        <ul className="text-[11px] dark:text-slate-400 text-slate-500 space-y-1 list-disc list-inside leading-relaxed">
          <li>Red cells have the most valid ship placements passing through them.</li>
          <li>After a hit, adjacent cells in line with the hit cluster become hot.</li>
          <li>Cells marked &quot;.&quot; are impossible due to adjacency rules or misses.</li>
          <li>Compare the actual shot (✓) against the top targets to judge quality.</li>
        </ul>
      </div>
    </div>
  );
}
