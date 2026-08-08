import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { entities, gameSessions } from "./schema";

function sessionLegacyKey(session: {
  sessionDate: string | null;
  createdAt: Date;
}) {
  if (session.sessionDate) return `${session.sessionDate}T00:00:00.000Z`;
  return session.createdAt.toISOString();
}

export async function orderedSessions(campaignId: string) {
  const rows = await db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.campaignId, campaignId));

  const sorted = [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return sessionLegacyKey(a).localeCompare(sessionLegacyKey(b));
  });

  const needsNormalize =
    sorted.length > 0 &&
    (sorted.every((row) => row.sortOrder === 0) ||
      new Set(sorted.map((row) => row.sortOrder)).size !== sorted.length);

  if (needsNormalize) {
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i].sortOrder !== i) {
        await db
          .update(gameSessions)
          .set({ sortOrder: i })
          .where(eq(gameSessions.id, sorted[i].id));
        sorted[i] = { ...sorted[i], sortOrder: i };
      }
    }
  }

  return sorted;
}

export async function orderedEntities(campaignId: string) {
  const rows = await db
    .select()
    .from(entities)
    .where(eq(entities.campaignId, campaignId))
    .orderBy(asc(entities.sortOrder), asc(entities.createdAt));

  const sorted = [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const needsNormalize =
    sorted.length > 0 &&
    (sorted.every((row) => row.sortOrder === 0) ||
      new Set(sorted.map((row) => row.sortOrder)).size !== sorted.length);

  if (needsNormalize) {
    for (let i = 0; i < sorted.length; i += 1) {
      if (sorted[i].sortOrder !== i) {
        await db
          .update(entities)
          .set({ sortOrder: i })
          .where(eq(entities.id, sorted[i].id));
        sorted[i] = { ...sorted[i], sortOrder: i };
      }
    }
  }

  return sorted;
}
