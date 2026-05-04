import React from "react";
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
}

const GameBoard: React.FC<GameBoardProps> = ({
  grid,
  onCellClick,
  isInteractive,
  title,
  isOpponentView,
  remainingShips,
}) => {
  const columns = "ABCDEFGHIJ";

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 text-center">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-600">
          Ships remaining: {remainingShips}
        </p>
      </div>
      <div className="inline-block bg-blue-900 p-2 rounded-lg shadow-lg">
        <div className="grid grid-cols-11 gap-0">
          <div className="w-8 h-8" />
          {Array(SIZE)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white text-xs sm:text-sm font-bold"
              >
                {columns[i]}
              </div>
            ))}
          {Array(SIZE)
            .fill(0)
            .map((_, row) => (
              <React.Fragment key={row}>
                <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                  {row + 1}
                </div>
                {Array(SIZE)
                  .fill(0)
                  .map((_, col) => (
                    <Cell
                      key={`${row}-${col}`}
                      state={grid[row][col]}
                      onClick={() => onCellClick(row, col)}
                      isInteractive={
                        isInteractive && grid[row][col] === "empty"
                      }
                      isOpponentView={isOpponentView}
                    />
                  ))}
              </React.Fragment>
            ))}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
