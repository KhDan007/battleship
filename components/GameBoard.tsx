import React, { useState, useMemo } from "react";
import { CellState } from "../lib/types";
import { BOARD_SIZE as SIZE } from "../lib/constants";
import { canPlaceShip } from "../lib/gameLogic";
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
        cells.add(`${row}-${col + i}`);
      }
    } else {
      if (row + selectedShipSize > SIZE) return new Set();
      for (let i = 0; i < selectedShipSize; i++) {
        cells.add(`${row + i}-${col}`);
      }
    }
    return cells;
  }, [hoverPos, selectedShipSize, isHorizontal]);

  const isValidPlacement = useMemo(() => {
    if (!hoverPos || !selectedShipSize) return false;
    const [row, col] = hoverPos;
    return canPlaceShip(grid, selectedShipSize, row, col, !!isHorizontal);
  }, [hoverPos, selectedShipSize, isHorizontal, grid]);

  const handleClick = (row: number, col: number) => {
    if (selectedShipSize && hoverPos) {
      onCellClick(hoverPos[0], hoverPos[1]);
    } else if (!selectedShipSize) {
      onCellClick(row, col);
    }
  };

  const isCellInteractive = (row: number, col: number) => {
    if (!isInteractive) return false;
    const cellState = grid[row][col];
    return cellState !== "hit" && cellState !== "miss" && cellState !== "sunk";
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-3 text-center">
        <h2 className="text-lg sm:text-xl font-bold dark:text-slate-100 text-slate-900">{title}</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <div className="h-2 w-2 rounded-full dark:bg-blue-400 bg-blue-500 animate-pulse" />
          <p className="text-sm dark:text-slate-400 text-slate-500">
            Ships remaining:{" "}
            <span className="dark:text-white text-slate-900 font-semibold">{remainingShips}</span>
          </p>
        </div>
      </div>
      <div className="flex justify-center">
        <div className="board-container">
          <div className="grid grid-cols-11 gap-[3px]">
            <div className="w-8 h-8" />
            {Array(SIZE)
              .fill(0)
              .map((_, i) => (
                <div
                  key={`col-${i}`}
                  className="w-8 h-8 flex items-center justify-center dark:text-slate-400 text-slate-500 text-xs font-bold"
                >
                  {columns[i]}
                </div>
              ))}
            {Array(SIZE)
              .fill(0)
              .map((_, row) => (
                <React.Fragment key={`row-${row}`}>
                  <div className="w-8 h-8 flex items-center justify-center dark:text-slate-400 text-slate-500 text-xs font-bold">
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
                          isInteractive={isCellInteractive(row, col)}
                          isOpponentView={isOpponentView}
                          isPreview={showPreview}
                          isPreviewValid={isValidPlacement}
                          isBattle={isInteractive && !selectedShipSize}
                        />
                      );
                    })}
                </React.Fragment>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
