"use client";

import React, { useEffect, useCallback, useState } from "react";
import { useOnlineGame } from "../hooks/useOnlineGame";
import { useGameState } from "../hooks/useGameState";
import GameBoard from "../components/GameBoard";
import ShipPlacement from "../components/ShipPlacement";
import GameStatus from "../components/GameStatus";
import GameModeSelector from "../components/GameModeSelector";
import OnlineLobby from "../components/OnlineLobby";
import WaitingRoom from "../components/WaitingRoom";
import DisconnectNotification from "../components/DisconnectNotification";
import StatisticsDashboard from "../components/StatisticsDashboard";
import GameHistory from "../components/GameHistory";
import Navigation from "../components/Navigation";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../contexts/AuthContext";
import { GamePhase, GameMode, BotDifficulty } from "../lib/types";
import { SHIP_DEFINITIONS } from "../lib/constants";
import { autoPlaceShips } from "../lib/gameLogic";

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
  } = useGameState();

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
  } = useOnlineGame();

  const { user, setShowAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState<"play" | "stats" | "history">("play");
  const [showConfirmAbandon, setShowConfirmAbandon] = useState(false);
  const [isBotPlacing, setIsBotPlacing] = useState(false);

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

  // Online: Handle ship placement confirmation
  const handleOnlineConfirmPlacement = useCallback(() => {
    if (!onlineLocalShips || onlineLocalShips.length < SHIP_DEFINITIONS.length) return;
    onlinePlaceShips(onlineLocalShips, onlineLocalGrid);

    // Check if both players have placed ships
    if (onlineState?.player1Ships && onlineState?.player2Ships) {
      onlineStartBattle();
    }
  }, [onlineLocalShips, onlineLocalGrid, onlineState, onlinePlaceShips, onlineStartBattle]);

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
  }, []);

  const handleBackFromOnline = useCallback(() => {
    resetOnlineGame();
    setShowModeSelector(true);
  }, [resetOnlineGame]);

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

  // Online mode: No gameId yet - show lobby or mode selector
  if (gameMode === "online" && !onlineGameId) {
    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={false} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-8">
          {showModeSelector ? (
            <GameModeSelector
              mode={gameMode}
              onModeChange={(m) => setGameMode(m)}
              botDifficulty={botDifficulty}
              onDifficultyChange={(d) => setBotDifficulty(d)}
              onStart={() => startGame(gameMode, botDifficulty)}
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

  // Online mode: Waiting room (gameId set, status is "waiting" or "setup" before both have placed ships)
  if (gameMode === "online" && onlineGameId && onlineState?.status !== "battle" && onlineState?.status !== "completed") {
    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={true} />
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

  // Online mode: Setup phase (placing ships)
  if (gameMode === "online" && onlineGameId && onlineState?.status === "setup") {
    const currentPlayerShips = onlinePlayerNum === 1 ? onlineState.player1Ships : onlineState.player2Ships;
    const hasPlacedShips = currentPlayerShips && currentPlayerShips.length > 0;

    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={true} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div className="mb-6 animate-slide-in">
            <GameStatus
              gameState={{
                phase: "setup",
                currentPlayer: onlinePlayerNum || 1,
                players: {
                  player1: { name: "You", grid: onlineMyGrid || [], ships: onlineMyShips || [], hits: 0, shots: [], ready: false },
                  player2: { name: "Opponent", grid: onlineOpponentGrid || [], ships: onlineOpponentShips || [], hits: 0, shots: [], ready: false },
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
                playerName={onlinePlayerNum === 1 ? "You (Player 1)" : "You (Player 2)"}
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
                  <p className="text-lg text-slate-200 font-medium">Waiting for opponent to place ships...</p>
                </div>
              </div>
            )}

            <GameBoard
              grid={onlineLocalGrid || []}
              onCellClick={() => {}}
              isInteractive={false}
              title={`${onlinePlayerNum === 1 ? "Player 1" : "Player 2"} Fleet`}
              isOpponentView={false}
              remainingShips={SHIP_DEFINITIONS.length - (onlineLocalShips?.length || 0)}
              selectedShipSize={undefined}
              isHorizontal={isHorizontal}
            />
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={handleBackFromOnline}
              className="btn-danger"
            >
              Abandon Game
            </button>
          </div>
        </div>
      </>
    );
  }

  // Online mode: Battle phase
  if (gameMode === "online" && onlineGameId && onlineState?.status === "battle") {
    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={true} />

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
                  player1: { name: "Player 1", grid: onlineState?.player1Grid || [], ships: onlineState?.player1Ships || [], hits: 0, shots: [], ready: true },
                  player2: { name: "Player 2", grid: onlineState?.player2Grid || [], ships: onlineState?.player2Ships || [], hits: 0, shots: [], ready: true },
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
                {onlineIsMyTurn ? "Your Turn — Click to attack!" : "Opponent's Turn..."}
              </p>
            </div>
          </div>

          <div className="animate-slide-in">
            <GameBoard
              grid={onlineOpponentGrid || []}
              onCellClick={handleOnlineShot}
              isInteractive={onlineIsMyTurn && !isProcessing}
              title="Opponent Fleet — Attack!"
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

  // Online mode: Game over
  if (gameMode === "online" && onlineGameId && onlineState?.status === "completed") {
    const winner = onlineState?.winner;
    const iWon = (winner === 1 && onlinePlayerNum === 1) || (winner === 2 && onlinePlayerNum === 2);

    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={false} />
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
              title="Player 1 Fleet"
              isOpponentView={false}
              remainingShips={0}
            />
            <GameBoard
              grid={onlineState?.player2Grid || []}
              onCellClick={() => {}}
              isInteractive={false}
              title="Player 2 Fleet"
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

  // Local game mode (pvp, pvbot)
  const gameInProgress = gameState && gameState.phase !== "gameover";

  if (showModeSelector || !gameState) {
    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={!!gameInProgress} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-8">
          {activeTab === "play" && (
            <div>
              <GameModeSelector
                mode={gameMode}
                onModeChange={(m) => setGameMode(m)}
                botDifficulty={botDifficulty}
                onDifficultyChange={(d) => setBotDifficulty(d)}
                onStart={() => startGame(gameMode, botDifficulty)}
                onStartOnline={handleStartOnline}
                disabled={false}
              />
            </div>
          )}
          {activeTab === "stats" && <StatisticsDashboard userId={user.id} />}
          {activeTab === "history" && <GameHistory userId={user.id} />}
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

  // Tab switching during active game
  if (activeTab === "stats") {
    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={!!gameInProgress} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-8">
          <StatisticsDashboard userId={user.id} />
        </div>
      </>
    );
  }

  if (activeTab === "history") {
    return (
      <>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={!!gameInProgress} />
        <div className="max-w-4xl mx-auto p-4 sm:p-6 pt-8">
          <GameHistory userId={user.id} />
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} gameInProgress={!!gameInProgress} />
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {phase !== "setup" && (
          <div className="mb-6 animate-slide-in">
            <GameStatus gameState={gameState} onReset={resetGame} gameMode={gameMode} botDifficulty={botDifficulty} />
          </div>
        )}

        {phase === "setup" && (
          <div className="flex flex-col items-center gap-6">
            {isBotPlacing ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center gap-3 px-6 py-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="flex gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-lg text-slate-200 font-medium">Bot is placing ships...</p>
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

            <div className="text-center text-slate-300">
              <p className="text-lg font-semibold mb-1">
                {setupPlayer === 1 ? "Player 1: Place Your Ships" : "Player 2: Place Your Ships"}
              </p>
              <p className="text-sm text-slate-400">
                Select a ship, then click the grid to place it
              </p>
              {placementShip && (
                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
                  <span className="text-xs text-slate-400">Press</span>
                  <kbd className="px-2 py-0.5 bg-slate-700 rounded text-xs font-bold text-blue-400 border border-slate-600">R</kbd>
                  <span className="text-xs text-slate-400">to rotate</span>
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
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <p className="text-sm text-slate-300 font-medium">Bot is thinking...</p>
                </div>
              </div>
            )}
            <div className="text-center mb-4">
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700`}>
                <div className={`h-2 w-2 rounded-full animate-pulse ${isBotThinking ? "bg-amber-400" : "bg-blue-400"}`} />
                <p className="text-sm text-slate-300 font-medium">
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
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-xl animate-fade-in z-10">
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
          <div className="mt-6 text-center">
            <button onClick={resetGame} className="btn-danger">
              New Game
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
                <span className="text-sm text-slate-400">Are you sure?</span>
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
    </>
  );
}
