"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { entities, gameSessions } from "@/lib/schema";
import { user } from "@/lib/auth-schema";
import { requireCampaignMember } from "@/lib/session";

export type LiveDocType = "session" | "entity";

export type LiveDocSnapshot = {
  ok: true;
  updatedAt: number;
  updatedBy: string | null;
  updatedByName: string | null;
  fields: Record<string, string>;
  editors: { userId: string; userName: string }[];
};

export type LiveDocPatchResult =
  | (LiveDocSnapshot & { conflict?: false })
  | (LiveDocSnapshot & { conflict: true; message: string })
  | { ok: false; error: string };

type PresenceEntry = {
  userId: string;
  userName: string;
  at: number;
};

const PRESENCE_TTL_MS = 20_000;
const presenceByDoc = new Map<string, Map<string, PresenceEntry>>();

function presenceKey(docType: LiveDocType, docId: string) {
  return `${docType}:${docId}`;
}

function stamp(date: Date | null | undefined) {
  return date ? date.getTime() : 0;
}

function prunePresence(docKey: string) {
  const map = presenceByDoc.get(docKey);
  if (!map) return;
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  for (const [userId, entry] of map) {
    if (entry.at < cutoff) map.delete(userId);
  }
  if (map.size === 0) presenceByDoc.delete(docKey);
}

function listEditors(docKey: string, excludeUserId?: string) {
  prunePresence(docKey);
  const map = presenceByDoc.get(docKey);
  if (!map) return [];
  return [...map.values()]
    .filter((entry) => entry.userId !== excludeUserId)
    .map((entry) => ({ userId: entry.userId, userName: entry.userName }));
}

function touchPresence(
  docType: LiveDocType,
  docId: string,
  userId: string,
  userName: string,
) {
  const key = presenceKey(docType, docId);
  const map = presenceByDoc.get(key) ?? new Map();
  map.set(userId, { userId, userName, at: Date.now() });
  presenceByDoc.set(key, map);
  return listEditors(key, userId);
}

async function resolveUpdaterName(userId: string | null) {
  if (!userId) return null;
  const [row] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.name ?? null;
}

async function loadSessionSnapshot(
  campaignId: string,
  sessionId: string,
  editors: { userId: string; userName: string }[],
): Promise<LiveDocSnapshot | { ok: false; error: string }> {
  const [row] = await db
    .select({
      title: gameSessions.title,
      sessionDate: gameSessions.sessionDate,
      outline: gameSessions.outline,
      updatedAt: gameSessions.updatedAt,
      updatedBy: gameSessions.updatedBy,
    })
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.campaignId, campaignId),
      ),
    )
    .limit(1);
  if (!row) return { ok: false, error: "Session not found." };
  return {
    ok: true,
    updatedAt: stamp(row.updatedAt),
    updatedBy: row.updatedBy,
    updatedByName: await resolveUpdaterName(row.updatedBy),
    fields: {
      title: row.title,
      sessionDate: row.sessionDate ?? "",
      outline: row.outline,
    },
    editors,
  };
}

async function loadEntitySnapshot(
  campaignId: string,
  entityId: string,
  editors: { userId: string; userName: string }[],
): Promise<LiveDocSnapshot | { ok: false; error: string }> {
  const [row] = await db
    .select({
      name: entities.name,
      role: entities.role,
      allegiance: entities.allegiance,
      description: entities.description,
      itemsOfInterest: entities.itemsOfInterest,
      updatedAt: entities.updatedAt,
      updatedBy: entities.updatedBy,
    })
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.campaignId, campaignId)))
    .limit(1);
  if (!row) return { ok: false, error: "ID card not found." };
  return {
    ok: true,
    updatedAt: stamp(row.updatedAt),
    updatedBy: row.updatedBy,
    updatedByName: await resolveUpdaterName(row.updatedBy),
    fields: {
      name: row.name,
      role: row.role,
      allegiance: row.allegiance,
      description: row.description,
      itemsOfInterest: row.itemsOfInterest,
    },
    editors,
  };
}

export async function getLiveDocSnapshotAction(input: {
  campaignId: string;
  docType: LiveDocType;
  docId: string;
}): Promise<LiveDocSnapshot | { ok: false; error: string }> {
  const { session } = await requireCampaignMember(input.campaignId);
  const editors = touchPresence(
    input.docType,
    input.docId,
    session.user.id,
    session.user.name,
  );
  if (input.docType === "session") {
    return loadSessionSnapshot(input.campaignId, input.docId, editors);
  }
  return loadEntitySnapshot(input.campaignId, input.docId, editors);
}

export async function heartbeatLiveDocAction(input: {
  campaignId: string;
  docType: LiveDocType;
  docId: string;
}) {
  const { session } = await requireCampaignMember(input.campaignId);
  const editors = touchPresence(
    input.docType,
    input.docId,
    session.user.id,
    session.user.name,
  );
  return { ok: true as const, editors };
}

export async function patchLiveDocAction(input: {
  campaignId: string;
  docType: LiveDocType;
  docId: string;
  expectedUpdatedAt: number;
  patch: Record<string, string>;
}): Promise<LiveDocPatchResult> {
  const { session } = await requireCampaignMember(input.campaignId);
  const editors = touchPresence(
    input.docType,
    input.docId,
    session.user.id,
    session.user.name,
  );

  if (input.docType === "session") {
    const current = await loadSessionSnapshot(
      input.campaignId,
      input.docId,
      editors,
    );
    if (!current.ok) return current;
    if (
      input.expectedUpdatedAt > 0 &&
      current.updatedAt !== input.expectedUpdatedAt
    ) {
      return {
        ...current,
        conflict: true,
        message: current.updatedByName
          ? `${current.updatedByName} saved a newer version — loaded their changes.`
          : "A newer version was saved — loaded the latest notes.",
      };
    }

    const title = (input.patch.title ?? current.fields.title).trim();
    if (!title) return { ok: false, error: "Title is required." };
    const sessionDate = (input.patch.sessionDate ?? current.fields.sessionDate)
      .trim();
    const outline = input.patch.outline ?? current.fields.outline;

    await db
      .update(gameSessions)
      .set({
        title,
        sessionDate: sessionDate || null,
        outline,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(gameSessions.id, input.docId),
          eq(gameSessions.campaignId, input.campaignId),
        ),
      );

    revalidatePath(`/campaigns/${input.campaignId}/sessions/${input.docId}`);
    revalidatePath(`/campaigns/${input.campaignId}`);
    revalidatePath(`/campaigns/${input.campaignId}/fate`);

    return loadSessionSnapshot(input.campaignId, input.docId, editors);
  }

  const current = await loadEntitySnapshot(
    input.campaignId,
    input.docId,
    editors,
  );
  if (!current.ok) return current;
  if (
    input.expectedUpdatedAt > 0 &&
    current.updatedAt !== input.expectedUpdatedAt
  ) {
    return {
      ...current,
      conflict: true,
      message: current.updatedByName
        ? `${current.updatedByName} saved a newer version — loaded their changes.`
        : "A newer version was saved — loaded the latest ID card.",
    };
  }

  const name = (input.patch.name ?? current.fields.name).trim();
  if (!name) return { ok: false, error: "Name is required." };

  await db
    .update(entities)
    .set({
      name,
      role: (input.patch.role ?? current.fields.role).trim(),
      allegiance: (input.patch.allegiance ?? current.fields.allegiance).trim(),
      description: input.patch.description ?? current.fields.description,
      itemsOfInterest:
        input.patch.itemsOfInterest ?? current.fields.itemsOfInterest,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(entities.id, input.docId),
        eq(entities.campaignId, input.campaignId),
      ),
    );

  revalidatePath(`/campaigns/${input.campaignId}/entities/${input.docId}`);
  revalidatePath(`/campaigns/${input.campaignId}/entities`);
  revalidatePath(`/campaigns/${input.campaignId}/fate`);

  return loadEntitySnapshot(input.campaignId, input.docId, editors);
}
