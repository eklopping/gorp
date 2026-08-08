import { relations } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});

export const campaignMembers = sqliteTable(
  "campaign_members",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["gm", "player"] }).notNull().default("player"),
    status: text("status", {
      enum: ["active", "kicked", "banned"],
    })
      .notNull()
      .default("active"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    removedAt: integer("removed_at", { mode: "timestamp_ms" }),
    removedBy: text("removed_by").references(() => user.id),
  },
  (table) => [
    uniqueIndex("campaign_members_campaign_user_uidx").on(
      table.campaignId,
      table.userId,
    ),
  ],
);

export const campaignInvites = sqliteTable(
  "campaign_invites",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  },
  (table) => [uniqueIndex("campaign_invites_token_uidx").on(table.token)],
);

export const gameSessions = sqliteTable("game_sessions", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  sessionDate: text("session_date"),
  outline: text("outline").notNull().default(""),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  updatedBy: text("updated_by").references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  owner: one(user, {
    fields: [campaigns.ownerId],
    references: [user.id],
  }),
  members: many(campaignMembers),
  invites: many(campaignInvites),
  gameSessions: many(gameSessions),
}));

export const campaignMembersRelations = relations(
  campaignMembers,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignMembers.campaignId],
      references: [campaigns.id],
    }),
    user: one(user, {
      fields: [campaignMembers.userId],
      references: [user.id],
    }),
  }),
);

export const campaignInvitesRelations = relations(
  campaignInvites,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignInvites.campaignId],
      references: [campaigns.id],
    }),
  }),
);

export const gameSessionsRelations = relations(gameSessions, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [gameSessions.campaignId],
    references: [campaigns.id],
  }),
}));
