"use client";

import React, { useEffect, useCallback, useState } from "react";
import { useGameState } from "../hooks/useGameState";
import { useAuth } from "../contexts/AuthContext";
import GameBoard from "./GameBoard";
import ShipPlacement from "./ShipPlacement";
import GameStatus from "./GameStatus";
import GameModeSelector from "./GameModeSelector";
import Navigation from "./Navigation";
import GameAnalysis from "./GameAnalysis";
import { GameMode, BotDifficulty } from "../lib/types";
import { SHIP_DEFINITIONS } from "../lib/constants";

interface LocalGameManagerProps {
  onOpenStatsHistory: () => void;
}

export default function LocalGameManager({ onOpenStatsHistory }: LocalGameManagerProps) {
  const {
    gameState,
    placementShip,
    setPlacementShip,
    isHorizontal,
    toggleOrientation,
    placeShip,
    handleShot,
    resetGame,
    confirmPlacement,
    removeShip,
    getRemainingShipsCount,
    mounted,
    isProcessing,
    shotResult,
    gameMode,
    setGameMode,
    botDifficulty,
    setBotDifficulty,
    showModeSelector,
    setShowModeSelector,
    startGame,
    isBotThinking,
    isAutoPlacing,
    autoPlace,
    stats,
    getLastNotation,
  } = useGameState();

  const { user } = useAuth();
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);
  const [isBotPlacing, setIsBotPlacing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisNotation, setAnalysisNotation] = useState<string | null>(null);

  const handleConfirm = useCallback(() => {
    if (gameMode === "pvbot" && gameState?.setupPlayer === 1) {
      setIsBotPlacing(true);
      setTimeout(() => {
        confirmPlacement();
        setIsBotPlacing(false);
      }, 1500);
    } else {
      confirmPlacement();
    }
  }, [gameMode, gameState?.setupPlayer, confirmPlacement]);

  const handleViewAnalysis = useCallback(() => {
    const notation = getLastNotation();
    if (notation) {
      setAnalysisNotation(notation);
      setShowAnalysis(true);
    }
  }, [getLastNotation]);

  const handleExitAnalysis = useCallback(() => {
    setShowAnalysis(false);
    setAnalysisNotation(null);
    resetGame();
  }, [resetGame]);

  const selectedShipSize = placementShip
    ? SHIP_DEFINITIONS.find((s) => s.id === placementShip)?.size
    : undefined;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" || e.key === "R") {
        if (gameState?.phase === "setup" && placementShip) {
          toggleOrientation();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState?.phase, placementShip, toggleOrientation]);

  useEffect(() => {
    if (gameState?.phase === "setup" && gameState.setupPlayer === 2) {
      setPlacementShip(null);
    }
  }, [gameState?.setupPlayer, setPlacementShip]);

  const gameInProgress = gameState && gameState.phase !== "gameover";

  if (showModeSelector || !gameState) {
    return (
      <>
        <Navigation onOpenStatsHistory={onOpenStatsHistory} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-8">
          <GameModeSelector
            mode={gameMode as GameMode}
            onModeChange={(m) => setGameMode(m)}
            botDifficulty={botDifficulty as BotDifficulty}
            onDifficultyChange={(d) => setBotDifficulty(d)}
            onStart={() => startGame(gameMode as GameMode, botDifficulty as BotDifficulty)}
            onStartOnline={() => {}}
            disabled={false}
          />
        </div>
      </>
    );
  }

  const { phase, currentPlayer, players, setupPlayer } = gameState;
  const player1 = players.player1;
  const player2 = players.player2;

  const battleBoardProps =
    phase === "battle"
      ? currentPlayer === 1
        ? {
            grid: player2.grid,
            onCellClick: (row: number, col: number) => handleShot(row, col),
            isInteractive: true,
            title: gameMode === "pvbot" ? `Bot (${botDifficulty}) Fleet - Attack!` : "Player 2 Fleet - Attack!",
            isOpponentView: true,
            remainingShips: getRemainingShipsCount(2),
          }
        : {
            grid: player1.grid,
            onCellClick: (row: number, col: number) => handleShot(row, col),
            isInteractive: gameMode === "pvp",
            title: gameMode === "pvbot" ? "Your Fleet" : "Player 1 Fleet - Attack!",
            isOpponentView: gameMode === "pvp",
            remainingShips: getRemainingShipsCount(1),
          }
      : null;

  return (
    <>
      <Navigation onOpenStatsHistory={onOpenStatsHistory} />
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {phase !== "setup" && (
          <div className="mb-6 animate-slide-in">
            <GameStatus gameState={gameState} onReset={resetGame} gameMode={gameMode as GameMode} botDifficulty={botDifficulty as BotDifficulty} />
          </div>
        )}

        {phase === "setup" && (
          <div className="flex flex-col items-center gap-6">
            {isBotPlacing ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 px-6 py-4 dark:bg-slate-800 bg-slate-100 rounded-xl dark:border-slate-700 border-slate-200 border">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-lg dark:text-slate-200 text-slate-700 font-medium">Bot is placing ships...</p>
                </div>
              </div>
            ) : (
              <ShipPlacement
                placedShips={setupPlayer === 1 ? player1.ships : player2.ships}
                selectedShip={placementShip}
                onSelectShip={setPlacementShip}
                onRemoveShip={removeShip}
                isHorizontal={isHorizontal}
                onToggleOrientation={toggleOrientation}
                playerName={setupPlayer === 1 ? player1.name : (gameMode === "pvbot" ? `Bot (${botDifficulty})` : player2.name)}
                onConfirm={handleConfirm}
                isReady={setupPlayer === 1 ? player1.ready : player2.ready}
                onAutoPlace={autoPlace}
                isAutoPlacing={isAutoPlacing}
              />
            )}

            <div className="text-center dark:text-slate-300 text-slate-600">
              <p className="text-lg font-semibold mb-1">
                {setupPlayer === 1 ? "Player 1: Place Your Ships" : "Player 2: Place Your Ships"}
              </p>
              <p className="text-sm dark:text-slate-400 text-slate-500">
                Select a ship, then click the grid to place it
              </p>
              {placementShip && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 dark:bg-slate-800 bg-slate-100 rounded-full dark:border-slate-700 border-slate-200 border">
                  <span className="text-xs dark:text-slate-400 text-slate-500">Press</span>
                  <kbd className="px-2 py-0.5 dark:bg-slate-700 dark:text-blue-400 bg-slate-200 text-blue-600 dark:border-slate-600 border-slate-300 border rounded text-xs font-bold">R</kbd>
                  <span className="text-xs dark:text-slate-400 text-slate-500">to rotate</span>
                </div>
              )}
            </div>

            <GameBoard
              grid={setupPlayer === 1 ? player1.grid : player2.grid}
              onCellClick={(row, col) => placeShip(row, col)}
              isInteractive={true}
              title={`${setupPlayer === 1 ? "Player 1" : "Player 2"} Fleet`}
              isOpponentView={false}
              remainingShips={
                SHIP_DEFINITIONS.length -
                (setupPlayer === 1 ? player1.ships.length : player2.ships.length)
              }
              selectedShipSize={selectedShipSize}
              isHorizontal={isHorizontal}
            />
          </div>
        )}

        {phase === "battle" && battleBoardProps && (
          <div className="animate-slide-in">
            {isBotThinking && (
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 dark:bg-slate-800 bg-slate-100 rounded-full dark:border-slate-700 border-slate-200 border">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm dark:text-slate-300 text-slate-600 font-medium">Bot is thinking...</p>
                </div>
              </div>
            )}
            <div className="text-center mb-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2 dark:bg-slate-800 bg-slate-100 rounded-full dark:border-slate-700 border-slate-200 border`}>
                <div className={`h-2 w-2 rounded-full animate-pulse ${isBotThinking ? "bg-amber-400" : "bg-blue-400"}`} />
                <p className="text-sm dark:text-slate-300 text-slate-600 font-medium">
                  {isBotThinking
                    ? "Bot is aiming..."
                    : isProcessing
                    ? "Processing shot..."
                    : `${gameMode === "pvbot" && currentPlayer === 2 ? "Bot's Turn" : `Player ${currentPlayer}'s Turn`} — Click to attack!`}
                </p>
              </div>
            </div>
            <div className="relative">
              <GameBoard
                grid={battleBoardProps.grid}
                onCellClick={battleBoardProps.onCellClick}
                isInteractive={battleBoardProps.isInteractive && !isProcessing && !isBotThinking}
                title={battleBoardProps.title}
                isOpponentView={battleBoardProps.isOpponentView}
                remainingShips={battleBoardProps.remainingShips}
              />
              {isProcessing && shotResult && (
                <div className="absolute inset-0 flex items-center justify-center dark:bg-slate-900/80 bg-white/80 rounded-xl animate-fade-in z-10">
                  <div className={`text-6xl font-black animate-scale-in ${shotResult === "hit" ? "text-red-500" : "text-blue-400"}`}>
                    {shotResult === "hit" ? "HIT!" : "MISS!"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "gameover" && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in">
            <GameBoard
              grid={player1.grid}
              onCellClick={() => {}}
              isInteractive={false}
              title="Player 1 Fleet"
              isOpponentView={false}
              remainingShips={getRemainingShipsCount(1)}
            />
            <GameBoard
              grid={player2.grid}
              onCellClick={() => {}}
              isInteractive={false}
              title="Player 2 Fleet"
              isOpponentView={false}
              remainingShips={getRemainingShipsCount(2)}
            />
          </div>
        )}

        {phase === "gameover" && (
          <div className="mt-6 text-center flex items-center justify-center gap-3">
            <button onClick={resetGame} className="btn-primary">
              Play Again
            </button>
            <button onClick={handleViewAnalysis} className="btn-secondary">
              View Analysis
            </button>
            <button onClick={resetGame} className="btn-danger">
              Main Menu
            </button>
          </div>
        )}

        {(phase === "setup" || phase === "battle") && (
          <div className="mt-6 text-center">
            {!showConfirmAbandon ? (
              <button
                onClick={() => setShowConfirmAbandon(true)}
                className="btn-danger"
              >
                Abandon Game
              </button>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm dark:text-slate-400 text-slate-500">Are you sure?</span>
                <button
                  onClick={() => {
                    setShowConfirmAbandon(false);
                    resetGame();
                  }}
                  className="btn-danger text-sm py-1.5 px-3"
                >
                  Yes, Abandon
                </button>
                <button
                  onClick={() => setShowConfirmAbandon(false)}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showAnalysis && analysisNotation && (
        <GameAnalysis notation={analysisNotation} onExit={handleExitAnalysis} />
      )}
    </>
  );
}
