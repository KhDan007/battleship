"use client";

import React, { useEffect } from "react";
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

  useEffect(() => {
    if (gameState?.phase === "setup" && gameState.setupPlayer === 2) {
      setPlacementShip(null);
    }
  }, [gameState?.setupPlayer, setPlacementShip]);

  if (!mounted || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-gray-900">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  const { phase, currentPlayer, players, setupPlayer } = gameState;
  const player1 = players.player1;
  const player2 = players.player2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-white mb-6">
          ⚓ Battleship
        </h1>

        {phase !== "setup" && (
          <div className="mb-6">
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
            <div className="text-center text-white">
              <p className="text-lg font-bold mb-2">
                {setupPlayer === 1
                  ? "Player 1: Place Your Ships"
                  : "Player 2: Place Your Ships"}
              </p>
              <p className="text-sm opacity-75">
                Click a ship, then click the grid to place it
              </p>
            </div>
            <GameBoard
              grid={setupPlayer === 1 ? player1.grid : player2.grid}
              onCellClick={placeShip}
              isInteractive={true}
              title={`${setupPlayer === 1 ? "Player 1" : "Player 2"} Fleet`}
              isOpponentView={false}
              remainingShips={
                SHIP_DEFINITIONS.length -
                (setupPlayer === 1
                  ? player1.ships.length
                  : player2.ships.length)
              }
            />
          </div>
        )}

        {phase === "battle" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div>
              <GameBoard
                grid={player1.grid}
                onCellClick={(row, col) => {
                  if (currentPlayer === 2) handleShot(row, col);
                }}
                isInteractive={currentPlayer === 2}
                title="Player 1 Fleet"
                isOpponentView={currentPlayer === 2}
                remainingShips={getRemainingShipsCount(1)}
              />
              {currentPlayer === 2 && (
                <p className="text-center text-white mt-2 font-bold">
                  Player 2: Click Player 1's board to attack!
                </p>
              )}
            </div>
            <div>
              <GameBoard
                grid={player2.grid}
                onCellClick={(row, col) => {
                  if (currentPlayer === 1) handleShot(row, col);
                }}
                isInteractive={currentPlayer === 1}
                title="Player 2 Fleet"
                isOpponentView={true}
                remainingShips={getRemainingShipsCount(2)}
              />
              {currentPlayer === 1 && (
                <p className="text-center text-white mt-2 font-bold">
                  Player 1: Click Player 2's board to attack!
                </p>
              )}
            </div>
          </div>
        )}

        {phase === "gameover" && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
          >
            Reset Game
          </button>
        </div>
      </div>
    </div>
  );
}
