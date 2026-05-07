"use client";

import React from "react";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import AuthModal from "./AuthModal";
import { useAuth } from "../contexts/AuthContext";

interface NavigationProps {
  onOpenStatsHistory: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onOpenStatsHistory }) => {
  const { user } = useAuth();

  return (
    <>
      <AuthModal />
      <nav className="navbar sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold dark:text-white text-slate-900">
              ⚓ Battleship
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={onOpenStatsHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                           dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800
                           text-slate-600 hover:text-slate-900 hover:bg-slate-100
                           transition-all"
                title="View Stats & History"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline">Stats</span>
              </button>
            )}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
