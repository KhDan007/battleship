import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    username: v.string(),
    password: v.string(),
  }).index("by_email", ["email"]),

  profiles: defineTable({
    userId: v.id("users"),
    username: v.string(),
    gamesPlayed: v.number(),
    gamesWon: v.number(),
    totalShots: v.number(),
    totalHits: v.number(),
    bestGameDuration: v.optional(v.number()),
    currentStreak: v.number(),
    longestStreak: v.number(),
  }).index("by_user", ["userId"]),

  games: defineTable({
    player1Id: v.id("users"),
    player2Id: v.optional(v.id("users")),
    player2IsBot: v.boolean(),
    botDifficulty: v.optional(v.string()),
    winnerId: v.optional(v.id("users")),
    shotsPlayer1: v.number(),
    shotsPlayer2: v.number(),
    hitsPlayer1: v.number(),
    hitsPlayer2: v.number(),
    durationSeconds: v.optional(v.number()),
  }).index("by_player1", ["player1Id"])
    .index("by_player2", ["player2Id"]),
});
