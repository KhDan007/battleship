import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const save = mutation({
  args: {
    player1Id: v.id("users"),
    player2Id: v.optional(v.id("users")),
    player2IsBot: v.boolean(),
    botDifficulty: v.optional(v.string()),
    winnerId: v.optional(v.id("users")),
    winner: v.union(v.literal(1), v.literal(2)),
    shotsPlayer1: v.number(),
    shotsPlayer2: v.number(),
    hitsPlayer1: v.number(),
    hitsPlayer2: v.number(),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("games", args);
  },
});

export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const asPlayer1 = await ctx.db
      .query("games")
      .withIndex("by_player1", (q) => q.eq("player1Id", args.userId))
      .collect();
    const asPlayer2 = await ctx.db
      .query("games")
      .withIndex("by_player2", (q) => q.eq("player2Id", args.userId))
      .collect();
    const all = [...asPlayer1, ...asPlayer2];
    all.sort((a, b) => (b._creationTime - a._creationTime));
    return all.slice(0, 50);
  },
});

export const getOnlineGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.gameId);
  },
});

export const updatePlayerShips = mutation({
  args: {
    gameId: v.id("games"),
    playerNum: v.union(v.literal(1), v.literal(2)),
    ships: v.any(),
    grid: v.any(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const shipsField = args.playerNum === 1 ? "player1Ships" : "player2Ships";
    const gridField = args.playerNum === 1 ? "player1Grid" : "player2Grid";

    await ctx.db.patch(args.gameId, {
      [shipsField]: args.ships,
      [gridField]: args.grid,
      status: "setup",
    });

    return true;
  },
});

export const recordShot = mutation({
  args: {
    gameId: v.id("games"),
    player: v.union(v.literal(1), v.literal(2)),
    row: v.number(),
    col: v.number(),
    hit: v.boolean(),
    targetShips: v.any(),
    targetGrid: v.any(),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");
    if (game.status !== "battle" && game.status !== "setup") {
      throw new Error("Game not in progress");
    }

    const shot = {
      player: args.player,
      row: args.row,
      col: args.col,
      hit: args.hit,
      timestamp: Date.now(),
    };

    const shots = [...(game.shots || []), shot];

    const shotsField = args.player === 1 ? "shotsPlayer1" : "shotsPlayer2";
    const hitsField = args.player === 1 ? "hitsPlayer1" : "hitsPlayer2";

    const update: any = {
      shots,
      [shotsField]: (game[shotsField] || 0) + 1,
      [hitsField]: (game[hitsField] || 0) + (args.hit ? 1 : 0),
      currentTurn: args.player === 1 ? 2 : 1,
    };

    const targetNum = args.player === 1 ? 2 : 1;
    const targetGridField = targetNum === 1 ? "player1Grid" : "player2Grid";
    const targetShipsField = targetNum === 1 ? "player1Ships" : "player2Ships";
    update[targetGridField] = args.targetGrid;
    update[targetShipsField] = args.targetShips;

    const allSunk = args.targetShips.every((ship: any) =>
      ship.positions.every(([r, c]: [number, number]) => {
        const cell = args.targetGrid[r]?.[c];
        return cell === "sunk" || cell === "hit";
      })
    );

    if (allSunk) {
      update.status = "completed";
      update.winner = args.player;
      update.winnerId =
        args.player === 1 ? game.player1Id : game.player2Id;
    }

    await ctx.db.patch(args.gameId, update);
    return { gameOver: allSunk, winner: allSunk ? args.player : null };
  },
});

export const updateLastSeen = mutation({
  args: {
    gameId: v.id("games"),
    playerNum: v.union(v.literal(1), v.literal(2)),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    const field =
      args.playerNum === 1 ? "player1LastSeen" : "player2LastSeen";
    const update: any = { [field]: Date.now() };

    if (game.status === "paused") {
      const p1Seen = args.playerNum === 1 ? Date.now() : game.player1LastSeen;
      const p2Seen = args.playerNum === 2 ? Date.now() : game.player2LastSeen;

      const now = Date.now();
      const p1Active = p1Seen && now - p1Seen < 60000;
      const p2Active = p2Seen && now - p2Seen < 60000;

      if (p1Active && p2Active) {
        update.status = "battle";
        update.pausedAt = undefined;
      }
    }

    await ctx.db.patch(args.gameId, update);
    return true;
  },
});

export const checkDisconnects = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game || game.status !== "battle") return { paused: false };

    const now = Date.now();
    const p1Disconnected =
      game.player1LastSeen && now - game.player1LastSeen > 15000;
    const p2Disconnected =
      game.player2LastSeen && now - game.player2LastSeen > 15000;

    if (p1Disconnected || p2Disconnected) {
      const p1BeyondReconnect =
        game.player1LastSeen && now - game.player1LastSeen > 60000;
      const p2BeyondReconnect =
        game.player2LastSeen && now - game.player2LastSeen > 60000;

      if (p1BeyondReconnect && !p2BeyondReconnect) {
        await ctx.db.patch(args.gameId, {
          status: "completed",
          winner: 2,
          winnerId: game.player2Id,
        });
        return { paused: false, gameOver: true, winner: 2 };
      } else if (p2BeyondReconnect && !p1BeyondReconnect) {
        await ctx.db.patch(args.gameId, {
          status: "completed",
          winner: 1,
          winnerId: game.player1Id,
        });
        return { paused: false, gameOver: true, winner: 1 };
      } else {
        await ctx.db.patch(args.gameId, {
          status: "paused",
          pausedAt: now,
        });
        return { paused: true, pausedAt: now };
      }
    }

    return { paused: false };
  },
});

export const startBattle = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found");

    await ctx.db.patch(args.gameId, {
      status: "battle",
      currentTurn: 1,
    });
    return true;
  },
});
