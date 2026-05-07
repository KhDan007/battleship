"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGameState } from "../hooks/useGameState";
import GameBoard from "./GameBoard";
import ShipPlacement from "./ShipPlacement";
import GameStatus from "./GameStatus";
import OnlineLobby from "./OnlineLobby";
import WaitingRoom from "./WaitingRoom";
import DisconnectNotification from "./DisconnectNotification";
import GameModeSelector from "./GameModeSelector";
import Navigation from "./Navigation";
import GameAnalysis from "./GameAnalysis";
import { GameMode } from "../lib/types";
import { SHIP_DEFINITIONS } from "../lib/constants";
import { autoPlaceShips, createEmptyGrid } from "../lib/gameLogic";
import { OnlineGameState, Ship, CellState } from "../lib/types";

interface OnlineGameManagerProps {
  onlineGame: {
    gameId: string | null;
    playerNum: 1 | 2 | null;
    onlineState: OnlineGameState | undefined | null;
    inviteCode: string | null;
    isPaused: boolean;
    pausedAt: number | null;
    hostGame: (userId?: string, guestId?: string) => Promise<{ code: string; link: string }>;
    joinGame: (code: string, userId?: string, guestId?: string) => Promise<any>;
    placeShips: (ships: Ship[], grid: CellState[][]) => void;
    takeShot: (row: number, col: number) => void;
    startBattle: () => void;
    abandonGame: () => void;
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
  onOpenStatsHistory: () => void;
}

export default function OnlineGameManager({
  onlineGame,
  gameMode,
  setGameMode,
  onOpenStatsHistory,
}: OnlineGameManagerProps) {
  const {
    showModeSelector,
    setShowModeSelector,
    isProcessing,
    isHorizontal,
    toggleOrientation,
  } = useGameState();

  const [isBotPlacing, setIsBotPlacing] = useState(false);
  const [shotResult, setShotResult] = useState<"hit" | "miss" | null>(null);
  const [onlineIsProcessing, setOnlineIsProcessing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisNotation, setAnalysisNotation] = useState<string | null>(null);
  const prevShotCountRef = useRef(0);

  const {
    gameId: onlineGameId,
    playerNum: onlinePlayerNum,
    onlineState,
    inviteCode: onlineInviteCode,
    isPaused,
    pausedAt,
    hostGame,
    joinGame,
    placeShips: onlinePlaceShips,
    takeShot: onlineTakeShot,
    startBattle: onlineStartBattle,
    abandonGame: onlineAbandonGame,
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

  // Watch for shot results to show hit/miss feedback
  useEffect(() => {
    const shots = onlineState?.shots || [];
    if (shots.length > prevShotCountRef.current && onlinePlayerNum) {
      const latestShot = shots[shots.length - 1];
      if (latestShot.player === onlinePlayerNum) {
        setShotResult(latestShot.hit ? "hit" : "miss");
        setOnlineIsProcessing(true);
        // Clear after animation plays (2s for hit/miss animation)
        setTimeout(() => {
          setShotResult(null);
          setOnlineIsProcessing(false);
        }, 2000);
      }
    }
    prevShotCountRef.current = shots.length;
  }, [onlineState?.shots, onlinePlayerNum]);

  // Online: Auto-place ships
  const handleOnlineAutoPlace = useCallback(() => {
    const result = autoPlaceShips(onlineLocalGrid || createEmptyGrid(), SHIP_DEFINITIONS);
    if (result) {
      setOnlineLocalShips(result.ships);
      setOnlineLocalGrid(result.grid);
    }
  }, [onlineLocalGrid, setOnlineLocalShips, setOnlineLocalGrid]);

  // Online: Handle shot
  const handleOnlineShot = useCallback((row: number, col: number) => {
    if (!onlineIsMyTurn || !onlineState || onlineState.status !== "battle" || onlineIsProcessing) return;
    setOnlineIsProcessing(true);
    onlineTakeShot(row, col);
  }, [onlineIsMyTurn, onlineState, onlineTakeShot, onlineIsProcessing]);

  const handleStartOnline = useCallback(() => {
    setShowModeSelector(false);
    setGameMode("online");
  }, [setGameMode]);

  const handleBackFromOnline = useCallback(() => {
    if (onlineGameId && onlineState?.status === "battle" || onlineState?.status === "setup") {
      onlineAbandonGame();
    } else {
      resetOnlineGame();
      setShowModeSelector(true);
    }
  }, [onlineGameId, onlineState?.status, onlineAbandonGame, resetOnlineGame]);

  const handleViewAnalysis = useCallback(() => {
    if (typeof window !== "undefined") {
      const notation = localStorage.getItem("battleship_last_notation");
      if (notation) {
        setAnalysisNotation(notation);
        setShowAnalysis(true);
      }
    }
  }, []);

  const handleExitAnalysis = useCallback(() => {
    setShowAnalysis(false);
    setAnalysisNotation(null);
    resetOnlineGame();
    setShowModeSelector(true);
  }, [resetOnlineGame]);

  // No gameId yet - show lobby or mode selector
  if (!onlineGameId) {
    return (
      <>
        <Navigation onOpenStatsHistory={onOpenStatsHistory} />
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
            <OnlineLobby
              onBack={() => setShowModeSelector(true)}
              hostGame={hostGame}
              joinGame={joinGame}
            />
          )}
        </div>
      </>
    );
  }

  // Waiting room
  if (onlineState?.status === "waiting") {
    return (
      <>
        <Navigation onOpenStatsHistory={onOpenStatsHistory} />
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
        <Navigation onOpenStatsHistory={onOpenStatsHistory} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="mb-6 animate-slide-in">
            <GameStatus
              gameState={{
                phase: "setup",
                currentPlayer: onlinePlayerNum || 1,
                players: {
                  player1: { name: player1Name, grid: onlineMyGrid || createEmptyGrid(), ships: onlineMyShips || [], hits: 0, shots: [], ready: false },
                  player2: { name: player2Name, grid: onlineOpponentGrid || createEmptyGrid(), ships: onlineOpponentShips || [], hits: 0, shots: [], ready: false },
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
                <div className="inline-flex items-center gap-3 px-6 py-4 dark:bg-slate-800 bg-slate-100 rounded-xl dark:border-slate-700 border-slate-200 border">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-lg dark:text-slate-200 text-slate-700 font-medium">Waiting for {opponentName} to place ships...</p>
                </div>
              </div>
            )}

            <GameBoard
              grid={onlineLocalGrid || createEmptyGrid()}
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
        <Navigation onOpenStatsHistory={onOpenStatsHistory} />

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
                  player1: { name: player1Name, grid: onlineState?.player1Grid || createEmptyGrid(), ships: onlineState?.player1Ships || [], hits: 0, shots: [], ready: true },
                  player2: { name: player2Name, grid: onlineState?.player2Grid || createEmptyGrid(), ships: onlineState?.player2Ships || [], hits: 0, shots: [], ready: true },
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
              onlineIsMyTurn ? "dark:bg-blue-500/10 bg-blue-50 dark:border-blue-500/30 border-blue-200" : "dark:bg-slate-800 bg-slate-100 dark:border-slate-700 border-slate-200"
            }`}>
              <div className={`h-2 w-2 rounded-full ${onlineIsMyTurn ? "bg-blue-400 animate-pulse" : "dark:bg-slate-500 bg-slate-400"}`} />
              <p className="text-sm dark:text-slate-300 text-slate-600 font-medium">
                {onlineIsMyTurn ? `Your Turn (${myName}) — Click to attack!` : `${opponentName}'s Turn...`}
              </p>
            </div>
          </div>

          {shotResult && (
            <div className="text-center mb-4 animate-slide-in">
              <p className={`text-lg font-bold ${shotResult === "hit" ? "text-red-500" : "text-blue-400"}`}>
                {shotResult === "hit" ? "Hit! Go again!" : "Miss!"}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in">
            {/* Player's own board */}
            <div>
              <GameBoard
                grid={onlineMyGrid || createEmptyGrid()}
                onCellClick={() => {}}
                isInteractive={false}
                title={`${myName}'s Fleet`}
                isOpponentView={false}
                remainingShips={onlineMyShips ? onlineMyShips.filter((s: any) =>
                  !s.positions.every(([r, c]: [number, number]) =>
                    onlineMyGrid?.[r]?.[c] === "sunk"
                  )
                ).length : 0}
              />
            </div>

            {/* Opponent's board (attackable) */}
            <div>
              <GameBoard
                grid={onlineOpponentGrid || createEmptyGrid()}
                onCellClick={handleOnlineShot}
                isInteractive={onlineIsMyTurn && !onlineIsProcessing}
                title={`${opponentName}'s Fleet — Attack!`}
                isOpponentView={true}
                remainingShips={onlineOpponentShips ? onlineOpponentShips.filter((s: any) =>
                  !s.positions.every(([r, c]: [number, number]) =>
                    onlineOpponentGrid?.[r]?.[c] === "sunk"
                  )
                ).length : 0}
              />
            </div>
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
    const opponentAbandoned = onlineState.abandonedBy && onlineState.abandonedBy !== onlinePlayerNum;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 dark:bg-black/70 bg-black/50 backdrop-blur-sm"
          onClick={handleBackFromOnline}
        />
        <div className="relative w-full max-w-4xl dark:bg-slate-800 bg-white dark:border-slate-700 border-slate-200 border rounded-2xl shadow-2xl p-6 animate-scale-in overflow-y-auto max-h-[90vh]">
          <button
            onClick={handleBackFromOnline}
            className="absolute top-4 right-4 dark:text-slate-400 text-slate-500 hover:dark:text-white hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-6 animate-slide-in">
            <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2">
              {opponentAbandoned ? "🎉 You Win! (Opponent Left)" : iWon ? "🎉 You Win!" : "💀 You Lose!"}
            </h2>
            <p className="dark:text-slate-400 text-slate-500">
              {opponentAbandoned ? "Opponent abandoned the game!" : iWon ? "Congratulations!" : "Better luck next time!"}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in">
            <GameBoard
              grid={onlineState?.player1Grid || createEmptyGrid()}
              onCellClick={() => {}}
              isInteractive={false}
              title={`${player1Name}'s Fleet`}
              isOpponentView={false}
              remainingShips={0}
            />
            <GameBoard
              grid={onlineState?.player2Grid || createEmptyGrid()}
              onCellClick={() => {}}
              isInteractive={false}
              title={`${player2Name}'s Fleet`}
              isOpponentView={false}
              remainingShips={0}
            />
          </div>

          <div className="mt-6 text-center flex items-center justify-center gap-3">
            <button onClick={handleBackFromOnline} className="btn-primary">
              Play Again
            </button>
            <button onClick={handleViewAnalysis} className="btn-secondary">
              View Analysis
            </button>
            <button onClick={handleBackFromOnline} className="btn-danger">
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAnalysis && analysisNotation) {
    return <GameAnalysis notation={analysisNotation} onExit={handleExitAnalysis} />;
  }

  return null;
}
