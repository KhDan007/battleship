import React from "react";
import { GameState, GamePhase } from "../lib/types";
import { PHASE_LABELS } from "../lib/constants";

interface GameStatusProps {
  gameState: GameState;
  onReset: () => void;
}

const GameStatus: React.FC<GameStatusProps> = ({ gameState, onReset }) => {
  const { phase, currentPlayer, winner } = gameState;

  const getStatusMessage = () => {
    if (phase === "gameover" && winner) {
      return `🎉 Player ${winner} Wins!`;
    }
    if (phase === "battle") {
      return `Player ${currentPlayer}'s Turn to Attack`;
    }
    return "";
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md text-center">
      <div className="mb-2">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          {PHASE_LABELS[phase]}
        </span>
      </div>
      <p className="text-lg font-bold text-gray-800 mb-3">
        {getStatusMessage()}
      </p>
      {phase === "gameover" && (
        <button
          onClick={onReset}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors"
        >
          New Game
        </button>
      )}
    </div>
  );
};

export default GameStatus;
