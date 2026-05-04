export const BOARD_SIZE = 10;

export const SHIP_DEFINITIONS = [
  { id: "carrier", name: "Carrier", size: 5 },
  { id: "battleship", name: "Battleship", size: 4 },
  { id: "cruiser", name: "Cruiser", size: 3 },
  { id: "submarine", name: "Submarine", size: 3 },
  { id: "destroyer", name: "Destroyer", size: 2 },
];

export const STORAGE_KEY = "battleship_game_state";

export const PHASE_LABELS: Record<string, string> = {
  setup: "Ship Placement",
  battle: "Battle Phase",
  gameover: "Game Over",
};
