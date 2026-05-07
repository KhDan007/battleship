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
import { generateNotation } from "../lib/notation";
import { SHIP_DEFINITIONS } from "../lib/constants";

const NOTATION_TEMP_KEY = "battleship_last_notation";

type PendingAction =
  | { type: "bot_turn"; state: GameState }
  | { type: "bot_continue"; state: GameState }
  | { type: "none" };

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [placementShip, setPlacementShip] = useState<string | null>(null);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shotResult, setShotResult] = useState<"hit" | "miss" | null>(null);
  const [gameMode, _setGameMode] = useState<GameMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("battleship_gameMode");
      if (saved === "pvp" || saved === "pvbot" || saved === "online") {
        return saved;
      }
    }
    return "pvp";
  });

  const setGameMode = useCallback((mode: GameMode) => {
    _setGameMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("battleship_gameMode", mode);
    }
  }, []);
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

  const [pendingAction, setPendingAction] = useState<PendingAction>({ type: "none" });
  const botTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();
  const recordGameMutation = useMutation(api.stats.recordGame);

  // Must be defined before the useEffect that references it
  const saveGameToHistory = useCallback(async (state: GameState, notation?: string) => {
    // Always store notation locally for immediate post-game analysis
    if (notation && typeof window !== "undefined") {
      localStorage.setItem(NOTATION_TEMP_KEY, notation);
    }
    if (!user) return;
    try {
      const duration = state.gameStartTime
        ? Math.floor((Date.now() - state.gameStartTime) / 1000)
        : 0;
      await recordGameMutation({
        userId: user.id as Id<"users">,
        won: state.winner === 1,
        shots: state.players.player1.shots.length,
        hits: state.players.player1.hits || 0,
        durationSeconds: duration,
        player2IsBot: state.mode === "pvbot",
        botDifficulty: state.botDifficulty,
        player2Id: undefined,
        shotsPlayer1: state.players.player1.shots.length,
        shotsPlayer2: state.players.player2.shots.length,
        hitsPlayer1: state.players.player1.hits || 0,
        hitsPlayer2: state.players.player2.hits || 0,
        winnerId: state.winner === 1 ? user.id as Id<"users"> : undefined,
        winner: state.winner as 1 | 2,
        notation,
      });
    } catch (error) {
      console.error("Failed to save game history:", error);
    }
  }, [user, recordGameMutation]);

  // Reactive effect: processes pending actions (bot turns) without setTimeout chains
  useEffect(() => {
    if (pendingAction.type === "none") return;

    if (pendingAction.type === "bot_turn" || pendingAction.type === "bot_continue") {
      const state = pendingAction.state;
      if (state.phase !== "battle") {
        setPendingAction({ type: "none" });
        return;
      }

      setIsBotThinking(true);
      const timeout = setTimeout(() => {
        setIsBotThinking(false);

        const { row, col } = getBotShot(state, state.botDifficulty || "medium");
        const targetId = state.currentPlayer === 1 ? 2 : 1;
        const result = processShot(state, targetId, row, col);

        if (result.gameOver) {
          setGameState(result.newState);
          const notation = generateNotation(result.newState);
          saveGameToHistory(result.newState, notation);
          setIsProcessing(false);
          setShotResult(null);
          setPendingAction({ type: "none" });
          return;
        }

        const hit = result.hit;
        setShotResult(hit ? "hit" : "miss");
        setGameState(result.newState);

        if (hit) {
          setTimeout(() => {
            setShotResult(null);
            if (result.newState.phase === "battle") {
              setPendingAction({ type: "bot_continue", state: result.newState });
            } else {
              setIsProcessing(false);
              setPendingAction({ type: "none" });
            }
          }, 2000);
        } else {
          const switched = switchTurn(result.newState);
          setGameState(switched);
          setTimeout(() => {
            setIsProcessing(false);
            setShotResult(null);
          }, 2000);
          setPendingAction({ type: "none" });
        }
      }, 1000);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [pendingAction, saveGameToHistory]);

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
    if (typeof window !== "undefined") {
      localStorage.removeItem(NOTATION_TEMP_KEY);
    }
    setGameState(null);
    setPlacementShip(null);
    setIsProcessing(false);
    setShotResult(null);
    setIsBotThinking(false);
    setShowModeSelector(true);
    setPendingAction({ type: "none" });
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

      setGameState(newState);
    }
    setIsAutoPlacing(false);
  }, [gameState]);

  const confirmPlacement = useCallback(() => {
    if (!gameState || gameState.phase !== "setup") return;
    const newState = JSON.parse(JSON.stringify(gameState));
    const player =
      gameState.setupPlayer === 1
        ? newState.players.player1
        : newState.players.player2;
    player.ready = true;

    if (gameState.setupPlayer === 1) {
      if (gameState.mode === "pvbot") {
        const botResult = autoPlaceShips(
          newState.players.player2.grid,
          SHIP_DEFINITIONS
        );
        if (botResult) {
          newState.players.player2.grid = botResult.grid;
          newState.players.player2.ships = botResult.ships;
          newState.players.player2.ready = true;
        }
        newState.phase = "battle";
        newState.currentPlayer = 1;
      } else {
        newState.setupPlayer = 2;
      }
    } else {
      newState.phase = "battle";
      newState.currentPlayer = 1;
    }

    setGameState(newState);
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

  const removeShip = useCallback(
    (shipId: string) => {
      if (!gameState || gameState.phase !== "setup") return;

      const newState = JSON.parse(JSON.stringify(gameState));
      const player =
        gameState.setupPlayer === 1
          ? newState.players.player1
          : newState.players.player2;

      const shipIndex = player.ships.findIndex((s: Ship) => s.id === shipId);
      if (shipIndex === -1) return;

      const ship = player.ships[shipIndex];

      ship.positions.forEach((pos: { row: number; col: number }) => {
        player.grid[pos.row][pos.col] = "empty";
      });

      player.ships.splice(shipIndex, 1);

      if (placementShip === shipId) {
        setPlacementShip(null);
      }

      player.ready = false;
      setGameState(newState);
    },
    [gameState, placementShip]
  );

  const handleShot = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.phase !== "battle" || isProcessing) return;
      // In PvB mode, only player 1 (human) can click to shoot
      if (gameState.mode === "pvbot" && gameState.currentPlayer === 2) return;

      const targetId = gameState.currentPlayer === 1 ? 2 : 1;
      const result = processShot(gameState, targetId, row, col);

      if (result.gameOver) {
        setGameState(result.newState);
        const notation = generateNotation(result.newState);
        saveGameToHistory(result.newState, notation);
        return;
      }

      const hit = result.hit;
      setShotResult(hit ? "hit" : "miss");
      setIsProcessing(true);
      setGameState(result.newState);

      if (hit) {
        // Player hit — stay on same turn, just clear result after delay
        setTimeout(() => {
          setIsProcessing(false);
          setShotResult(null);
        }, 2000);
      } else {
        // Player missed — switch turn
        const switched = switchTurn(result.newState);
        setGameState(switched);

        // If bot's turn next, schedule it via reactive effect
        if (switched.mode === "pvbot" && switched.currentPlayer === 2) {
          setIsBotThinking(true);
          setPendingAction({ type: "bot_turn", state: switched });
        } else {
          setTimeout(() => {
            setIsProcessing(false);
            setShotResult(null);
          }, 2000);
        }
      }
    },
    [gameState, isProcessing, saveGameToHistory]
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

  const getLastNotation = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(NOTATION_TEMP_KEY);
  }, []);

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
    confirmPlacement,
    removeShip,
    stats,
    getLastNotation,
  };
}
