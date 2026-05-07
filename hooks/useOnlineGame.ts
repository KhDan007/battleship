import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { OnlineGameState, Ship, CellState, GameState } from "../lib/types";
import { createEmptyGrid, autoPlaceShips } from "../lib/gameLogic";
import { generateNotation } from "../lib/notation";

const STORAGE_KEY_GAME_ID = "battleship_online_gameId";
const STORAGE_KEY_PLAYER_NUM = "battleship_online_playerNum";
const STORAGE_KEY_INVITE_CODE = "battleship_online_inviteCode";
const NOTATION_TEMP_KEY = "battleship_last_notation";

export function useOnlineGame() {
  const [gameId, _setGameId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_GAME_ID);
    }
    return null;
  });
  const [playerNum, _setPlayerNum] = useState<1 | 2 | null>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_PLAYER_NUM);
      if (stored === "1") return 1;
      if (stored === "2") return 2;
    }
    return null;
  });
  const [inviteCode, setInviteCode] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_INVITE_CODE);
    }
    return null;
  });
  const [inviteLink, setInviteLink] = useState<string>("");
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<number | null>(null);

  // Wrapped setters that persist to localStorage
  const setGameId = useCallback((id: string | null) => {
    _setGameId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY_GAME_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_GAME_ID);
    }
  }, []);

  const setPlayerNum = useCallback((num: 1 | 2 | null) => {
    _setPlayerNum(num);
    if (num) {
      localStorage.setItem(STORAGE_KEY_PLAYER_NUM, String(num));
    } else {
      localStorage.removeItem(STORAGE_KEY_PLAYER_NUM);
    }
  }, []);

  const setInviteCodePersisted = useCallback((code: string | null) => {
    setInviteCode(code);
    if (code) {
      localStorage.setItem(STORAGE_KEY_INVITE_CODE, code);
    } else {
      localStorage.removeItem(STORAGE_KEY_INVITE_CODE);
    }
  }, []);

  // Convex queries and mutations
  const onlineState = useQuery(
    api.games.getOnlineGame,
    gameId ? { gameId: gameId as any } : "skip"
  ) as OnlineGameState | undefined | null;

  const createInvite = useMutation(api.invites.createInvite);
  const acceptInvite = useMutation(api.invites.acceptInvite);
  const updateShips = useMutation(api.games.updatePlayerShips);
  const recordShotMutation = useMutation(api.games.recordShot);
  const updateLastSeen = useMutation(api.games.updateLastSeen);
  const checkDisconnects = useMutation(api.games.checkDisconnects);
  const startBattleMutation = useMutation(api.games.startBattle);
  const abandonGameMutation = useMutation(api.games.abandonGame);
  const saveNotationMutation = useMutation(api.games.saveNotation);

  // Local state for ship placement
  const [localShips, setLocalShips] = useState<Ship[]>([]);
  const [localGrid, setLocalGrid] = useState<CellState[][]>(createEmptyGrid());

  // Refs for intervals
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const disconnectCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Start heartbeat when game is active
  useEffect(() => {
    if (!gameId || !playerNum || !onlineState) return;

    // Clear existing intervals
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (disconnectCheckRef.current) clearInterval(disconnectCheckRef.current);

    // Heartbeat every 5 seconds
    heartbeatRef.current = setInterval(() => {
      updateLastSeen({ gameId: gameId as any, playerNum });
    }, 5000);

    // Disconnect check every 10 seconds (only during battle)
    disconnectCheckRef.current = setInterval(() => {
      if (onlineState?.status === "battle") {
        checkDisconnects({ gameId: gameId as any }).then((result) => {
          if (result.paused) {
            setIsPaused(true);
            setPausedAt(result.pausedAt ?? Date.now());
          }
        });
      }
    }, 10000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (disconnectCheckRef.current) clearInterval(disconnectCheckRef.current);
    };
  }, [gameId, playerNum, onlineState?._id]);

  // Watch for status changes
  useEffect(() => {
    if (!onlineState) return;

    if (onlineState.status === "paused") {
      setIsPaused(true);
      setPausedAt(onlineState.pausedAt ?? Date.now());
    } else if (onlineState.status === "battle" || onlineState.status === "setup") {
      setIsPaused(false);
      setPausedAt(null);
    }
  }, [onlineState?.status, onlineState?.pausedAt]);

  // Generate and save notation when game completes
  useEffect(() => {
    if (!onlineState || onlineState.status !== "completed") return;
    if (!onlineState.shots || onlineState.shots.length === 0) return;

    // Build a GameState-like object from onlineState for notation generation
    const gameState: GameState = {
      phase: "gameover",
      currentPlayer: onlineState.currentTurn || 1,
      players: {
        player1: {
          id: 1,
          name: onlineState.player1Username || "Player 1",
          grid: onlineState.player1Grid || createEmptyGrid(),
          ships: onlineState.player1Ships || [],
          shots: [],
          hits: 0,
          ready: true,
        },
        player2: {
          id: 2,
          name: onlineState.player2Username || "Player 2",
          grid: onlineState.player2Grid || createEmptyGrid(),
          ships: onlineState.player2Ships || [],
          shots: [],
          hits: 0,
          ready: true,
        },
      },
      winner: onlineState.winner || null,
      setupPlayer: 1,
      mode: "online",
      shotsHistory: onlineState.shots || [],
    };

    const notation = generateNotation(gameState);
    if (typeof window !== "undefined") {
      localStorage.setItem(NOTATION_TEMP_KEY, notation);
    }
    // Also save to DB if we have a gameId
    if (gameId) {
      saveNotationMutation({ gameId: gameId as any, notation }).catch((err) => {
        console.error("Failed to save notation:", err);
      });
    }
  }, [onlineState?.status, onlineState?.shots, gameId, saveNotationMutation]);

  // Host: Create game and invite
  const hostGame = useCallback(
    async (userId?: string, guestId?: string) => {
      try {
        const result = await createInvite({
          userId: userId as any,
          guestId,
        });
        setGameId(result.gameId);
        setPlayerNum(1);
        setInviteCodePersisted(result.code);
        setInviteLink(`${window.location.origin}/join?code=${result.code}`);
        return { code: result.code, link: `${window.location.origin}/join?code=${result.code}` };
      } catch (error) {
        console.error("Failed to create invite:", error);
        throw error;
      }
    },
    [createInvite]
  );

  // Join: Accept invite
  const joinGame = useCallback(
    async (code: string, userId?: string, guestId?: string) => {
      try {
        const result = await acceptInvite({
          code: code.toUpperCase(),
          userId: userId as any,
          guestId,
        });
        setGameId(result.gameId);
        setPlayerNum(result.playerNum as 1 | 2);
        setInviteCodePersisted(code.toUpperCase());
        return result;
      } catch (error) {
        console.error("Failed to join game:", error);
        throw error;
      }
    },
    [acceptInvite]
  );

  // Place ships during setup
  const placeShips = useCallback(
    async (ships: Ship[], grid: CellState[][]) => {
      if (!gameId || !playerNum) return;
      await updateShips({
        gameId: gameId as any,
        playerNum: playerNum as 1 | 2,
        ships,
        grid,
      });
    },
    [gameId, playerNum, updateShips]
  );

  // Take a shot during battle
  const takeShot = useCallback(
    async (row: number, col: number) => {
      if (!gameId || !playerNum || !onlineState) return;

      // Can only shoot on your turn
      if (onlineState.currentTurn !== playerNum) return;

      const targetNum = playerNum === 1 ? 2 : 1;
      const targetGrid =
        targetNum === 1 ? onlineState.player1Grid : onlineState.player2Grid;
      const targetShips =
        targetNum === 1 ? onlineState.player1Ships : onlineState.player2Ships;

      if (!targetGrid || !targetShips) return;

      // Check if already shot at this position
      const alreadyShot = onlineState.shots?.some(
        (s) => s.player === playerNum && s.row === row && s.col === col
      );
      if (alreadyShot) return;

      // Calculate hit locally for the mutation
      const cellValue = targetGrid[row]?.[col];
      const hit = cellValue === "ship";

      // Create updated target grid and ships
      const newTargetGrid = targetGrid.map((r: CellState[], rIdx: number) =>
        r.map((c: CellState, cIdx: number) =>
          rIdx === row && cIdx === col
            ? hit
              ? "hit"
              : "miss"
            : c
        )
      );

      const newTargetShips = targetShips.map((ship: Ship) => {
        if (!hit) return ship;
        const allHit = ship.positions.every(
          ([r, c]: [number, number]) =>
            newTargetGrid[r]?.[c] === "hit" || newTargetGrid[r]?.[c] === "sunk"
        );
        if (allHit) {
          ship.positions.forEach(([r, c]: [number, number]) => {
            newTargetGrid[r][c] = "sunk";
          });
        }
        return { ...ship, positions: [...ship.positions] };
      });

      await recordShotMutation({
        gameId: gameId as any,
        player: playerNum as 1 | 2,
        row,
        col,
        hit,
        targetShips: newTargetShips,
        targetGrid: newTargetGrid,
      });
    },
    [gameId, playerNum, onlineState, recordShotMutation]
  );

  // Start battle phase (called when both players have placed ships)
  const startBattle = useCallback(async () => {
    if (!gameId) return;
    await startBattleMutation({ gameId: gameId as any });
  }, [gameId, startBattleMutation]);

  // Reset online game state
  const resetOnlineGame = useCallback(() => {
    setGameId(null);
    setPlayerNum(null);
    setInviteCodePersisted(null);
    setLocalShips([]);
    setLocalGrid(createEmptyGrid());
    setIsPaused(false);
    setPausedAt(null);
  }, [setGameId, setPlayerNum, setInviteCodePersisted]);

  // Abandon game (opponent wins)
  const abandonGame = useCallback(async () => {
    if (!gameId || !playerNum) return;
    await abandonGameMutation({ gameId: gameId as any, playerNum: playerNum as 1 | 2 });
  }, [gameId, playerNum, abandonGameMutation]);

  // Check if it's the current player's turn
  const isMyTurn = onlineState?.currentTurn === playerNum;

  // Get opponent's grid for rendering
  const opponentGrid =
    playerNum === 1 ? onlineState?.player2Grid : onlineState?.player1Grid;
  const myGrid =
    playerNum === 1 ? onlineState?.player1Grid : onlineState?.player2Grid;
  const opponentShips =
    playerNum === 1 ? onlineState?.player2Ships : onlineState?.player1Ships;
  const myShips =
    playerNum === 1 ? onlineState?.player1Ships : onlineState?.player2Ships;

  return {
    gameId,
    playerNum,
    onlineState,
    inviteCode,
    inviteLink,
    isPaused,
    pausedAt,
    hostGame,
    joinGame,
    placeShips,
    takeShot,
    startBattle,
    abandonGame,
    resetOnlineGame,
    localShips,
    setLocalShips,
    localGrid,
    setLocalGrid,
    isMyTurn,
    opponentGrid,
    myGrid,
    opponentShips,
    myShips,
    setGameId,
    setPlayerNum,
  };
}
