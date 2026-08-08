import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
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

export const entities = sqliteTable("entities", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["person", "place"] }).notNull(),
  name: text("name").notNull(),
  allegiance: text("allegiance").notNull().default(""),
  role: text("role").notNull().default(""),
  description: text("description").notNull().default(""),
  itemsOfInterest: text("items_of_interest").notNull().default(""),
  imagePath: text("image_path"),
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

export const campaignMaps = sqliteTable("campaign_maps", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  imagePath: text("image_path").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});

export const mapMarkers = sqliteTable("map_markers", {
  id: text("id").primaryKey(),
  mapId: text("map_id")
    .notNull()
    .references(() => campaignMaps.id, { onDelete: "cascade" }),
  entityId: text("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  gameSessionId: text("game_session_id").references(() => gameSessions.id, {
    onDelete: "set null",
  }),
  xPercent: real("x_percent").notNull(),
  yPercent: real("y_percent").notNull(),
  note: text("note").notNull().default(""),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const entityAppearances = sqliteTable("entity_appearances", {
  id: text("id").primaryKey(),
  entityId: text("entity_id")
    .notNull()
    .references(() => entities.id, { onDelete: "cascade" }),
  gameSessionId: text("game_session_id")
    .notNull()
    .references(() => gameSessions.id, { onDelete: "cascade" }),
  mapMarkerId: text("map_marker_id").references(() => mapMarkers.id, {
    onDelete: "set null",
  }),
  note: text("note").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const campaignTags = sqliteTable(
  "campaign_tags",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    tagKey: text("tag_key").notNull(),
    definitionJson: text("definition_json").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("campaign_tags_campaign_key_uidx").on(
      table.campaignId,
      table.tagKey,
    ),
  ],
);

export const vaultItems = sqliteTable("vault_items", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .notNull()
    .references(() => campaigns.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  notes: text("notes").notNull().default(""),
  profileId: text("profile_id").notNull(),
  totalWear: integer("total_wear").notNull(),
  selectedJson: text("selected_json").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  crafterType: text("crafter_type", {
    enum: ["craftsman", "tinker"],
  })
    .notNull()
    .default("craftsman"),
  status: text("status", {
    enum: ["in_progress", "finished"],
  })
    .notNull()
    .default("in_progress"),
  creatorUserId: text("creator_user_id").references(() => user.id, {
    onDelete: "set null",
  }),
  copiedFromId: text("copied_from_id"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});

export const vaultItemSaves = sqliteTable(
  "vault_item_saves",
  {
    id: text("id").primaryKey(),
    vaultItemId: text("vault_item_id")
      .notNull()
      .references(() => vaultItems.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("vault_item_saves_item_user_uidx").on(
      table.vaultItemId,
      table.userId,
    ),
  ],
);

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  owner: one(user, {
    fields: [campaigns.ownerId],
    references: [user.id],
  }),
  members: many(campaignMembers),
  invites: many(campaignInvites),
  gameSessions: many(gameSessions),
  entities: many(entities),
  maps: many(campaignMaps),
  tags: many(campaignTags),
  vaultItems: many(vaultItems),
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

export const gameSessionsRelations = relations(gameSessions, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [gameSessions.campaignId],
    references: [campaigns.id],
  }),
  appearances: many(entityAppearances),
  markers: many(mapMarkers),
}));

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [entities.campaignId],
    references: [campaigns.id],
  }),
  appearances: many(entityAppearances),
  markers: many(mapMarkers),
}));

export const campaignMapsRelations = relations(campaignMaps, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [campaignMaps.campaignId],
    references: [campaigns.id],
  }),
  markers: many(mapMarkers),
}));

export const mapMarkersRelations = relations(mapMarkers, ({ one }) => ({
  map: one(campaignMaps, {
    fields: [mapMarkers.mapId],
    references: [campaignMaps.id],
  }),
  entity: one(entities, {
    fields: [mapMarkers.entityId],
    references: [entities.id],
  }),
  gameSession: one(gameSessions, {
    fields: [mapMarkers.gameSessionId],
    references: [gameSessions.id],
  }),
}));

export const entityAppearancesRelations = relations(
  entityAppearances,
  ({ one }) => ({
    entity: one(entities, {
      fields: [entityAppearances.entityId],
      references: [entities.id],
    }),
    gameSession: one(gameSessions, {
      fields: [entityAppearances.gameSessionId],
      references: [gameSessions.id],
    }),
    mapMarker: one(mapMarkers, {
      fields: [entityAppearances.mapMarkerId],
      references: [mapMarkers.id],
    }),
  }),
);

export const campaignTagsRelations = relations(campaignTags, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignTags.campaignId],
    references: [campaigns.id],
  }),
}));

export const vaultItemsRelations = relations(vaultItems, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [vaultItems.campaignId],
    references: [campaigns.id],
  }),
  creator: one(user, {
    fields: [vaultItems.createdBy],
    references: [user.id],
  }),
  saves: many(vaultItemSaves),
}));

export const vaultItemSavesRelations = relations(vaultItemSaves, ({ one }) => ({
  item: one(vaultItems, {
    fields: [vaultItemSaves.vaultItemId],
    references: [vaultItems.id],
  }),
  user: one(user, {
    fields: [vaultItemSaves.userId],
    references: [user.id],
  }),
}));
