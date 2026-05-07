"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { parseNotation, reconstructBoards, ParsedNotation } from "../lib/notation";
import MoveList from "./MoveList";
import { CellState } from "../lib/types";

interface GameAnalysisProps {
  notation: string;
  onExit: () => void;
}

function AnalysisCell({ state }: { state: CellState }) {
  const baseClass =
    "w-full h-full rounded-sm flex items-center justify-center text-xs font-bold";

  switch (state) {
    case "ship":
      return (
        <div
          className={`${baseClass} bg-slate-500 border-2 border-slate-400 dark:bg-slate-500 dark:border-slate-400`}
          title="Ship"
        />
      );
    case "hit":
      return (
        <div
          className={`${baseClass} bg-red-100 border border-red-400 dark:bg-red-950/60 dark:border-red-500/60`}
          title="Hit"
        >
          <span className="text-red-600 dark:text-red-400">×</span>
        </div>
      );
    case "miss":
      return (
        <div
          className={`${baseClass} bg-blue-50 border border-blue-300 dark:bg-blue-950/30 dark:border-blue-500/30`}
          title="Miss"
        >
          <span className="text-blue-400 dark:text-blue-500">·</span>
        </div>
      );
    case "sunk":
      return (
        <div
          className={`${baseClass} bg-red-200 border-2 border-red-500 dark:bg-red-900/80 dark:border-red-400`}
          title="Sunk"
        >
          <span className="text-red-700 dark:text-red-300">✱</span>
        </div>
      );
    default:
      return (
        <div
          className={`${baseClass} bg-sky-50/50 border border-sky-100 dark:bg-slate-800/40 dark:border-slate-700/40`}
          title="Empty"
        />
      );
  }
}

function AnalysisBoard({
  grid,
  title,
  visible,
}: {
  grid: CellState[][];
  title: string;
  visible: boolean;
}) {
  if (!visible) return null;

  const cols = "ABCDEFGHIJ";

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-semibold mb-2 dark:text-slate-300 text-slate-600">
        {title}
      </h3>
      <div className="inline-block">
        {/* Column headers */}
        <div className="grid grid-cols-11 gap-0.5">
          <div className="w-6 h-6" />
          {cols.split("").map((c) => (
            <div
              key={c}
              className="w-6 h-6 flex items-center justify-center text-[10px] dark:text-slate-500 text-slate-400 font-mono"
            >
              {c}
            </div>
          ))}
        </div>
        {/* Rows */}
        {grid.map((row, rIdx) => (
          <div key={rIdx} className="grid grid-cols-11 gap-0.5">
            <div className="w-6 h-6 flex items-center justify-center text-[10px] dark:text-slate-500 text-slate-400 font-mono">
              {rIdx + 1}
            </div>
            {row.map((cell, cIdx) => (
              <div key={cIdx} className="w-6 h-6">
                <AnalysisCell state={cell} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameAnalysis({ notation, onExit }: GameAnalysisProps) {
  const [parsed, setParsed] = useState<ParsedNotation | null>(null);
  const [currentMove, setCurrentMove] = useState(-1);
  const [showP1Board, setShowP1Board] = useState(true);
  const [showP2Board, setShowP2Board] = useState(true);

  useEffect(() => {
    const result = parseNotation(notation);
    setParsed(result);
    setCurrentMove(-1);
  }, [notation]);

  const boardState = useMemo(() => {
    if (!parsed) return null;
    return reconstructBoards(parsed, currentMove);
  }, [parsed, currentMove]);

  const goToMove = useCallback(
    (index: number) => {
      if (!parsed) return;
      const max = parsed.moves.length - 1;
      if (index < -1) index = -1;
      if (index > max) index = max;
      setCurrentMove(index);
    },
    [parsed]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!parsed) return;
      const max = parsed.moves.length - 1;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToMove(currentMove - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          goToMove(currentMove + 1);
          break;
        case "Home":
          e.preventDefault();
          goToMove(-1);
          break;
        case "End":
          e.preventDefault();
          goToMove(max);
          break;
        case "Escape":
          e.preventDefault();
          onExit();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [parsed, currentMove, goToMove, onExit]);

  if (!parsed || !boardState) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 dark:bg-slate-900 bg-white">
        <div className="text-center">
          <p className="dark:text-slate-400 text-slate-500">Loading analysis...</p>
        </div>
      </div>
    );
  }

  const totalMoves = parsed.moves.length;
  const currentMoveNumber = currentMove + 1; // -1 -> 0 for display

  return (
    <div className="fixed inset-0 z-50 flex flex-col dark:bg-slate-900 bg-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700 border-slate-200 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold dark:text-white text-slate-900">
            Analysis Mode
          </h2>
          <span className="text-sm dark:text-slate-400 text-slate-500 font-mono">
            Move {Math.max(0, currentMoveNumber)} / {totalMoves}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Board visibility toggles */}
          <label className="flex items-center gap-1.5 text-sm cursor-pointer dark:text-slate-300 text-slate-600">
            <input
              type="checkbox"
              checked={showP1Board}
              onChange={(e) => setShowP1Board(e.target.checked)}
              className="rounded dark:border-slate-600 border-slate-300"
            />
            P1
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer dark:text-slate-300 text-slate-600">
            <input
              type="checkbox"
              checked={showP2Board}
              onChange={(e) => setShowP2Board(e.target.checked)}
              className="rounded dark:border-slate-600 border-slate-300"
            />
            P2
          </label>
          <button
            onClick={onExit}
            className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0">
        {/* Boards */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="flex flex-col sm:flex-row gap-6 items-start justify-center">
            <AnalysisBoard
              grid={boardState.player1Grid}
              title={`${parsed.player1Name}'s Fleet`}
              visible={showP1Board}
            />
            <AnalysisBoard
              grid={boardState.player2Grid}
              title={`${parsed.player2Name}'s Fleet`}
              visible={showP2Board}
            />
          </div>

          {/* Navigation controls */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => goToMove(-1)}
              disabled={currentMove <= -1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 dark:disabled:opacity-30 bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-30 transition-colors"
            >
              |&lt; Start
            </button>
            <button
              onClick={() => goToMove(currentMove - 1)}
              disabled={currentMove <= -1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 dark:disabled:opacity-30 bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-30 transition-colors"
            >
              &lt; Prev
            </button>
            <span className="text-sm font-mono dark:text-slate-400 text-slate-500 min-w-[80px] text-center">
              {currentMove >= 0 ? parsed.moves[currentMove].number : "Setup"}
            </span>
            <button
              onClick={() => goToMove(currentMove + 1)}
              disabled={currentMove >= totalMoves - 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 dark:disabled:opacity-30 bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-30 transition-colors"
            >
              Next &gt;
            </button>
            <button
              onClick={() => goToMove(totalMoves - 1)}
              disabled={currentMove >= totalMoves - 1}
              className="px-3 py-1.5 rounded-lg text-sm font-medium dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 dark:disabled:opacity-30 bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-30 transition-colors"
            >
              End &gt;|
            </button>
          </div>
        </div>

        {/* Move list sidebar */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col">
          <h3 className="text-sm font-semibold mb-2 dark:text-slate-300 text-slate-600">
            Move List
          </h3>
          <div className="flex-1 min-h-0">
            <MoveList
              moves={parsed.moves}
              currentMove={currentMove}
              onSelectMove={goToMove}
            />
          </div>
          <div className="mt-2 text-xs dark:text-slate-500 text-slate-400">
            Use arrow keys to navigate. Esc to exit.
          </div>
        </div>
      </div>
    </div>
  );
}
