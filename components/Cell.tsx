import React from "react";
import { CellState } from "../lib/types";

interface CellProps {
  state: CellState;
  onClick: () => void;
  isInteractive: boolean;
  isOpponentView: boolean;
}

const Cell: React.FC<CellProps> = ({
  state,
  onClick,
  isInteractive,
  isOpponentView,
}) => {
  const getBgColor = () => {
    if (isOpponentView && state === "ship") {
      return "bg-blue-500";
    }
    switch (state) {
      case "ship":
        return "bg-gray-600";
      case "hit":
        return "bg-red-500";
      case "miss":
        return "bg-blue-200";
      case "sunk":
        return "bg-red-800";
      default:
        return "bg-blue-500 hover:bg-blue-400";
    }
  };

  const getContent = () => {
    if (isOpponentView && state === "ship") return "";
    switch (state) {
      case "hit":
        return "💥";
      case "miss":
        return "•";
      case "sunk":
        return "🔥";
      default:
        return "";
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={!isInteractive}
      className={`
        w-full aspect-square border border-blue-700
        flex items-center justify-center
        text-sm sm:text-base font-bold
        transition-colors duration-150
        ${getBgColor()}
        ${isInteractive ? "cursor-pointer" : "cursor-default"}
        ${!isInteractive && state === "empty" ? "bg-blue-500" : ""}
      `}
      aria-label={`Cell ${state}`}
    >
      {getContent()}
    </button>
  );
};

export default Cell;
