import { useState, useEffect, useCallback } from "react";
import {
  GameState,
  Ship,
  GamePhase,
} from "../lib/types";
import {
  createInitialGameState,
  canPlaceShip,
  placeShipOnGrid,
  createShip,
  processShot,
  switchTurn,
  getRemainingShips,
} from "../lib/gameLogic";
import { saveGameState, loadGameState, clearGameState } from "../lib/storage";
import { SHIP_DEFINITIONS } from "../lib/constants";

export function useGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [placementShip, setPlacementShip] = useState<string | null>(null);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shotResult, setShotResult] = useState<"hit" | "miss" | null>(null);

  useEffect(() => {
    setMounted(true);
    const saved = loadGameState();
    if (saved) {
      setGameState(saved);
    } else {
      setGameState(createInitialGameState());
    }
  }, []);

  useEffect(() => {
    if (mounted && gameState) {
      saveGameState(gameState);
    }
  }, [gameState, mounted]);

  const resetGame = useCallback(() => {
    clearGameState();
    setGameState(createInitialGameState());
    setPlacementShip(null);
    setIsProcessing(false);
    setShotResult(null);
  }, []);

  const toggleOrientation = useCallback(() => {
    setIsHorizontal((prev) => !prev);
  }, []);

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

  const handleShot = useCallback(
    (row: number, col: number) => {
      if (!gameState || gameState.phase !== "battle" || isProcessing) return;

      const targetId = gameState.currentPlayer === 1 ? 2 : 1;
      const result = processShot(gameState, targetId, row, col);

      if (result.gameOver) {
        setGameState(result.newState);
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
            return switched;
          });
          setIsProcessing(false);
          setShotResult(null);
        }, 2000);
      }
    },
    [gameState, isProcessing]
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
  };
}
