import React from "react";
import { SHIP_DEFINITIONS } from "../lib/constants";
import { Ship } from "../lib/types";

interface ShipPlacementProps {
  placedShips: Ship[];
  selectedShip: string | null;
  onSelectShip: (shipId: string | null) => void;
  isHorizontal: boolean;
  onToggleOrientation: () => void;
  playerName: string;
  onConfirm: () => void;
  isReady: boolean;
}

const ShipPlacement: React.FC<ShipPlacementProps> = ({
  placedShips,
  selectedShip,
  onSelectShip,
  isHorizontal,
  onToggleOrientation,
  playerName,
  onConfirm,
  isReady,
}) => {
  const placedShipIds = placedShips.map((s) => s.id);

  return (
    <div className="card p-5 max-w-md w-full">
      <h3 className="text-lg font-bold mb-4 text-slate-100">
        {playerName} - Place Your Ships
      </h3>

      <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Orientation</span>
          <span className="text-sm font-bold text-blue-400">
            {isHorizontal ? "↔ Horizontal" : "↕ Vertical"}
          </span>
        </div>
        <button
          onClick={onToggleOrientation}
          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg
                     text-sm font-medium transition-colors duration-200
                     border border-slate-600 hover:border-slate-500"
        >
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs font-bold text-blue-400">R</kbd> or click to rotate
        </button>
      </div>

      <div className="space-y-2.5 mb-5">
        {SHIP_DEFINITIONS.map((def) => {
          const isPlaced = placedShipIds.includes(def.id);
          return (
            <button
              key={def.id}
              onClick={() =>
                !isPlaced && onSelectShip(isPlaced ? null : def.id)
              }
              disabled={isPlaced}
              className={`
                w-full p-3 rounded-lg border-2 transition-all duration-200 text-left
                ${selectedShip === def.id
                  ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                  : "border-slate-700 bg-slate-800/50"
                }
                ${isPlaced
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-slate-500 cursor-pointer hover:bg-slate-800"
                }
              `}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className={`font-semibold ${isPlaced ? "line-through text-slate-500" : "text-slate-200"}`}>
                  {def.name}
                </span>
                <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                  Size: {def.size}
                </span>
              </div>
              <div className="flex gap-0.5">
                {Array(def.size)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className={`h-2.5 flex-1 rounded-sm transition-colors ${
                        isPlaced ? "bg-slate-600" : "bg-slate-500"
                      } ${selectedShip === def.id ? "bg-blue-500" : ""}`}
                    />
                  ))}
              </div>
              {isPlaced && (
                <div className="mt-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                  <span className="text-xs text-emerald-500 font-medium">Placed</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {placedShips.length === SHIP_DEFINITIONS.length && !isReady && (
        <button
          onClick={onConfirm}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg
                     font-bold transition-colors duration-200
                     shadow-lg shadow-emerald-600/30"
        >
          Confirm & Start Battle
        </button>
      )}

      <div className="mt-3 flex items-center justify-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-slate-600" />
        <p className="text-xs text-slate-500">
          {placedShips.length}/{SHIP_DEFINITIONS.length} ships placed
        </p>
      </div>
    </div>
  );
};

export default ShipPlacement;
