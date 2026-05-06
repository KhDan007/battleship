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
