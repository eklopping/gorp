"use server";

import { and, asc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { entities, gameSessions } from "./schema";
import { requireCampaignMember } from "./session";
import { orderedEntities, orderedSessions } from "./fate-order";

function revalidateCampaign(campaignId: string) {
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/fate`);
  revalidatePath(`/campaigns/${campaignId}/entities`);
  revalidatePath(`/campaigns/${campaignId}/maps`);
}

export async function getNextSessionSortOrder(campaignId: string) {
  const [row] = await db
    .select({ value: max(gameSessions.sortOrder) })
    .from(gameSessions)
    .where(eq(gameSessions.campaignId, campaignId));
  return (row?.value ?? -1) + 1;
}

export async function getNextEntitySortOrder(campaignId: string) {
  const [row] = await db
    .select({ value: max(entities.sortOrder) })
    .from(entities)
    .where(eq(entities.campaignId, campaignId));
  return (row?.value ?? -1) + 1;
}

export async function getLatestSessionId(campaignId: string) {
  const sessions = await orderedSessions(campaignId);
  return sessions.at(-1)?.id ?? null;
}

export async function deleteGameSessionAction(
  campaignId: string,
  sessionId: string,
) {
  await requireCampaignMember(campaignId);

  await db
    .update(entities)
    .set({ riverSessionId: null, updatedAt: new Date() })
    .where(
      and(
        eq(entities.campaignId, campaignId),
        eq(entities.riverSessionId, sessionId),
      ),
    );

  await db
    .delete(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.campaignId, campaignId),
      ),
    );

  revalidateCampaign(campaignId);
  redirect(`/campaigns/${campaignId}`);
}

export async function deleteEntityAction(
  campaignId: string,
  entityId: string,
) {
  await requireCampaignMember(campaignId);

  await db
    .delete(entities)
    .where(
      and(eq(entities.id, entityId), eq(entities.campaignId, campaignId)),
    );

  revalidateCampaign(campaignId);
  redirect(`/campaigns/${campaignId}/entities`);
}

export async function moveGameSessionAction(
  campaignId: string,
  sessionId: string,
  direction: "left" | "right",
) {
  await requireCampaignMember(campaignId);
  const sessions = await orderedSessions(campaignId);
  const index = sessions.findIndex((session) => session.id === sessionId);
  if (index < 0) return { error: "Session not found." };

  const swapWith = direction === "left" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= sessions.length) {
    return { error: "Already at the end of the river." };
  }

  const a = sessions[index];
  const b = sessions[swapWith];

  await db
    .update(gameSessions)
    .set({ sortOrder: b.sortOrder, updatedAt: new Date() })
    .where(eq(gameSessions.id, a.id));
  await db
    .update(gameSessions)
    .set({ sortOrder: a.sortOrder, updatedAt: new Date() })
    .where(eq(gameSessions.id, b.id));

  revalidateCampaign(campaignId);
  return { ok: true };
}

export async function moveEntityOnRiverAction(
  campaignId: string,
  entityId: string,
  direction: "left" | "right",
) {
  await requireCampaignMember(campaignId);

  const sessions = await orderedSessions(campaignId);
  if (sessions.length === 0) return { error: "No sessions on the river." };

  const campaignEntities = await orderedEntities(campaignId);
  const sessionIndex = new Map(
    sessions.map((session, index) => [session.id, index]),
  );

  function anchorIndex(entity: (typeof campaignEntities)[number]) {
    if (entity.riverSessionId && sessionIndex.has(entity.riverSessionId)) {
      return sessionIndex.get(entity.riverSessionId)!;
    }
    let index = 0;
    for (let i = 0; i < sessions.length; i += 1) {
      if (sessions[i].createdAt.getTime() <= entity.createdAt.getTime()) {
        index = i;
      }
    }
    return index;
  }

  const riverItems = campaignEntities
    .map((entity) => ({
      entity,
      sessionIndex: anchorIndex(entity),
    }))
    .sort(
      (a, b) =>
        a.sessionIndex - b.sessionIndex ||
        a.entity.sortOrder - b.entity.sortOrder ||
        a.entity.createdAt.getTime() - b.entity.createdAt.getTime(),
    );

  const index = riverItems.findIndex((item) => item.entity.id === entityId);
  if (index < 0) return { error: "ID card not found." };

  const swapWith = direction === "left" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= riverItems.length) {
    const current = riverItems[index];
    const nextSessionIndex =
      direction === "left"
        ? current.sessionIndex - 1
        : current.sessionIndex + 1;
    if (nextSessionIndex < 0 || nextSessionIndex >= sessions.length) {
      return { error: "Already at the end of the river." };
    }
    await db
      .update(entities)
      .set({
        riverSessionId: sessions[nextSessionIndex].id,
        updatedAt: new Date(),
      })
      .where(eq(entities.id, entityId));
    revalidateCampaign(campaignId);
    return { ok: true };
  }

  const a = riverItems[index];
  const b = riverItems[swapWith];

  await db
    .update(entities)
    .set({
      sortOrder: b.entity.sortOrder,
      riverSessionId: sessions[b.sessionIndex].id,
      updatedAt: new Date(),
    })
    .where(eq(entities.id, a.entity.id));
  await db
    .update(entities)
    .set({
      sortOrder: a.entity.sortOrder,
      riverSessionId: sessions[a.sessionIndex].id,
      updatedAt: new Date(),
    })
    .where(eq(entities.id, b.entity.id));

  revalidateCampaign(campaignId);
  return { ok: true };
}

export async function deleteGameSessionFromFateAction(
  campaignId: string,
  sessionId: string,
) {
  await requireCampaignMember(campaignId);

  await db
    .update(entities)
    .set({ riverSessionId: null, updatedAt: new Date() })
    .where(
      and(
        eq(entities.campaignId, campaignId),
        eq(entities.riverSessionId, sessionId),
      ),
    );

  await db
    .delete(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.campaignId, campaignId),
      ),
    );

  revalidateCampaign(campaignId);
  return { ok: true };
}

export async function deleteEntityFromFateAction(
  campaignId: string,
  entityId: string,
) {
  await requireCampaignMember(campaignId);

  await db
    .delete(entities)
    .where(
      and(eq(entities.id, entityId), eq(entities.campaignId, campaignId)),
    );

  revalidateCampaign(campaignId);
  return { ok: true };
}
