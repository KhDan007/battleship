"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

interface StatisticsDashboardProps {
  userId: string;
}

const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({ userId }) => {
  const stats = useQuery(api.stats.get, { userId: userId as Id<"users"> });
  const [loading, setLoading] = useState(!stats);

  useEffect(() => {
    if (stats !== undefined) setLoading(false);
  }, [stats]);

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

  const gamesPlayed = stats.gamesPlayed;
  const gamesWon = stats.gamesWon;
  const totalShots = stats.totalShots;
  const totalHits = stats.totalHits;

  const winRate = gamesPlayed > 0
    ? Math.round((gamesWon / gamesPlayed) * 100)
    : 0;

  const accuracy = totalShots > 0
    ? Math.round((totalHits / totalShots) * 100)
    : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-in">
      <h2 className="text-2xl font-bold text-white text-center mb-6">
        📊 Your Statistics
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Games Played" value={gamesPlayed} icon="🎮" color="blue" />
        <StatCard label="Games Won" value={gamesWon} icon="🏆" color="emerald" />
        <StatCard label="Win Rate" value={`${winRate}%`} icon="📈" color="purple" />
        <StatCard label="Accuracy" value={`${accuracy}%`} icon="🎯" color="amber" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Shots" value={totalShots} icon="💥" color="slate" />
        <StatCard label="Total Hits" value={totalHits} icon="🔥" color="red" />
        <StatCard label="Current Streak" value={stats.currentStreak} icon="🔥" color="orange" />
        <StatCard label="Best Duration" value={stats.bestGameDuration ? `${stats.bestGameDuration}s` : "N/A"} icon="⚡" color="cyan" />
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
