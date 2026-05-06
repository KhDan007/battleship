import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  GameState,
  Ship,
  GamePhase,
  GameMode,
  BotDifficulty,
  UserStats,
} from "../lib/types";
import {
  createInitialGameState,
  canPlaceShip,
  placeShipOnGrid,
  createShip,
  processShot,
  switchTurn,
  getRemainingShips,
  autoPlaceShips,
} from "../lib/gameLogic";
import { getBotShot } from "../lib/botAI";
import { saveGameState, loadGameState, clearGameState } from "../lib/storage";
import { SHIP_DEFINITIONS } from "../lib/constants";

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [placementShip, setPlacementShip] = useState<string | null>(null);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shotResult, setShotResult] = useState<"hit" | "miss" | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("pvp");
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("medium");
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [isAutoPlacing, setIsAutoPlacing] = useState(false);
  const [stats, setStats] = useState<UserStats>({
    gamesPlayed: 0,
    gamesWon: 0,
    totalShots: 0,
    totalHits: 0,
    bestGameDuration: null,
    currentStreak: 0,
    longestStreak: 0,
  });
  const botTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const saveGameMutation = useMutation(api.games.save);
  const updateStatsMutation = useMutation(api.stats.update);

  useEffect(() => {
    setMounted(true);
    const saved = loadGameState();
    if (saved && saved.phase !== "gameover") {
      setGameState(saved);
      setShowModeSelector(false);
    } else {
      setGameState(null);
    }
  }, []);

  useEffect(() => {
    if (mounted && gameState && gameState.phase !== "gameover") {
      saveGameState(gameState);
    }
  }, [gameState, mounted]);

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
      }
    };
  }, []);

  const resetGame = useCallback(() => {
    clearGameState();
    setGameState(null);
    setPlacementShip(null);
    setIsProcessing(false);
    setShotResult(null);
    setIsBotThinking(false);
    setShowModeSelector(true);
    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }
  }, []);

  const startGame = useCallback(
    (mode: GameMode, difficulty?: BotDifficulty) => {
      const state = createInitialGameState(mode, difficulty);
      state.gameStartTime = Date.now();
      setGameState(state);
      setShowModeSelector(false);
      setGameMode(mode);
      if (difficulty) setBotDifficulty(difficulty);
    },
    []
  );

  const toggleOrientation = useCallback(() => {
    setIsHorizontal((prev) => !prev);
  }, []);

  const autoPlace = useCallback(() => {
    if (!gameState || gameState.phase !== "setup") return;

    setIsAutoPlacing(true);
    const result = autoPlaceShips(
      gameState.setupPlayer === 1
        ? gameState.players.player1.grid
        : gameState.players.player2.grid,
      SHIP_DEFINITIONS
    );

    if (result) {
      const newState = JSON.parse(JSON.stringify(gameState));
      const player =
        gameState.setupPlayer === 1
          ? newState.players.player1
          : newState.players.player2;
      player.grid = result.grid;
      player.ships = result.ships;
      player.ready = true;

      if (gameState.setupPlayer === 1) {
        newState.setupPlayer = 2;
      } else {
        newState.phase = "battle";
        newState.currentPlayer = 1;
      }

      setGameState(newState);
    }
    setIsAutoPlacing(false);
  }, [gameState]);

  const placeShip = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.phase !== "setup" || !placementShip) return;

      const setupPlayer =
        gameState.setupPlayer === 1
          ? gameState.players.player1
          : gameState.players.player2;
      const shipDef = SHIP_DEFINITIONS.find((s) => s.id === placementShip);
      if (!shipDef) return;

      if (
        !canPlaceShip(
          setupPlayer.grid,
          shipDef.size,
          row,
          col,
          isHorizontal
        )
      ) {
        return;
      }

      const newGrid = placeShipOnGrid(
        setupPlayer.grid,
        shipDef.size,
        row,
        col,
        isHorizontal
      );
      const newShip = createShip(
        shipDef.id,
        shipDef.size,
        row,
        col,
        isHorizontal
      );

      const newState = JSON.parse(JSON.stringify(gameState));
      const player =
        gameState.setupPlayer === 1
          ? newState.players.player1
          : newState.players.player2;
      player.grid = newGrid;
      player.ships.push(newShip);

      const allShipsPlaced =
        player.ships.length === SHIP_DEFINITIONS.length;

      if (allShipsPlaced) {
        player.ready = true;
        if (gameState.setupPlayer === 1) {
          newState.setupPlayer = 2;
        } else {
          newState.phase = "battle";
          newState.currentPlayer = 1;
        }
      }

      setGameState(newState);
      setPlacementShip(null);
    },
    [gameState, placementShip, isHorizontal]
  );

  const executeBotTurn = useCallback(
    (currentState: GameState) => {
      if (currentState.phase !== "battle") return;

      const botId = currentState.currentPlayer;
      const bot = botId === 1 ? currentState.players.player1 : currentState.players.player2;
      const difficulty = currentState.botDifficulty || "medium";

      const { row, col } = getBotShot(currentState, difficulty);

      setIsBotThinking(false);

      const targetId = botId === 1 ? 2 : 1;
      const result = processShot(currentState, targetId, row, col);

      if (result.gameOver) {
        setGameState(result.newState);
        saveGameToHistory(result.newState);
        return;
      }

      const hit = result.hit;
      setShotResult(hit ? "hit" : "miss");
      setIsProcessing(true);
      setGameState(result.newState);

      if (hit) {
        botTimeoutRef.current = setTimeout(() => {
          setIsProcessing(false);
          setShotResult(null);
          if (result.newState.phase === "battle" && !checkGameOver(result.newState)) {
            botTimeoutRef.current = setTimeout(() => {
              executeBotTurn(result.newState);
            }, 500);
          }
        }, 2000);
      } else {
        botTimeoutRef.current = setTimeout(() => {
          setGameState((prev) => {
            if (!prev) return prev;
            const switched = switchTurn(prev);
            return switched;
          });
          setIsProcessing(false);
          setShotResult(null);
        }, 2000);
      }
    },
    []
  );

  const checkGameOver = (state: GameState): boolean => {
    return state.phase === "gameover";
  };

  const saveGameToHistory = async (state: GameState) => {
    if (!user) return;

    try {
      const duration = state.gameStartTime
        ? Math.floor((Date.now() - state.gameStartTime) / 1000)
        : 0;

      await saveGameMutation({
        player1Id: user.id as Id<"users">,
        player2Id: undefined,
        player2IsBot: state.mode === "pvbot",
        botDifficulty: state.botDifficulty,
        winnerId: state.winner === 1 ? user.id as Id<"users"> : undefined,
        shotsPlayer1: state.players.player1.shots.length,
        shotsPlayer2: state.players.player2.shots.length,
        hitsPlayer1: state.players.player1.hits || 0,
        hitsPlayer2: state.players.player2.hits || 0,
        durationSeconds: duration,
      });

      await updateStatsMutation({
        userId: user.id as Id<"users">,
      });
    } catch (error) {
      console.error("Failed to save game history:", error);
    }
  };

  const handleShot = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.phase !== "battle" || isProcessing) return;

      const targetId = gameState.currentPlayer === 1 ? 2 : 1;
      const result = processShot(gameState, targetId, row, col);

      if (result.gameOver) {
        setGameState(result.newState);
        saveGameToHistory(result.newState);
        return;
      }

      const hit = result.hit;
      setShotResult(hit ? "hit" : "miss");
      setIsProcessing(true);
      setGameState(result.newState);

      if (hit) {
        setTimeout(() => {
          setIsProcessing(false);
          setShotResult(null);
        }, 2000);
      } else {
        setTimeout(() => {
          setGameState((prev) => {
            if (!prev) return prev;
            const switched = switchTurn(prev);

            if (switched.mode === "pvbot" && switched.currentPlayer === 2) {
              setIsBotThinking(true);
              botTimeoutRef.current = setTimeout(() => {
                executeBotTurn(switched);
              }, 1000);
            }

            return switched;
          });
          setIsProcessing(false);
          setShotResult(null);
        }, 2000);
      }
    },
    [gameState, isProcessing, executeBotTurn]
  );

  const getPlacedShipsCount = useCallback(
    (playerId: 1 | 2) => {
      if (!gameState) return 0;
      const player =
        playerId === 1
          ? gameState.players.player1
          : gameState.players.player2;
      return player.ships.length;
    },
    [gameState]
  );

  const getRemainingShipsCount = useCallback(
    (playerId: 1 | 2) => {
      if (!gameState) return 0;
      const player =
        playerId === 1
          ? gameState.players.player1
          : gameState.players.player2;
      return getRemainingShips(player);
    },
    [gameState]
  );

  return {
    gameState,
    placementShip,
    setPlacementShip,
    isHorizontal,
    toggleOrientation,
    placeShip,
    handleShot,
    resetGame,
    getPlacedShipsCount,
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
  };
}
