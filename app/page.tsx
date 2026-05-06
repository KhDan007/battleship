"use client";

import React, { useState } from "react";
import { useGameState } from "../hooks/useGameState";
import { useOnlineGame } from "../hooks/useOnlineGame";
import { useAuth } from "../contexts/AuthContext";
import AuthModal from "../components/AuthModal";
import StatsHistoryModal from "../components/StatsHistoryModal";
import OnlineGameManager from "../components/OnlineGameManager";
import LocalGameManager from "../components/LocalGameManager";

export default function Home() {
  const { user, setShowAuthModal } = useAuth();
  const { mounted, gameMode, setGameMode } = useGameState();
  const [showStatsModal, setShowStatsModal] = useState(false);

  const onlineGame = useOnlineGame();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-slate-300 text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthModal />
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">⚓ Battleship</h1>
          <p className="text-slate-400 text-lg mb-8 text-center max-w-md">
            The classic naval combat game. Sign in to track your stats and play against AI opponents.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-lg transition-colors"
          >
            Sign In to Play
          </button>
        </div>
      </>
    );
  }

  const handleOpenStatsHistory = () => setShowStatsModal(true);
  const handleCloseStatsHistory = () => setShowStatsModal(false);

  return (
    <>
      {gameMode === "online" ? (
        <OnlineGameManager
          onlineGame={onlineGame}
          gameMode={gameMode}
          setGameMode={setGameMode}
          onOpenStatsHistory={handleOpenStatsHistory}
        />
      ) : (
        <LocalGameManager
          onOpenStatsHistory={handleOpenStatsHistory}
        />
      )}
      <StatsHistoryModal
        userId={user.id}
        isOpen={showStatsModal}
        onClose={handleCloseStatsHistory}
      />
    </>
  );
}
