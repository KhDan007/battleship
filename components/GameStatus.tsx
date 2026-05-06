import React from "react";
import { GameState, GamePhase, GameMode, BotDifficulty } from "../lib/types";
import { PHASE_LABELS } from "../lib/constants";

interface GameStatusProps {
  gameState: GameState;
  onReset: () => void;
  gameMode?: GameMode;
  botDifficulty?: BotDifficulty;
}

const GameStatus: React.FC<GameStatusProps> = ({ gameState, onReset, gameMode, botDifficulty }) => {
  const { phase, currentPlayer, winner } = gameState;

  const getStatusMessage = () => {
    if (phase === "gameover" && winner) {
      const winnerName = gameState.players?.[`player${winner}`]?.name || `Player ${winner}`;
      return `${winnerName} Wins!`;
    }
    if (phase === "battle") {
      if (gameMode === "pvbot" && currentPlayer === 2) {
        return `Bot (${botDifficulty})'s Turn`;
      }
      const currentPlayerName = gameState.players?.[`player${currentPlayer}`]?.name || `Player ${currentPlayer}`;
      return `${currentPlayerName}'s Turn`;
    }
    return "";
  };

  const getStatusColor = () => {
    if (phase === "gameover") return "text-emerald-400";
    if (phase === "battle") return "text-blue-400";
    return "text-slate-300";
  };

  return (
    <div className="card p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
          ${phase === "gameover"
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : phase === "battle"
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "bg-slate-700 text-slate-300 border border-slate-600"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse
            ${phase === "gameover" ? "bg-emerald-400" :
              phase === "battle" ? "bg-blue-400" : "bg-slate-400"}`}
          />
          {PHASE_LABELS[phase]}
        </span>
      </div>

      <p className={`text-2xl font-bold text-center mb-4 ${getStatusColor()}`}>
        {phase === "gameover" && "🎉 "}
        {getStatusMessage()}
        {phase === "gameover" && " 🎉"}
      </p>

      {phase === "gameover" && (
        <div className="text-center">
          <button
            onClick={onReset}
            className="btn-primary"
          >
            New Game
          </button>
        </div>
      )}

      {phase === "battle" && (
        <p className="text-center text-sm text-slate-400">
          {gameMode === "pvbot" && currentPlayer === 2 ? (
            <>The bot is attacking...</>
          ) : (
            <>
              Switch seats! It's now{" "}
              <span className="text-white font-semibold">
                {gameState.players?.[`player${currentPlayer}`]?.name || `Player ${currentPlayer}`}'s
              </span>{" "}
              turn to attack
            </>
          )}
        </p>
      )}
    </div>
  );
};

export default GameStatus;
