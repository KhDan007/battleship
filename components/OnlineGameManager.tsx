"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useGameState } from "../hooks/useGameState";
import GameBoard from "./GameBoard";
import ShipPlacement from "./ShipPlacement";
import GameStatus from "./GameStatus";
import OnlineLobby from "./OnlineLobby";
import WaitingRoom from "./WaitingRoom";
import DisconnectNotification from "./DisconnectNotification";
import GameModeSelector from "./GameModeSelector";
import Navigation from "./Navigation";
import { GameMode } from "../lib/types";
import { SHIP_DEFINITIONS } from "../lib/constants";
import { autoPlaceShips } from "../lib/gameLogic";
import { OnlineGameState, Ship, CellState } from "../lib/types";

interface OnlineGameManagerProps {
  activeTab: "play" | "stats" | "history";
  onTabChange: (tab: "play" | "stats" | "history") => void;
  onlineGame: {
    gameId: string | null;
    playerNum: 1 | 2 | null;
    onlineState: OnlineGameState | undefined | null;
    inviteCode: string | null;
    isPaused: boolean;
    pausedAt: number | null;
    placeShips: (ships: Ship[], grid: CellState[][]) => void;
    takeShot: (row: number, col: number) => void;
    startBattle: () => void;
    resetOnlineGame: () => void;
    localShips: Ship[];
    setLocalShips: (ships: Ship[]) => void;
    localGrid: CellState[][];
    setLocalGrid: (grid: CellState[][]) => void;
    isMyTurn: boolean;
    opponentGrid: CellState[][] | undefined;
    myGrid: CellState[][] | undefined;
    opponentShips: Ship[] | undefined;
    myShips: Ship[] | undefined;
  };
  gameMode: string;
  setGameMode: (mode: GameMode) => void;
}

export default function OnlineGameManager({
  activeTab,
  onTabChange,
  onlineGame,
  gameMode,
  setGameMode,
}: OnlineGameManagerProps) {
  const {
    showModeSelector,
    setShowModeSelector,
    isProcessing,
    isHorizontal,
    toggleOrientation,
  } = useGameState();

  const [isBotPlacing, setIsBotPlacing] = useState(false);

  const {
    gameId: onlineGameId,
    playerNum: onlinePlayerNum,
    onlineState,
    inviteCode: onlineInviteCode,
    isPaused,
    pausedAt,
    placeShips: onlinePlaceShips,
    takeShot: onlineTakeShot,
    startBattle: onlineStartBattle,
    resetOnlineGame,
    localShips: onlineLocalShips,
    setLocalShips: setOnlineLocalShips,
    localGrid: onlineLocalGrid,
    setLocalGrid: setOnlineLocalGrid,
    isMyTurn: onlineIsMyTurn,
    opponentGrid: onlineOpponentGrid,
    myGrid: onlineMyGrid,
    opponentShips: onlineOpponentShips,
    myShips: onlineMyShips,
  } = onlineGame;

  // Online: Handle ship placement confirmation
  const handleOnlineConfirmPlacement = useCallback(() => {
    if (!onlineLocalShips || onlineLocalShips.length < SHIP_DEFINITIONS.length) return;
    onlinePlaceShips(onlineLocalShips, onlineLocalGrid);
  }, [onlineLocalShips, onlineLocalGrid, onlinePlaceShips]);

  // Watch for both players having placed ships to auto-start battle
  useEffect(() => {
    if (onlineState?.status === "setup" &&
        onlineState?.player1Ships &&
        onlineState?.player2Ships &&
        onlineState?.player1Ships.length > 0 &&
        onlineState?.player2Ships.length > 0) {
      onlineStartBattle();
    }
  }, [onlineState?.status, onlineState?.player1Ships, onlineState?.player2Ships, onlineStartBattle]);

  // Online: Auto-place ships
  const handleOnlineAutoPlace = useCallback(() => {
    const result = autoPlaceShips(onlineLocalGrid || [], SHIP_DEFINITIONS);
    if (result) {
      setOnlineLocalShips(result.ships);
      setOnlineLocalGrid(result.grid);
    }
  }, [onlineLocalGrid, setOnlineLocalShips, setOnlineLocalGrid]);

  // Online: Handle shot
  const handleOnlineShot = useCallback((row: number, col: number) => {
    if (!onlineIsMyTurn || !onlineState || onlineState.status !== "battle") return;
    onlineTakeShot(row, col);
  }, [onlineIsMyTurn, onlineState, onlineTakeShot]);

  const handleStartOnline = useCallback(() => {
    setShowModeSelector(false);
    setGameMode("online");
  }, [setGameMode]);

  const handleBackFromOnline = useCallback(() => {
    resetOnlineGame();
    setShowModeSelector(true);
  }, [resetOnlineGame]);

  // No gameId yet - show lobby or mode selector
  if (!onlineGameId) {
    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={onTabChange} gameInProgress={false} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-8">
          {showModeSelector ? (
            <GameModeSelector
              mode={gameMode as GameMode}
              onModeChange={(m) => setGameMode(m)}
              botDifficulty={"medium" as any}
              onDifficultyChange={() => {}}
              onStart={() => {}}
              onStartOnline={handleStartOnline}
              disabled={false}
            />
          ) : (
            <OnlineLobby onBack={() => setShowModeSelector(true)} />
          )}
        </div>
      </>
    );
  }

  // Waiting room
  if (onlineState?.status === "waiting") {
    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={onTabChange} gameInProgress={true} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-8">
          {onlineInviteCode && (
            <WaitingRoom
              inviteCode={onlineInviteCode}
              playerNum={onlinePlayerNum || 1}
              onCancel={handleBackFromOnline}
            />
          )}
        </div>
      </>
    );
  }

  // Setup phase
  if (onlineState?.status === "setup") {
    const currentPlayerShips = onlinePlayerNum === 1 ? onlineState.player1Ships : onlineState.player2Ships;
    const hasPlacedShips = currentPlayerShips && currentPlayerShips.length > 0;

    const player1Name = onlineState.player1Username || "Player 1";
    const player2Name = onlineState.player2Username || "Player 2";
    const myName = onlinePlayerNum === 1 ? player1Name : player2Name;
    const opponentName = onlinePlayerNum === 1 ? player2Name : player1Name;

    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={onTabChange} gameInProgress={true} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="mb-6 animate-slide-in">
            <GameStatus
              gameState={{
                phase: "setup",
                currentPlayer: onlinePlayerNum || 1,
                players: {
                  player1: { name: player1Name, grid: onlineMyGrid || [], ships: onlineMyShips || [], hits: 0, shots: [], ready: false },
                  player2: { name: player2Name, grid: onlineOpponentGrid || [], ships: onlineOpponentShips || [], hits: 0, shots: [], ready: false },
                },
                winner: null,
                setupPlayer: onlinePlayerNum || 1,
                mode: "online",
              } as any}
              onReset={handleBackFromOnline}
              gameMode="online"
            />
          </div>

          <div className="flex flex-col items-center gap-6">
            {!hasPlacedShips ? (
              <ShipPlacement
                placedShips={onlineLocalShips}
                selectedShip={null}
                onSelectShip={() => {}}
                onRemoveShip={() => {}}
                isHorizontal={isHorizontal}
                onToggleOrientation={toggleOrientation}
                playerName={`You (${myName})`}
                onConfirm={handleOnlineConfirmPlacement}
                isReady={false}
                onAutoPlace={handleOnlineAutoPlace}
                isAutoPlacing={false}
              />
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-lg text-slate-200 font-medium">Waiting for {opponentName} to place ships...</p>
                </div>
              </div>
            )}

            <GameBoard
              grid={onlineLocalGrid || []}
              onCellClick={() => {}}
              isInteractive={false}
              title={`${myName}'s Fleet`}
              isOpponentView={false}
              remainingShips={SHIP_DEFINITIONS.length - (onlineLocalShips?.length || 0)}
              selectedShipSize={undefined}
              isHorizontal={isHorizontal}
            />
          </div>

          <div className="mt-6 text-center">
            <button onClick={handleBackFromOnline} className="btn-danger">
              Abandon Game
            </button>
          </div>
        </div>
      </>
    );
  }

  // Battle phase
  if (onlineState?.status === "battle") {
    const player1Name = onlineState.player1Username || "Player 1";
    const player2Name = onlineState.player2Username || "Player 2";
    const myName = onlinePlayerNum === 1 ? player1Name : player2Name;
    const opponentName = onlinePlayerNum === 1 ? player2Name : player1Name;

    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={onTabChange} gameInProgress={true} />

        {isPaused && (
          <DisconnectNotification
            pausedAt={pausedAt}
            onReconnect={() => {}}
          />
        )}

        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="mb-6 animate-slide-in">
            <GameStatus
              gameState={{
                phase: "battle",
                currentPlayer: onlineState?.currentTurn || 1,
                players: {
                  player1: { name: player1Name, grid: onlineState?.player1Grid || [], ships: onlineState?.player1Ships || [], hits: 0, shots: [], ready: true },
                  player2: { name: player2Name, grid: onlineState?.player2Grid || [], ships: onlineState?.player2Ships || [], hits: 0, shots: [], ready: true },
                },
                winner: onlineState?.winner || null,
                setupPlayer: 1,
                mode: "online",
              } as any}
              onReset={handleBackFromOnline}
              gameMode="online"
            />
          </div>

          <div className="text-center mb-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${
              onlineIsMyTurn ? "bg-blue-500/10 border-blue-500" : "bg-slate-800 border-slate-700"
            }`}>
              <div className={`h-2 w-2 rounded-full ${onlineIsMyTurn ? "bg-blue-400 animate-pulse" : "bg-slate-500"}`} />
              <p className="text-sm text-slate-300 font-medium">
                {onlineIsMyTurn ? `Your Turn (${myName}) — Click to attack!` : `${opponentName}'s Turn...`}
              </p>
            </div>
          </div>

          <div className="animate-slide-in">
            <GameBoard
              grid={onlineOpponentGrid || []}
              onCellClick={handleOnlineShot}
              isInteractive={onlineIsMyTurn && !isProcessing}
              title={`${opponentName}'s Fleet — Attack!`}
              isOpponentView={true}
              remainingShips={onlineOpponentShips ? onlineOpponentShips.filter((s: any) =>
                !s.positions.every(([r, c]: [number, number]) =>
                  onlineOpponentGrid?.[r]?.[c] === "sunk"
                )
              ).length : 0}
            />
          </div>

          <div className="mt-6 text-center">
            <button onClick={handleBackFromOnline} className="btn-danger">
              Abandon Game
            </button>
          </div>
        </div>
      </>
    );
  }

  // Game over
  if (onlineState?.status === "completed") {
    const winner = onlineState?.winner;
    const iWon = (winner === 1 && onlinePlayerNum === 1) || (winner === 2 && onlinePlayerNum === 2);
    const player1Name = onlineState.player1Username || "Player 1";
    const player2Name = onlineState.player2Username || "Player 2";

    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={onTabChange} gameInProgress={false} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="text-center mb-6 animate-slide-in">
            <h2 className="text-3xl font-bold text-white mb-2">
              {iWon ? "🎉 You Win!" : "💀 You Lose!"}
            </h2>
            <p className="text-slate-400">
              {iWon ? "Congratulations!" : "Better luck next time!"}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in">
            <GameBoard
              grid={onlineState?.player1Grid || []}
              onCellClick={() => {}}
              isInteractive={false}
              title={`${player1Name}'s Fleet`}
              isOpponentView={false}
              remainingShips={0}
            />
            <GameBoard
              grid={onlineState?.player2Grid || []}
              onCellClick={() => {}}
              isInteractive={false}
              title={`${player2Name}'s Fleet`}
              isOpponentView={false}
              remainingShips={0}
            />
          </div>

          <div className="mt-6 text-center">
            <button onClick={handleBackFromOnline} className="btn-danger">
              New Game
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}
