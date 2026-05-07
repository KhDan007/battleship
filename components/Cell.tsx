import React, { useState } from "react";
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
  isBattle?: boolean;
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
  isBattle = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getClassName = () => {
    if (isPreview) {
      const base = isPreviewValid
        ? "board-cell board-cell-valid preview-valid cursor-pointer"
        : "board-cell board-cell-invalid preview-invalid cursor-not-allowed";
      return base;
    }

    let base = "board-cell ";
    switch (state) {
      case "ship":
        base += isOpponentView ? "board-cell-empty " : "board-cell-ship ";
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
        base += isInteractive ? "board-cell-empty cursor-pointer" : "board-cell-empty ";
    }

    if (isBattle && isInteractive) {
      base += "board-cell-battle ";
      if (isHovered) {
        base += "board-cell-battle-hovered ";
      }
    }

    return base;
  };

  const getContent = () => {
    if (isPreview) return "";
    if (isOpponentView && state === "ship") return "";
    switch (state) {
      case "hit":
        return <span className="hit-text dark:text-white text-slate-900 text-lg">💥</span>;
      case "miss":
        return <span className="miss-text dark:text-blue-800 text-blue-600 text-lg">●</span>;
      case "sunk":
        return <span className="hit-text dark:text-white text-slate-900 text-lg">🔥</span>;
      default:
        return "";
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onMouseEnter?.();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onMouseLeave?.();
  };

  return (
    <button
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={!isInteractive && !isPreview}
      className={getClassName()}
      aria-label={`Cell ${state}`}
    >
      {getContent()}
    </button>
  );
};

export default Cell;
