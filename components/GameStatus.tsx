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
    if (phase === "gameover") return "dark:text-emerald-400 text-emerald-600";
    if (phase === "battle") return "dark:text-blue-400 text-blue-600";
    return "dark:text-slate-300 text-slate-600";
  };

  return (
    <div className="card p-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className={`status-badge ${phase === "gameover"
            ? "status-badge-success"
            : phase === "battle"
              ? "status-badge-active"
              : "status-badge-default"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${phase === "gameover" ? "dark:bg-emerald-400 bg-emerald-500" :
              phase === "battle" ? "dark:bg-blue-400 bg-blue-500" : "dark:bg-slate-400 bg-slate-500"}`}
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
        <p className="text-center text-sm dark:text-slate-400 text-slate-500">
          {gameMode === "pvbot" && currentPlayer === 2 ? (
            <>The bot is attacking...</>
          ) : (
            <>
              Switch seats! It's now{" "}
              <span className="dark:text-white text-slate-900 font-semibold">
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
