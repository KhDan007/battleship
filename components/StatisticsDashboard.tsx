"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

type GameType = "all" | "pvp" | "pvbot-easy" | "pvbot-medium" | "pvbot-hard";

type GameFromDb = {
  _id: Id<"games">;
  _creationTime: number;
  player1Id: Id<"users">;
  player2Id?: Id<"users">;
  player2IsBot: boolean;
  botDifficulty?: string;
  winnerId?: Id<"users">;
  shotsPlayer1: number;
  shotsPlayer2: number;
  hitsPlayer1: number;
  hitsPlayer2: number;
  durationSeconds?: number;
};

interface StatisticsDashboardProps {
  userId: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ userId }) => {
  const stats = useQuery(api.stats.get, { userId: userId as Id<"users"> });
  const games = useQuery(api.games.listByUser, { userId: userId as Id<"users"> });
  const [loading, setLoading] = useState(!stats && !games);
  const [activeType, setActiveType] = useState<GameType>("all");

  useEffect(() => {
    if (stats !== undefined && games !== undefined) setLoading(false);
  }, [stats, games]);

  if (loading) {
    return (
      <div className="card p-6 max-w-2xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card p-6 max-w-2xl mx-auto text-center">
        <p className="text-slate-400">No statistics yet. Play some games!</p>
      </div>
    );
  }

  const computeStats = (gameList: GameFromDb[]) => {
    const filtered =
      activeType === "all"
        ? gameList
        : activeType === "pvp"
        ? gameList.filter((g) => !g.player2IsBot)
        : gameList.filter(
            (g) =>
              g.player2IsBot &&
              g.botDifficulty === activeType.replace("pvbot-", "")
          );

    const gamesPlayed = filtered.length;
    const gamesWon = filtered.filter(
      (g) => g.winnerId === userId
    ).length;
    const totalShots = filtered.reduce(
      (sum, g) => sum + (g.shotsPlayer1 || 0),
      0
    );
    const totalHits = filtered.reduce(
      (sum, g) => sum + (g.hitsPlayer1 || 0),
      0
    );
    const winRate =
      gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
    const accuracy =
      totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : 0;

    return { gamesPlayed, gamesWon, winRate, accuracy, totalShots, totalHits };
  };

  const typeStats = games ? computeStats(games) : null;

  const tabs: { id: GameType; label: string; color: string }[] = [
    { id: "all", label: "All Games", color: "slate" },
    { id: "pvp", label: "PvP", color: "blue" },
    { id: "pvbot-easy", label: "Bot Easy", color: "emerald" },
    { id: "pvbot-medium", label: "Bot Medium", color: "amber" },
    { id: "pvbot-hard", label: "Bot Hard", color: "red" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-in">
      <h2 className="text-2xl font-bold text-white text-center mb-6">
        📊 Your Statistics
      </h2>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveType(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeType === tab.id
                ? tab.color === "slate"
                  ? "bg-slate-600 text-white"
                  : tab.color === "blue"
                  ? "bg-blue-600 text-white"
                  : tab.color === "emerald"
                  ? "bg-emerald-600 text-white"
                  : tab.color === "amber"
                  ? "bg-amber-600 text-white"
                  : "bg-red-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats for selected type */}
      {typeStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Games Played" value={typeStats.gamesPlayed} icon="🎮" color="blue" />
          <StatCard label="Games Won" value={typeStats.gamesWon} icon="🏆" color="emerald" />
          <StatCard label="Win Rate" value={`${typeStats.winRate}%`} icon="📈" color="purple" />
          <StatCard label="Accuracy" value={`${typeStats.accuracy}%`} icon="🎯" color="amber" />
        </div>
      )}

      {/* Overall stats from profile (always shown) */}
      <div className="card p-5 mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Overall Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Shots" value={stats.totalShots} icon="💥" color="slate" />
          <StatCard label="Total Hits" value={stats.totalHits} icon="🔥" color="red" />
          <StatCard label="Current Streak" value={stats.currentStreak} icon="🔥" color="orange" />
          <StatCard label="Best Duration" value={stats.bestGameDuration ? `${stats.bestGameDuration}s` : "N/A"} icon="⚡" color="cyan" />
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    purple: "border-purple-500/30 bg-purple-500/5 text-purple-400",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    slate: "border-slate-500/30 bg-slate-500/5 text-slate-400",
    red: "border-red-500/30 bg-red-500/5 text-red-400",
    orange: "border-orange-500/30 bg-orange-500/5 text-orange-400",
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
  };

  return (
    <div className={`card p-4 border ${colorClasses[color] || colorClasses.slate}`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
};

export default StatisticsDashboard;
