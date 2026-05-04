import React, { useState } from "react";
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
    <div className="bg-white p-4 rounded-lg shadow-md max-w-md w-full">
      <h3 className="text-lg font-bold mb-3 text-gray-800">
        {playerName} - Place Your Ships
      </h3>
      <div className="mb-3 p-2 bg-gray-100 rounded">
        <p className="text-sm text-gray-700">
          Orientation:{" "}
          <span className="font-bold">
            {isHorizontal ? "Horizontal ↔" : "Vertical ↕"}
          </span>
        </p>
        <button
          onClick={onToggleOrientation}
          className="mt-1 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Rotate Ship
        </button>
      </div>
      <div className="space-y-2 mb-4">
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
                w-full p-2 rounded border-2 text-left transition-colors
                ${
                  selectedShip === def.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }
                ${
                  isPlaced
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed line-through"
                    : "hover:border-blue-300 cursor-pointer"
                }
              `}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">{def.name}</span>
                <span className="text-sm text-gray-600">
                  Size: {def.size}
                </span>
              </div>
              <div className="flex gap-0.5 mt-1">
                {Array(def.size)
                  .fill(0)
                  .map((_, i) => (
                    <div
                      key={i}
                      className={`h-3 flex-1 rounded-sm ${
                        isPlaced ? "bg-gray-400" : "bg-gray-600"
                      }`}
                    />
                  ))}
              </div>
            </button>
          );
        })}
      </div>
      {placedShips.length === SHIP_DEFINITIONS.length && !isReady && (
        <button
          onClick={onConfirm}
          className="w-full py-2 bg-green-500 text-white rounded font-bold hover:bg-green-600"
        >
          Confirm & Start Battle
        </button>
      )}
      <p className="text-xs text-gray-500 mt-2 text-center">
        {placedShips.length}/{SHIP_DEFINITIONS.length} ships placed
      </p>
    </div>
  );
};

export default ShipPlacement;
