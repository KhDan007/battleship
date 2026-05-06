"use client";

import React, { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";
import AuthModal from "./AuthModal";
import { useAuth } from "../contexts/AuthContext";

type Tab = "play" | "stats" | "history";

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  gameInProgress: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  gameInProgress,
}) => {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "play", label: "Play", icon: "⚓" },
    { id: "stats", label: "Stats", icon: "📊" },
    { id: "history", label: "History", icon: "📜" },
  ];

  return (
    <>
      <AuthModal />
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold text-white">
              ⚓ Battleship
            </span>
          </div>

          {user && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !gameInProgress || tab.id !== "play" ? onTabChange(tab.id) : null}
                  disabled={gameInProgress && tab.id === "play"}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }
                    ${gameInProgress && tab.id === "play" ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <span className="mr-1.5">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {user && (
          <div className="sm:hidden border-t border-slate-800 px-4 py-2">
            <div className="flex items-center justify-around">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !gameInProgress || tab.id !== "play" ? onTabChange(tab.id) : null}
                  disabled={gameInProgress && tab.id === "play"}
                  className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all
                    ${activeTab === tab.id
                      ? "text-blue-400"
                      : "text-slate-500"
                    }
                    ${gameInProgress && tab.id === "play" ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="text-xs">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navigation;
