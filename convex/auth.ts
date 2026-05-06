import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const signUp = mutation({
  args: { email: v.string(), password: v.string(), username: v.string() },
  handler: async (ctx, args) => {
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (existingEmail) {
      throw new Error("This email is already registered. Try signing in instead.");
    }
    const existingUsername = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    if (existingUsername) {
      throw new Error("This username is already taken. Please choose a different one.");
    }
    const userId = await ctx.db.insert("users", {
      email: args.email,
      username: args.username,
      password: args.password, // Note: In production, hash the password!
    });
    await ctx.db.insert("profiles", {
      userId,
      username: args.username,
      gamesPlayed: 0,
      gamesWon: 0,
      totalShots: 0,
      totalHits: 0,
      currentStreak: 0,
      longestStreak: 0,
    });
    return { userId, email: args.email, username: args.username };
  },
});

export const signIn = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user || user.password !== args.password) {
      throw new Error("Invalid email or password");
    }
    return { userId: user._id, email: user.email, username: user.username };
  },
});

export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});
