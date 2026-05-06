import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const createInvite = mutation({
  args: {
    userId: v.id("users"),
    guestId: v.optional(v.string()),
    targetUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const code = generateInviteCode();
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000;

    let targetUserId: any = undefined;
    if (args.targetUsername) {
      const target = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", args.targetUsername!))
        .first();
      if (target) {
        targetUserId = target._id;
      }
    }

    // Create the game upfront
    const gameId = await ctx.db.insert("games", {
      player1Id: args.userId,
      player1GuestId: args.guestId,
      player2Id: undefined,
      player2GuestId: undefined,
      player2IsBot: false,
      status: "waiting",
      shotsPlayer1: 0,
      shotsPlayer2: 0,
      hitsPlayer1: 0,
      hitsPlayer2: 0,
      shots: [],
      currentTurn: 1,
      player1LastSeen: args.userId || args.guestId ? now : undefined,
      gameStartTime: now,
      inviteCode: code,
    });

    const inviteId = await ctx.db.insert("invites", {
      code,
      createdBy: args.userId,
      createdByGuestId: args.guestId,
      targetUsername: args.targetUsername,
      targetUserId,
      gameId,
      status: "pending",
      createdAt: now,
      expiresAt,
    });

    return { inviteId, code, expiresAt, gameId };
  },
});

export const getInviteByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!invite) return null;

    // Check expiry (queries can't write, just return status)
    if (Date.now() > invite.expiresAt) {
      return { ...invite, status: "expired" };
    }

    return invite;
  },
});

export const getPendingInvitesForUser = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_target_username", (q) =>
        q.eq("targetUsername", args.username)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    return invites.filter((inv) => Date.now() <= inv.expiresAt);
  },
});

export const acceptInvite = mutation({
  args: {
    code: v.string(),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!invite || invite.status !== "pending") {
      throw new Error("Invite not found or already used");
    }

    if (Date.now() > invite.expiresAt) {
      await ctx.db.patch(invite._id, { status: "expired" });
      throw new Error("Invite has expired");
    }

    if (!invite.gameId) {
      throw new Error("Game not found for this invite");
    }

    const game = await ctx.db.get(invite.gameId);
    if (!game) throw new Error("Game not found");

    // Update player 2 info and set status to setup (both players present)
    const update: any = {
      status: "setup",
      player2LastSeen: Date.now(),
    };
    if (args.userId) {
      update.player2Id = args.userId;
    } else if (args.guestId) {
      update.player2GuestId = args.guestId;
    }
    await ctx.db.patch(invite.gameId, update);

    await ctx.db.patch(invite._id, { status: "accepted" });
    return { gameId: invite.gameId, playerNum: 2 };
  },
});

export const cleanupExpiredInvites = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("invites")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const invite of expired) {
      if (invite.status === "pending") {
        await ctx.db.patch(invite._id, { status: "expired" });
      }
    }

    return expired.length;
  },
});
