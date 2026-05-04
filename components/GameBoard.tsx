import React, { useState, useCallback, useMemo } from "react";
import { CellState } from "../lib/types";
import { BOARD_SIZE as SIZE } from "../lib/constants";
import Cell from "./Cell";

interface GameBoardProps {
  grid: CellState[][];
  onCellClick: (row: number, col: number) => void;
  isInteractive: boolean;
  title: string;
  isOpponentView: boolean;
  remainingShips: number;
  selectedShipSize?: number;
  isHorizontal?: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  onCellClick,
  isInteractive,
  title,
  isOpponentView,
  remainingShips,
  selectedShipSize,
  isHorizontal,
}) => {
  const [hoverPos, setHoverPos] = useState<[number, number] | null>(null);
  const columns = "ABCDEFGHIJ";

  const previewCells = useMemo(() => {
    if (!hoverPos || !selectedShipSize) return new Set<string>();
    const [row, col] = hoverPos;
    const cells = new Set<string>();
    if (isHorizontal) {
      if (col + selectedShipSize > SIZE) return new Set();
      for (let i = 0; i < selectedShipSize; i++) {
        if (grid[row][col + i] !== "empty") return new Set();
        cells.add(`${row}-${col + i}`);
      }
    } else {
      if (row + selectedShipSize > SIZE) return new Set();
      for (let i = 0; i < selectedShipSize; i++) {
        if (grid[row + i][col] !== "empty") return new Set();
        cells.add(`${row + i}-${col}`);
      }
    }
    return cells;
  }, [hoverPos, selectedShipSize, isHorizontal, grid]);

  const isValidPlacement = previewCells.size > 0;

  const handleClick = (row: number, col: number) => {
    if (selectedShipSize && hoverPos) {
      onCellClick(hoverPos[0], hoverPos[1]);
    } else if (!selectedShipSize) {
      onCellClick(row, col);
    }
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 text-center">
        <h2 className="text-lg sm:text-xl font-bold text-slate-100">{title}</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <p className="text-sm text-slate-400">
            Ships remaining:{" "}
            <span className="text-white font-semibold">{remainingShips}</span>
          </p>
        </div>
      </div>
      <div className="inline-block bg-slate-900 p-2 rounded-lg shadow-inner border border-slate-700">
        <div className="grid grid-cols-11 gap-[2px]">
          <div className="w-8 h-8" />
          {Array(SIZE)
            .fill(0)
            .map((_, i) => (
              <div
                key={`col-${i}`}
                className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold"
              >
                {columns[i]}
              </div>
            ))}
          {Array(SIZE)
            .fill(0)
            .map((_, row) => (
              <React.Fragment key={`row-${row}`}>
                <div className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs font-bold">
                  {row + 1}
                </div>
                {Array(SIZE)
                  .fill(0)
                  .map((_, col) => {
                    const previewKey = `${row}-${col}`;
                    const isPreview = previewCells.has(previewKey);
                    const showPreview = isPreview && selectedShipSize !== undefined;

                    return (
                      <Cell
                        key={previewKey}
                        state={showPreview ? "empty" : grid[row][col]}
                        onClick={() => handleClick(row, col)}
                        onMouseEnter={
                          selectedShipSize
                            ? () => setHoverPos([row, col])
                            : undefined
                        }
                        onMouseLeave={() => setHoverPos(null)}
                        isInteractive={
                          isInteractive &&
                          !showPreview &&
                          grid[row][col] === "empty"
                        }
                        isOpponentView={isOpponentView}
                        isPreview={showPreview}
                        isPreviewValid={isValidPlacement}
                      />
                    );
                  })}
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
