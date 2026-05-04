import { GameState, StoredGameState } from "./types";
import { STORAGE_KEY } from "./constants";

export function saveGameState(gameState: GameState): void {
  try {
    const stored: StoredGameState = {
      gameState,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("Failed to save game state:", error);
  }
}

export function loadGameState(): GameState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed: StoredGameState = JSON.parse(stored);
    if (Date.now() - parsed.timestamp > 24 * 60 * 60 * 1000) {
      clearGameState();
      return null;
    }
    return parsed.gameState;
  } catch (error) {
    console.error("Failed to load game state:", error);
    return null;
  }
}

export function clearGameState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear game state:", error);
  }
}
