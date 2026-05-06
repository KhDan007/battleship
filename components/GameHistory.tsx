"use client";

import React from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { GameRecord } from "../lib/types";

interface GameHistoryProps {
  userId: string;
}

const GameHistory: React.FC<GameHistoryProps> = ({ userId }) => {
  const games = useQuery(api.games.listByUser, { userId: userId as Id<"users"> });

  if (games === undefined) {
    return (
      <div className="card p-6 max-w-2xl mx-auto animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-slate-700 rounded" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="card p-6 max-w-2xl mx-auto text-center">
        <p className="text-slate-400">No games played yet.</p>
      </div>
    );
  }

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

  return (
    <div className="max-w-2xl mx-auto animate-slide-in">
      <h2 className="text-2xl font-bold text-white text-center mb-6">
        📜 Game History
      </h2>

      <div className="space-y-3">
        {games.map((game) => {
          const isPlayer1 = game.player1Id === userId;
          const won = game.winnerId === userId;
          const shots = (isPlayer1 ? game.shotsPlayer1 : game.shotsPlayer2) ?? 0;
          const hits = (isPlayer1 ? game.hitsPlayer1 : game.hitsPlayer2) ?? 0;
          const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;

          return (
            <div
              key={game._id}
              className={`card p-4 border ${
                won
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : game.winnerId
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {won ? "🏆" : game.winnerId ? "💔" : "⚔️"}
                  </span>
                  <div>
                    <div className="font-semibold text-white">
                      {game.player2IsBot ? (
                        <span className="flex items-center gap-2">
                          vs Bot {getDifficultyLabel(game.botDifficulty)}
                        </span>
                      ) : (
                        "vs Player"
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {formatDate(game._creationTime)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${won ? "text-emerald-400" : "text-red-400"}`}>
                    {won ? "Won" : game.winnerId ? "Lost" : "Draw"}
                  </div>
                  <div className="text-xs text-slate-400">
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
