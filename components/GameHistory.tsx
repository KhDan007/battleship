"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { GameRecord } from "../lib/types";

type FilterType = "all" | "pvp" | "pvbot-easy" | "pvbot-medium" | "pvbot-hard";

interface GameHistoryProps {
  userId: string;
}

const GameHistory: React.FC<GameHistoryProps> = ({ userId }) => {
  const games = useQuery(api.games.listByUser, { userId: userId as Id<"users"> });
  const [filter, setFilter] = useState<FilterType>("all");

  if (games === undefined) {
    return (
      <div className="card p-6 max-w-2xl mx-auto animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 dark:bg-slate-700 bg-slate-100 rounded" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="card p-6 max-w-2xl mx-auto text-center">
        <p className="dark:text-slate-400 text-slate-500">No games played yet.</p>
      </div>
    );
  }

  const filteredGames = games.filter((game) => {
    if (filter === "all") return true;
    if (filter === "pvp") return !game.player2IsBot;
    return (
      game.player2IsBot &&
      game.botDifficulty === filter.replace("pvbot-", "")
    );
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDifficultyLabel = (difficulty: string | undefined) => {
    if (!difficulty) return null;
    const colors: Record<string, string> = {
      easy: "bg-emerald-500/20 text-emerald-400",
      medium: "bg-amber-500/20 text-amber-400",
      hard: "bg-red-500/20 text-red-400",
    };
    const colorClass = colors[difficulty] || "bg-slate-500/20 text-slate-400";
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${colorClass}`}>
        {difficulty}
      </span>
    );
  };

  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pvp", label: "PvP" },
    { id: "pvbot-easy", label: "Bot Easy" },
    { id: "pvbot-medium", label: "Bot Medium" },
    { id: "pvbot-hard", label: "Bot Hard" },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-slide-in">
      <h2 className="text-2xl font-bold dark:text-white text-slate-900 text-center mb-6">
        📜 Game History
      </h2>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 justify-center mb-6">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${filter === f.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredGames.map((game) => {
          const won = game.winner ? game.winner === 1 : game.winnerId === userId;
          const shots = game.shotsPlayer1 ?? 0;
          const hits = game.hitsPlayer1 ?? 0;
          const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;

          return (
            <div
              key={game._id}
              className={`card p-4 border ${
                won
                  ? "border-emerald-500/30 dark:bg-emerald-500/5 bg-emerald-50"
                  : "border-red-500/30 dark:bg-red-500/5 bg-red-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {won ? "🏆" : "💔"}
                  </span>
                  <div>
                    <div className="font-semibold dark:text-white text-slate-900">
                      {game.player2IsBot ? (
                        <span className="flex items-center gap-2">
                          vs Bot {getDifficultyLabel(game.botDifficulty)}
                        </span>
                      ) : (
                        "vs Player"
                      )}
                    </div>
                    <div className="text-xs dark:text-slate-400 text-slate-500">
                      {formatDate(game._creationTime)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${won ? "text-emerald-400" : "text-red-400"}`}>
                    {won ? "Won" : "Lost"}
                  </div>
                  <div className="text-xs dark:text-slate-400 text-slate-500">
                    {shots} shots • {accuracy}% acc
                    {game.durationSeconds && ` • ${game.durationSeconds}s`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameHistory;
