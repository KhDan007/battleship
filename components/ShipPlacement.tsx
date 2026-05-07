"use client";

import React from "react";
import { SHIP_DEFINITIONS } from "../lib/constants";
import { Ship } from "../lib/types";

interface ShipPlacementProps {
  placedShips: Ship[];
  selectedShip: string | null;
  onSelectShip: (shipId: string | null) => void;
  onRemoveShip?: (shipId: string) => void;
  isHorizontal: boolean;
  onToggleOrientation: () => void;
  playerName: string;
  onConfirm: () => void;
  isReady: boolean;
  onAutoPlace: () => void;
  isAutoPlacing?: boolean;
}

const ShipPlacement: React.FC<ShipPlacementProps> = ({
  placedShips,
  selectedShip,
  onSelectShip,
  onRemoveShip,
  isHorizontal,
  onToggleOrientation,
  playerName,
  onConfirm,
  isReady,
  onAutoPlace,
  isAutoPlacing = false,
}) => {
  const placedShipIds = placedShips.map((s) => s.id);

  return (
    <div className="card p-5 max-w-md w-full">
      <h3 className="text-lg font-bold mb-4 dark:text-slate-100 text-slate-900">
        {playerName} - Place Your Ships
      </h3>

      <div className="mb-4 p-3 dark:bg-slate-900/50 bg-slate-100 rounded-lg dark:border-slate-700 border-slate-200 border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm dark:text-slate-400 text-slate-500">Orientation</span>
          <span className="text-sm font-bold dark:text-blue-400 text-blue-600">
            {isHorizontal ? "↔ Horizontal" : "↕ Vertical"}
          </span>
        </div>
        <button
          onClick={onToggleOrientation}
          className="w-full py-2 dark:bg-slate-700 dark:hover:bg-slate-600 bg-slate-200 hover:bg-slate-300
                     dark:text-slate-200 text-slate-700 rounded-lg
                     text-sm font-medium transition-colors duration-200
                     dark:border-slate-600 border-slate-300 border"
        >
          Press <kbd className="px-1.5 py-0.5 dark:bg-slate-800 dark:text-blue-400 bg-slate-50 text-blue-600 dark:border-slate-600 border-slate-300 border rounded text-xs font-bold">R</kbd> or click to rotate
        </button>
      </div>

      <div className="space-y-2.5 mb-5">
        {SHIP_DEFINITIONS.map((def) => {
          const isPlaced = placedShipIds.includes(def.id);
          return (
            <div
              key={def.id}
              onClick={() =>
                !isPlaced && onSelectShip(isPlaced ? null : def.id)
              }
              className={`
                w-full p-3 rounded-lg border-2 transition-all duration-200 text-left
                ${selectedShip === def.id
                  ? "dark:border-blue-500 border-blue-600 dark:bg-blue-500/10 bg-blue-50 shadow-lg dark:shadow-blue-500/20 shadow-blue-200"
                  : "dark:border-slate-700 border-slate-200 dark:bg-slate-800/50 bg-white"
                }
                ${isPlaced
                  ? "opacity-50"
                  : "hover:dark:border-slate-500 hover:border-slate-300 cursor-pointer hover:dark:bg-slate-800 hover:bg-slate-50"
                }
              `}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className={`font-semibold ${isPlaced ? "line-through dark:text-slate-500 text-slate-400" : "dark:text-slate-200 text-slate-700"}`}>
                  {def.name}
                </span>
                <span className="text-xs dark:text-slate-400 text-slate-500 dark:bg-slate-700/50 bg-slate-100 px-2 py-0.5 rounded">
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
                        isPlaced ? "dark:bg-slate-600 bg-slate-300" : "dark:bg-slate-500 bg-slate-400"
                      } ${selectedShip === def.id ? "dark:bg-blue-500 bg-blue-600" : ""}`}
                    />
                  ))}
              </div>
              {isPlaced && (
                <div className="mt-1 flex items-center gap-1">
                  {onRemoveShip && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveShip(def.id);
                      }}
                      className="text-xs dark:text-red-400 text-red-600 hover:dark:text-red-300 hover:text-red-500 transition-colors font-bold"
                      aria-label={`Remove ${def.name}`}
                    >
                      ×
                    </button>
                  )}
                  <svg className="w-3.5 h-3.5 dark:text-emerald-500 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                  <span className="text-xs dark:text-emerald-500 text-emerald-600 font-medium">Placed</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={onAutoPlace}
          disabled={isAutoPlacing}
          className="py-2.5 dark:bg-slate-700 dark:hover:bg-slate-600 bg-slate-200 hover:bg-slate-300
                     dark:text-slate-200 text-slate-700 rounded-lg
                     text-sm font-medium transition-colors duration-200
                     dark:border-slate-600 border-slate-300 border
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAutoPlacing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Placing...
            </span>
          ) : (
            "Auto-Place Ships"
          )}
        </button>

        {placedShips.length === SHIP_DEFINITIONS.length && !isReady && (
          <button
            onClick={onConfirm}
            className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg
                       font-bold transition-colors duration-200
                       shadow-lg shadow-emerald-600/30"
          >
            Confirm & Start
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full dark:bg-slate-600 bg-slate-300" />
        <p className="text-xs dark:text-slate-500 text-slate-400">
          {placedShips.length}/{SHIP_DEFINITIONS.length} ships placed
        </p>
      </div>
    </div>
  );
};

export default ShipPlacement;
