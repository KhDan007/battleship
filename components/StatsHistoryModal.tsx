"use client";

import React, { useState } from "react";
import StatisticsDashboard from "./StatisticsDashboard";
import GameHistory from "./GameHistory";

type StatsHistoryTab = "stats" | "history";

interface StatsHistoryModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const StatsHistoryModal: React.FC<StatsHistoryModalProps> = ({
  userId,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<StatsHistoryTab>("stats");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl dark:bg-slate-800 bg-white dark:border-slate-700 border-slate-200 border rounded-2xl shadow-2xl p-6 animate-scale-in max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold dark:text-white text-slate-900 mb-6 text-center">
          {activeTab === "stats" ? "📊 Your Statistics" : "📜 Game History"}
        </h2>

        {/* Tabs */}
        <div className="flex gap-2 justify-center mb-6">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "stats"
                ? "bg-blue-600 text-white"
                : "dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            📊 Stats
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "history"
                ? "bg-blue-600 text-white"
                : "dark:bg-slate-900 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            📜 History
          </button>
        </div>

        {/* Content */}
        <div>
          {activeTab === "stats" ? (
            <StatisticsDashboard userId={userId} />
          ) : (
            <GameHistory userId={userId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsHistoryModal;
