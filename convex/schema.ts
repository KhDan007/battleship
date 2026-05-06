import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    username: v.string(),
    password: v.string(),
  }).index("by_email", ["email"])
    .index("by_username", ["username"]),

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
    player1GuestId: v.optional(v.string()),
    player2GuestId: v.optional(v.string()),
    player2IsBot: v.boolean(),
    botDifficulty: v.optional(v.string()),
    winnerId: v.optional(v.id("users")),
    winner: v.optional(v.union(v.literal(1), v.literal(2))),
    shotsPlayer1: v.number(),
    shotsPlayer2: v.number(),
    hitsPlayer1: v.number(),
    hitsPlayer2: v.number(),
    durationSeconds: v.optional(v.number()),
    // Online multiplayer fields
    status: v.optional(v.union(
      v.literal("waiting"),
      v.literal("setup"),
      v.literal("battle"),
      v.literal("paused"),
      v.literal("completed")
    )),
    inviteCode: v.optional(v.string()),
    player1Ships: v.optional(v.any()),
    player2Ships: v.optional(v.any()),
    player1Grid: v.optional(v.any()),
    player2Grid: v.optional(v.any()),
    shots: v.optional(v.array(v.object({
      player: v.union(v.literal(1), v.literal(2)),
      row: v.number(),
      col: v.number(),
      hit: v.boolean(),
      timestamp: v.number(),
    }))),
    currentTurn: v.optional(v.union(v.literal(1), v.literal(2))),
    player1LastSeen: v.optional(v.number()),
    player2LastSeen: v.optional(v.number()),
    pausedAt: v.optional(v.number()),
    gameStartTime: v.optional(v.number()),
    abandonedBy: v.optional(v.union(v.literal(1), v.literal(2))),
  }).index("by_player1", ["player1Id"])
    .index("by_player2", ["player2Id"])
    .index("by_invite_code", ["inviteCode"])
    .index("by_status", ["status"]),

  invites: defineTable({
    code: v.string(),
    createdBy: v.optional(v.id("users")),
    createdByGuestId: v.optional(v.string()),
    targetUsername: v.optional(v.string()),
    targetUserId: v.optional(v.id("users")),
    gameId: v.optional(v.id("games")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_code", ["code"])
    .index("by_target_username", ["targetUsername"])
    .index("by_created_by", ["createdBy"])
    .index("by_status", ["status"]),
});
