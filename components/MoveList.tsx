"use client";

import React, { useRef, useEffect } from "react";
import { NotationMove } from "../lib/notation";

interface MoveListProps {
  moves: NotationMove[];
  currentMove: number;
  onSelectMove: (index: number) => void;
}

function coordToString(row: number, col: number): string {
  const cols = "ABCDEFGHIJ";
  return `${cols[col]}${row + 1}`;
}

export default function MoveList({ moves, currentMove, onSelectMove }: MoveListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to keep current move visible
  useEffect(() => {
    if (activeRef.current && listRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [currentMove]);

  if (moves.length === 0) {
    return (
      <div className="text-center py-4 text-sm dark:text-slate-400 text-slate-500">
        No moves recorded.
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="max-h-64 overflow-y-auto rounded-lg dark:bg-slate-800/50 bg-slate-100/50 border dark:border-slate-700 border-slate-200"
    >
      {moves.map((move, index) => {
        const isActive = index === currentMove;
        return (
          <div
            key={index}
            ref={isActive ? activeRef : null}
            onClick={() => onSelectMove(index)}
            className={`px-3 py-1.5 text-sm font-mono cursor-pointer transition-colors border-b dark:border-slate-700/50 border-slate-200/50 last:border-b-0
              ${isActive
                ? "dark:bg-blue-500/20 bg-blue-100 dark:text-blue-300 text-blue-700"
                : "dark:text-slate-300 text-slate-600 hover:dark:bg-slate-700/50 hover:bg-slate-200/50"
              }`}
          >
            <span className="inline-block w-8 text-right mr-2 opacity-60">
              {move.number}.
            </span>
            <span className={`font-semibold mr-2 ${move.player === 1 ? "text-blue-400" : "text-amber-400"}`}>
              P{move.player}
            </span>
            <span className="mr-2">{coordToString(move.row, move.col)}</span>
            <span className={`mr-2 font-bold ${move.hit ? "text-red-400" : "text-blue-400"}`}>
              {move.hit ? "x" : "o"}
            </span>
            {move.hit && move.shipName && (
              <span className="text-xs dark:text-slate-400 text-slate-500">
                {move.shipName}{move.sunk ? "*" : ""}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
