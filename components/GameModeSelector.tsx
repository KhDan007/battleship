"use client";

import React from "react";
import { GameMode, BotDifficulty } from "../lib/types";

interface GameModeSelectorProps {
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  botDifficulty: BotDifficulty;
  onDifficultyChange: (difficulty: BotDifficulty) => void;
  onStart: () => void;
  onStartOnline: () => void;
  disabled?: boolean;
}

const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  mode,
  onModeChange,
  botDifficulty,
  onDifficultyChange,
  onStart,
  onStartOnline,
  disabled = false,
}) => {
  return (
    <div className="card p-6 max-w-4xl w-full mx-auto mb-6 animate-slide-in">
      <h2 className="text-xl font-bold text-center dark:text-white text-slate-900 mb-6">
        Choose Game Mode
      </h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => onModeChange("pvp")}
          className={`p-4 rounded-xl border-2 transition-all duration-200
            ${mode === "pvp"
              ? "border-blue-500 dark:bg-blue-500/10 bg-blue-50 shadow-lg dark:shadow-blue-500/20 shadow-blue-200"
              : "dark:border-slate-700 border-slate-200 dark:bg-slate-800/50 bg-white hover:dark:border-slate-600 hover:border-slate-300"
            }`}
        >
          <div className="text-3xl mb-2">⚓</div>
          <div className="font-semibold dark:text-white text-slate-900 mb-1">Player vs Player</div>
          <div className="text-xs dark:text-slate-400 text-slate-500">Two players on one device</div>
        </button>

        <button
          onClick={() => onModeChange("pvbot")}
          className={`p-4 rounded-xl border-2 transition-all duration-200
            ${mode === "pvbot"
              ? "border-blue-500 dark:bg-blue-500/10 bg-blue-50 shadow-lg dark:shadow-blue-500/20 shadow-blue-200"
              : "dark:border-slate-700 border-slate-200 dark:bg-slate-800/50 bg-white hover:dark:border-slate-600 hover:border-slate-300"
            }`}
        >
          <div className="text-3xl mb-2">🤖</div>
          <div className="font-semibold dark:text-white text-slate-900 mb-1">Player vs Bot</div>
          <div className="text-xs dark:text-slate-400 text-slate-500">Challenge the AI</div>
        </button>

        <button
          onClick={() => onModeChange("online")}
          className={`p-4 rounded-xl border-2 transition-all duration-200
            ${mode === "online"
              ? "border-blue-500 dark:bg-blue-500/10 bg-blue-50 shadow-lg dark:shadow-blue-500/20 shadow-blue-200"
              : "dark:border-slate-700 border-slate-200 dark:bg-slate-800/50 bg-white hover:dark:border-slate-600 hover:border-slate-300"
            }`}
        >
          <div className="text-3xl mb-2">🌐</div>
          <div className="font-semibold dark:text-white text-slate-900 mb-1">Online Multiplayer</div>
          <div className="text-xs dark:text-slate-400 text-slate-500">Invite a friend</div>
        </button>
      </div>

      {mode === "pvbot" && (
        <div className="mb-6 animate-slide-in">
          <label className="block text-sm font-medium dark:text-slate-300 text-slate-600 mb-3">
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
                      ? "border-emerald-500 dark:bg-emerald-500/10 bg-emerald-50 text-emerald-600"
                      : diff === "medium"
                      ? "border-amber-500 dark:bg-amber-500/10 bg-amber-50 text-amber-600"
                      : "border-red-500 dark:bg-red-500/10 bg-red-50 text-red-600"
                    : "dark:border-slate-700 border-slate-200 dark:bg-slate-800/50 bg-white dark:text-slate-400 text-slate-500 hover:dark:border-slate-600 hover:border-slate-300"
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
        onClick={mode === "online" ? onStartOnline : onStart}
        disabled={disabled}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold
                   transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mode === "online" ? "Create & Invite" : "Start Game"}
      </button>
    </div>
  );
};

export default GameModeSelector;
