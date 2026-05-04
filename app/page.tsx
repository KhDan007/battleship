"use client";

import React, { useEffect, useCallback } from "react";
import { useGameState } from "../hooks/useGameState";
import GameBoard from "../components/GameBoard";
import ShipPlacement from "../components/ShipPlacement";
import GameStatus from "../components/GameStatus";
import { GamePhase } from "../lib/types";
import { SHIP_DEFINITIONS } from "../lib/constants";

export default function Home() {
  const {
    gameState,
    placementShip,
    setPlacementShip,
    isHorizontal,
    toggleOrientation,
    placeShip,
    handleShot,
    resetGame,
    getRemainingShipsCount,
    mounted,
  } = useGameState();

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

  if (!mounted || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-slate-300 text-xl">Loading...</div>
      </div>
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
            onCellClick: (row: number, col: number) =>
              handleShot(row, col),
            isInteractive: true,
            title: "Player 2 Fleet - Attack!",
            isOpponentView: true,
            remainingShips: getRemainingShipsCount(2),
          }
        : {
            grid: player1.grid,
            onCellClick: (row: number, col: number) =>
              handleShot(row, col),
            isInteractive: true,
            title: "Player 1 Fleet - Attack!",
            isOpponentView: true,
            remainingShips: getRemainingShipsCount(1),
          }
      : null;

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-white mb-2 tracking-tight">
          ⚓ Battleship
        </h1>

        {phase !== "setup" && (
          <div className="mb-6 animate-slide-in">
            <GameStatus gameState={gameState} onReset={resetGame} />
          </div>
        )}

        {phase === "setup" && (
          <div className="flex flex-col items-center gap-6">
            <ShipPlacement
              placedShips={
                setupPlayer === 1 ? player1.ships : player2.ships
              }
              selectedShip={placementShip}
              onSelectShip={setPlacementShip}
              isHorizontal={isHorizontal}
              onToggleOrientation={toggleOrientation}
              playerName={
                setupPlayer === 1 ? player1.name : player2.name
              }
              onConfirm={() => {}}
              isReady={
                setupPlayer === 1 ? player1.ready : player2.ready
              }
            />

            <div className="text-center text-slate-300">
              <p className="text-lg font-semibold mb-1">
                {setupPlayer === 1
                  ? "Player 1: Place Your Ships"
                  : "Player 2: Place Your Ships"}
              </p>
              <p className="text-sm text-slate-400">
                Select a ship, then click the grid to place it
              </p>
              {placementShip && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
                  <span className="text-xs text-slate-400">
                    Press
                  </span>
                  <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-bold text-blue-400 border border-slate-600">
                    R
                  </kbd>
                  <span className="text-xs text-slate-400">
                    to rotate
                  </span>
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
                (setupPlayer === 1
                  ? player1.ships.length
                  : player2.ships.length)
              }
              selectedShipSize={selectedShipSize}
              isHorizontal={isHorizontal}
            />
          </div>
        )}

        {phase === "battle" && battleBoardProps && (
          <div className="animate-slide-in">
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <p className="text-sm text-slate-300 font-medium">
                  {currentPlayer === 1
                    ? "Player 1's Turn"
                    : "Player 2's Turn"}
                  — Click enemy ships to attack!
                </p>
              </div>
            </div>
            <GameBoard
              grid={battleBoardProps.grid}
              onCellClick={battleBoardProps.onCellClick}
              isInteractive={battleBoardProps.isInteractive}
              title={battleBoardProps.title}
              isOpponentView={battleBoardProps.isOpponentView}
              remainingShips={battleBoardProps.remainingShips}
            />
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

        <div className="mt-6 text-center">
          <button onClick={resetGame} className="btn-danger">
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}
