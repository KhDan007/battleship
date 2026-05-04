import React from "react";
import { CellState } from "../lib/types";

interface CellProps {
  state: CellState;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isInteractive: boolean;
  isOpponentView: boolean;
  isPreview?: boolean;
  isPreviewValid?: boolean;
}

const Cell: React.FC<CellProps> = ({
  state,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isInteractive,
  isOpponentView,
  isPreview = false,
  isPreviewValid = true,
}) => {
  const getClassName = () => {
    if (isPreview) {
      return isPreviewValid
        ? "board-cell board-cell-valid ship-preview cursor-pointer"
        : "board-cell board-cell-invalid ship-preview cursor-not-allowed";
    }

    let base = "board-cell ";
    switch (state) {
      case "ship":
        base += isOpponentView ? "bg-blue-600 " : "board-cell-ship ";
        break;
      case "hit":
        base += "board-cell-hit ";
        break;
      case "miss":
        base += "board-cell-miss ";
        break;
      case "sunk":
        base += "board-cell-sunk ";
        break;
      default:
        base += isInteractive ? "board-cell-empty cursor-pointer" : "bg-blue-600 ";
    }
    return base;
  };

  const getContent = () => {
    if (isPreview) return "";
    if (isOpponentView && state === "ship") return "";
    switch (state) {
      case "hit":
        return <span className="hit-text text-white text-lg">💥</span>;
      case "miss":
        return <span className="miss-text text-blue-800 text-lg">●</span>;
      case "sunk":
        return <span className="hit-text text-white text-lg">🔥</span>;
      default:
        return "";
    }
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={!isInteractive && !isPreview}
      className={getClassName()}
      aria-label={`Cell ${state}`}
    >
      {getContent()}
    </button>
  );
};

export default Cell;
