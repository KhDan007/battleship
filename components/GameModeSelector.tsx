"use client";

import React from "react";
import { GameMode, BotDifficulty } from "../lib/types";

interface GameModeSelectorProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  botDifficulty: BotDifficulty;
  onDifficultyChange: (difficulty: BotDifficulty) => void;
  onStart: () => void;
  disabled?: boolean;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  mode,
  onModeChange,
  botDifficulty,
  onDifficultyChange,
  onStart,
  disabled = false,
}) => {
  return (
    <div className="card p-6 max-w-lg w-full mx-auto mb-6 animate-slide-in">
      <h2 className="text-xl font-bold text-center text-white mb-6">
        Choose Game Mode
      </h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => onModeChange("pvp")}
          className={`p-4 rounded-xl border-2 transition-all duration-200
            ${mode === "pvp"
              ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            }`}
        >
          <div className="text-3xl mb-2">⚓</div>
          <div className="font-semibold text-white mb-1">Player vs Player</div>
          <div className="text-xs text-slate-400">Two players on one device</div>
        </button>

        <button
          onClick={() => onModeChange("pvbot")}
          className={`p-4 rounded-xl border-2 transition-all duration-200
            ${mode === "pvbot"
              ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
              : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
            }`}
        >
          <div className="text-3xl mb-2">🤖</div>
          <div className="font-semibold text-white mb-1">Player vs Bot</div>
          <div className="text-xs text-slate-400">Challenge the AI</div>
        </button>
      </div>

      {mode === "pvbot" && (
        <div className="mb-6 animate-slide-in">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Bot Difficulty
          </label>
          <div className="grid grid-cols-3 gap-3">
            {(["easy", "medium", "hard"] as BotDifficulty[]).map((diff) => (
              <button
                key={diff}
                onClick={() => onDifficultyChange(diff)}
                className={`p-3 rounded-lg border-2 transition-all duration-200 capitalize
                  ${botDifficulty === diff
                    ? diff === "easy"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : diff === "medium"
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-red-500 bg-red-500/10 text-red-400"
                    : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                  }`}
              >
                <div className="font-semibold text-sm">{diff}</div>
                <div className="text-xs mt-1 opacity-70">
                  {diff === "easy"
                    ? "Random shots"
                    : diff === "medium"
                    ? "Hunt & target"
                    : "Probability map"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onStart}
        disabled={disabled}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold
                   transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Start Game
      </button>
    </div>
  );
};

export default GameModeSelector;
