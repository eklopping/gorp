"use server";

import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { entities, entityAppearances } from "./schema";
import { orderedSessions } from "./fate-order";

export type FateSession = {
  id: string;
  title: string;
  sessionDate: string | null;
  outline: string;
  sortOrder: number;
  createdAt: Date;
};

export type FateEntityPlacement = {
  entityId: string;
  name: string;
  type: "person" | "place";
  role: string;
  allegiance: string;
  description: string;
  imagePath: string | null;
  fromSessionId: string;
  fromSessionIndex: number;
  sortOrder: number;
  note: string;
};

export async function getFateTimelineData(campaignId: string) {
  const sessionsRaw = await orderedSessions(campaignId);
  const sessions: FateSession[] = sessionsRaw.map((session) => ({
    id: session.id,
    title: session.title,
    sessionDate: session.sessionDate,
    outline: session.outline,
    sortOrder: session.sortOrder,
    createdAt: session.createdAt,
  }));

  const campaignEntities = await db
    .select()
    .from(entities)
    .where(eq(entities.campaignId, campaignId))
    .orderBy(asc(entities.sortOrder), asc(entities.createdAt));

  const appearances = await db
    .select({
      entityId: entityAppearances.entityId,
      gameSessionId: entityAppearances.gameSessionId,
      note: entityAppearances.note,
      createdAt: entityAppearances.createdAt,
    })
    .from(entityAppearances)
    .innerJoin(entities, eq(entities.id, entityAppearances.entityId))
    .where(eq(entities.campaignId, campaignId));

  const sessionIndex = new Map(
    sessions.map((session, index) => [session.id, index]),
  );
  const placements: FateEntityPlacement[] = [];
  const placed = new Set<string>();

  function pushPlacement(
    entity: (typeof campaignEntities)[number],
    fromSessionId: string,
    fromSessionIndex: number,
    note: string,
  ) {
    if (placed.has(entity.id)) return;
    placed.add(entity.id);
    placements.push({
      entityId: entity.id,
      name: entity.name,
      type: entity.type,
      role: entity.role,
      allegiance: entity.allegiance,
      description: entity.description,
      imagePath: entity.imagePath,
      fromSessionId,
      fromSessionIndex,
      sortOrder: entity.sortOrder,
      note,
    });
  }

  for (const entity of campaignEntities) {
    if (
      entity.riverSessionId &&
      sessionIndex.has(entity.riverSessionId)
    ) {
      pushPlacement(
        entity,
        entity.riverSessionId,
        sessionIndex.get(entity.riverSessionId)!,
        "On the river",
      );
    }
  }

  for (const appearance of appearances) {
    const index = sessionIndex.get(appearance.gameSessionId);
    if (index === undefined) continue;
    const entity = campaignEntities.find(
      (row) => row.id === appearance.entityId,
    );
    if (!entity || placed.has(entity.id)) continue;
    pushPlacement(entity, appearance.gameSessionId, index, appearance.note);
  }

  for (const entity of campaignEntities) {
    if (placed.has(entity.id) || sessions.length === 0) continue;

    let index = 0;
    for (let i = 0; i < sessions.length; i += 1) {
      if (sessions[i].createdAt.getTime() <= entity.createdAt.getTime()) {
        index = i;
      }
    }

    pushPlacement(entity, sessions[index].id, index, "Introduced");
  }

  placements.sort(
    (a, b) =>
      a.fromSessionIndex - b.fromSessionIndex ||
      a.sortOrder - b.sortOrder ||
      a.name.localeCompare(b.name),
  );

  return { sessions, placements };
}
