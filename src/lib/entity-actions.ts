"use server";

import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { createId } from "./ids";
import {
  campaignMaps,
  entities,
  entityAppearances,
  gameSessions,
  mapMarkers,
} from "./schema";
import { requireCampaignMember } from "./session";
import { saveCampaignUpload } from "./uploads";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function listCampaignEntities(
  campaignId: string,
  query?: string,
  type?: "person" | "place" | "all",
) {
  const filters = [eq(entities.campaignId, campaignId)];

  if (type && type !== "all") {
    filters.push(eq(entities.type, type));
  }

  if (query?.trim()) {
    const q = `%${query.trim()}%`;
    filters.push(
      or(
        like(entities.name, q),
        like(entities.allegiance, q),
        like(entities.role, q),
        like(entities.description, q),
      )!,
    );
  }

  return db
    .select()
    .from(entities)
    .where(and(...filters))
    .orderBy(asc(entities.name));
}

export async function getEntity(campaignId: string, entityId: string) {
  const [row] = await db
    .select()
    .from(entities)
    .where(and(eq(entities.id, entityId), eq(entities.campaignId, campaignId)))
    .limit(1);
  return row ?? null;
}

export async function listEntityAppearances(entityId: string) {
  return db
    .select({
      id: entityAppearances.id,
      note: entityAppearances.note,
      createdAt: entityAppearances.createdAt,
      mapMarkerId: entityAppearances.mapMarkerId,
      sessionId: gameSessions.id,
      sessionTitle: gameSessions.title,
      sessionDate: gameSessions.sessionDate,
      mapId: mapMarkers.mapId,
      xPercent: mapMarkers.xPercent,
      yPercent: mapMarkers.yPercent,
    })
    .from(entityAppearances)
    .innerJoin(
      gameSessions,
      eq(gameSessions.id, entityAppearances.gameSessionId),
    )
    .leftJoin(mapMarkers, eq(mapMarkers.id, entityAppearances.mapMarkerId))
    .where(eq(entityAppearances.entityId, entityId))
    .orderBy(desc(gameSessions.sessionDate), desc(entityAppearances.createdAt));
}

export async function createEntityAction(
  campaignId: string,
  formData: FormData,
) {
  const { session } = await requireCampaignMember(campaignId);
  const type = formString(formData, "type");
  const name = formString(formData, "name");
  const allegiance = formString(formData, "allegiance");
  const role = formString(formData, "role");
  const description = formString(formData, "description");
  const itemsOfInterest = formString(formData, "itemsOfInterest");
  const image = formFile(formData, "image");

  if (type !== "person" && type !== "place") {
    redirect(`/campaigns/${campaignId}/entities/new`);
  }
  if (!name) {
    redirect(`/campaigns/${campaignId}/entities/new`);
  }

  let imagePath: string | null = null;
  if (image) {
    imagePath = await saveCampaignUpload(campaignId, image, "entity");
  }

  const id = createId("ent");
  await db.insert(entities).values({
    id,
    campaignId,
    type,
    name,
    allegiance,
    role,
    description,
    itemsOfInterest,
    imagePath,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  });

  redirect(`/campaigns/${campaignId}/entities/${id}`);
}

export async function updateEntityAction(
  campaignId: string,
  entityId: string,
  formData: FormData,
) {
  const { session } = await requireCampaignMember(campaignId);
  const name = formString(formData, "name");
  const allegiance = formString(formData, "allegiance");
  const role = formString(formData, "role");
  const description = formString(formData, "description");
  const itemsOfInterest = formString(formData, "itemsOfInterest");
  const image = formFile(formData, "image");

  if (!name) {
    redirect(`/campaigns/${campaignId}/entities/${entityId}`);
  }

  const existing = await getEntity(campaignId, entityId);
  if (!existing) {
    redirect(`/campaigns/${campaignId}/entities`);
  }

  let imagePath = existing.imagePath;
  if (image) {
    imagePath = await saveCampaignUpload(campaignId, image, "entity");
  }

  await db
    .update(entities)
    .set({
      name,
      allegiance,
      role,
      description,
      itemsOfInterest,
      imagePath,
      updatedBy: session.user.id,
      updatedAt: new Date(),
    })
    .where(and(eq(entities.id, entityId), eq(entities.campaignId, campaignId)));

  revalidatePath(`/campaigns/${campaignId}/entities/${entityId}`);
  revalidatePath(`/campaigns/${campaignId}/entities`);
  redirect(`/campaigns/${campaignId}/entities/${entityId}`);
}

export async function addEntityAppearanceAction(
  campaignId: string,
  entityId: string,
  formData: FormData,
) {
  await requireCampaignMember(campaignId);
  const gameSessionId = formString(formData, "gameSessionId");
  const note = formString(formData, "note");

  const entity = await getEntity(campaignId, entityId);
  if (!entity || !gameSessionId) {
    redirect(`/campaigns/${campaignId}/entities/${entityId}`);
  }

  const [sessionRow] = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.id, gameSessionId),
        eq(gameSessions.campaignId, campaignId),
      ),
    )
    .limit(1);

  if (!sessionRow) {
    redirect(`/campaigns/${campaignId}/entities/${entityId}`);
  }

  await db.insert(entityAppearances).values({
    id: createId("app"),
    entityId,
    gameSessionId,
    note,
  });

  revalidatePath(`/campaigns/${campaignId}/entities/${entityId}`);
  revalidatePath(`/campaigns/${campaignId}/sessions/${gameSessionId}`);
}

export async function listCampaignMaps(campaignId: string) {
  return db
    .select()
    .from(campaignMaps)
    .where(eq(campaignMaps.campaignId, campaignId))
    .orderBy(desc(campaignMaps.updatedAt));
}

export async function getCampaignMap(campaignId: string, mapId: string) {
  const [row] = await db
    .select()
    .from(campaignMaps)
    .where(
      and(eq(campaignMaps.id, mapId), eq(campaignMaps.campaignId, campaignId)),
    )
    .limit(1);
  return row ?? null;
}

export async function listMapMarkers(mapId: string) {
  return db
    .select({
      id: mapMarkers.id,
      mapId: mapMarkers.mapId,
      entityId: mapMarkers.entityId,
      gameSessionId: mapMarkers.gameSessionId,
      xPercent: mapMarkers.xPercent,
      yPercent: mapMarkers.yPercent,
      note: mapMarkers.note,
      entityName: entities.name,
      entityType: entities.type,
      entityRole: entities.role,
      entityAllegiance: entities.allegiance,
      entityDescription: entities.description,
      entityImagePath: entities.imagePath,
      sessionTitle: gameSessions.title,
      sessionDate: gameSessions.sessionDate,
    })
    .from(mapMarkers)
    .innerJoin(entities, eq(entities.id, mapMarkers.entityId))
    .leftJoin(gameSessions, eq(gameSessions.id, mapMarkers.gameSessionId))
    .where(eq(mapMarkers.mapId, mapId))
    .orderBy(asc(entities.name));
}

export async function createMapAction(campaignId: string, formData: FormData) {
  const { session } = await requireCampaignMember(campaignId);
  const name = formString(formData, "name");
  const image = formFile(formData, "image");

  if (!name || !image) {
    redirect(`/campaigns/${campaignId}/maps/new`);
  }

  const imagePath = await saveCampaignUpload(campaignId, image, "map");
  const id = createId("map");

  await db.insert(campaignMaps).values({
    id,
    campaignId,
    name,
    imagePath,
    createdBy: session.user.id,
  });

  redirect(`/campaigns/${campaignId}/maps/${id}`);
}

export async function placeMapMarkerAction(
  campaignId: string,
  mapId: string,
  formData: FormData,
) {
  const { session } = await requireCampaignMember(campaignId);
  const entityId = formString(formData, "entityId");
  const gameSessionId = formString(formData, "gameSessionId") || null;
  const note = formString(formData, "note");
  const xPercent = Number(formString(formData, "xPercent"));
  const yPercent = Number(formString(formData, "yPercent"));

  const map = await getCampaignMap(campaignId, mapId);
  const entity = entityId ? await getEntity(campaignId, entityId) : null;

  if (
    !map ||
    !entity ||
    Number.isNaN(xPercent) ||
    Number.isNaN(yPercent) ||
    xPercent < 0 ||
    xPercent > 100 ||
    yPercent < 0 ||
    yPercent > 100
  ) {
    redirect(`/campaigns/${campaignId}/maps/${mapId}`);
  }

  if (gameSessionId) {
    const [sessionRow] = await db
      .select()
      .from(gameSessions)
      .where(
        and(
          eq(gameSessions.id, gameSessionId),
          eq(gameSessions.campaignId, campaignId),
        ),
      )
      .limit(1);
    if (!sessionRow) {
      redirect(`/campaigns/${campaignId}/maps/${mapId}`);
    }
  }

  const markerId = createId("mrk");
  await db.insert(mapMarkers).values({
    id: markerId,
    mapId,
    entityId,
    gameSessionId,
    xPercent,
    yPercent,
    note,
    createdBy: session.user.id,
  });

  if (gameSessionId) {
    await db.insert(entityAppearances).values({
      id: createId("app"),
      entityId,
      gameSessionId,
      mapMarkerId: markerId,
      note,
    });
  }

  revalidatePath(`/campaigns/${campaignId}/maps/${mapId}`);
  revalidatePath(`/campaigns/${campaignId}/entities/${entityId}`);
  if (gameSessionId) {
    revalidatePath(`/campaigns/${campaignId}/sessions/${gameSessionId}`);
  }
}

export async function deleteMapMarkerAction(
  campaignId: string,
  mapId: string,
  markerId: string,
) {
  await requireCampaignMember(campaignId);
  const map = await getCampaignMap(campaignId, mapId);
  if (!map) {
    redirect(`/campaigns/${campaignId}/maps`);
  }

  await db
    .update(entityAppearances)
    .set({ mapMarkerId: null })
    .where(eq(entityAppearances.mapMarkerId, markerId));

  await db
    .delete(mapMarkers)
    .where(and(eq(mapMarkers.id, markerId), eq(mapMarkers.mapId, mapId)));

  revalidatePath(`/campaigns/${campaignId}/maps/${mapId}`);
}
