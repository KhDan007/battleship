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
