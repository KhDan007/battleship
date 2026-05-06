import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return profile;
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    gamesPlayed: v.optional(v.number()),
    gamesWon: v.optional(v.number()),
    totalShots: v.optional(v.number()),
    totalHits: v.optional(v.number()),
    bestGameDuration: v.optional(v.number()),
    currentStreak: v.optional(v.number()),
    longestStreak: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!profile) return null;
    const { userId, ...fields } = args;
    return await ctx.db.patch(profile._id, fields);
  },
});

export const recordGame = mutation({
  args: {
    userId: v.id("users"),
    won: v.boolean(),
    shots: v.number(),
    hits: v.number(),
    durationSeconds: v.optional(v.number()),
    player2IsBot: v.optional(v.boolean()),
    botDifficulty: v.optional(v.string()),
    // Game fields
    player2Id: v.optional(v.id("users")),
    shotsPlayer1: v.number(),
    shotsPlayer2: v.number(),
    hitsPlayer1: v.number(),
    hitsPlayer2: v.number(),
    winnerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Save game to games table
    await ctx.db.insert("games", {
      player1Id: args.userId,
      player2Id: args.player2Id,
      player2IsBot: args.player2IsBot || false,
      botDifficulty: args.botDifficulty,
      winnerId: args.winnerId,
      shotsPlayer1: args.shotsPlayer1,
      shotsPlayer2: args.shotsPlayer2,
      hitsPlayer1: args.hitsPlayer1,
      hitsPlayer2: args.hitsPlayer2,
      durationSeconds: args.durationSeconds,
    });

    // Update stats
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    if (!profile) return null;

    const newGamesPlayed = (profile.gamesPlayed || 0) + 1;
    const newGamesWon = (profile.gamesWon || 0) + (args.won ? 1 : 0);
    const newTotalShots = (profile.totalShots || 0) + args.shots;
    const newTotalHits = (profile.totalHits || 0) + args.hits;

    const newCurrentStreak = args.won ? (profile.currentStreak || 0) + 1 : 0;
    const newLongestStreak = Math.max(profile.longestStreak || 0, newCurrentStreak);

    const newBestDuration =
      args.durationSeconds && args.durationSeconds > 0
        ? Math.min(profile.bestGameDuration || Infinity, args.durationSeconds)
        : profile.bestGameDuration;

    const fields: any = {
      gamesPlayed: newGamesPlayed,
      gamesWon: newGamesWon,
      totalShots: newTotalShots,
      totalHits: newTotalHits,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
    };
    if (newBestDuration !== undefined) {
      fields.bestGameDuration = newBestDuration;
    }

    return await ctx.db.patch(profile._id, fields);
  },
});
