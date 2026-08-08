"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import { createId } from "./ids";
import {
  campaignMembers,
  campaignTags,
  user,
  vaultItemSaves,
  vaultItems,
} from "./schema";
import { requireCampaignMember } from "./session";
import type {
  CalculatorMode,
  SelectedTag,
  TagDefinition,
  VaultItemStatus,
} from "./srr/types";
import { calculateItem, mergeTagRepos } from "./srr/calculator";

export type VaultItemSnapshot = {
  marketValue: number;
  craftsmanCost: number;
  load: number;
  tinkerResource: number;
  tinkerSegments: number;
  tinkerBp: number;
  profileName: string;
  crafterType: CalculatorMode;
};

const crafterUser = alias(user, "crafter_user");

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function listCampaignTags(campaignId: string) {
  await requireCampaignMember(campaignId);
  const rows = await db
    .select()
    .from(campaignTags)
    .where(eq(campaignTags.campaignId, campaignId))
    .orderBy(desc(campaignTags.updatedAt));

  return rows
    .map((row) => parseJson<TagDefinition | null>(row.definitionJson, null))
    .filter((tag): tag is TagDefinition => Boolean(tag));
}

export async function listActiveCampaignPlayers(campaignId: string) {
  await requireCampaignMember(campaignId);
  const rows = await db
    .select({
      userId: campaignMembers.userId,
      name: user.name,
      role: campaignMembers.role,
    })
    .from(campaignMembers)
    .innerJoin(user, eq(user.id, campaignMembers.userId))
    .where(
      and(
        eq(campaignMembers.campaignId, campaignId),
        eq(campaignMembers.status, "active"),
      ),
    )
    .orderBy(asc(user.name));

  return rows;
}

export async function upsertCampaignTagAction(
  campaignId: string,
  tag: TagDefinition,
) {
  const { session } = await requireCampaignMember(campaignId);
  if (!tag.id || !tag.name || !tag.types?.length) {
    return { error: "Tag needs a name and at least one type." };
  }

  const existing = await db
    .select()
    .from(campaignTags)
    .where(
      and(
        eq(campaignTags.campaignId, campaignId),
        eq(campaignTags.tagKey, tag.id),
      ),
    )
    .limit(1);

  const payload = JSON.stringify({ ...tag, custom: true });

  if (existing[0]) {
    await db
      .update(campaignTags)
      .set({
        definitionJson: payload,
        updatedAt: new Date(),
      })
      .where(eq(campaignTags.id, existing[0].id));
  } else {
    await db.insert(campaignTags).values({
      id: createId("ctg"),
      campaignId,
      tagKey: tag.id,
      definitionJson: payload,
      createdBy: session.user.id,
    });
  }

  revalidatePath(`/campaigns/${campaignId}/vault`);
  return { ok: true };
}

async function assertActiveMember(campaignId: string, userId: string) {
  const [row] = await db
    .select({ id: campaignMembers.id })
    .from(campaignMembers)
    .where(
      and(
        eq(campaignMembers.campaignId, campaignId),
        eq(campaignMembers.userId, userId),
        eq(campaignMembers.status, "active"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function publishVaultItemAction(
  campaignId: string,
  input: {
    name: string;
    notes?: string;
    profileId: string;
    totalWear: number;
    selected: SelectedTag[];
    customTags: TagDefinition[];
    crafterType: CalculatorMode;
    status: VaultItemStatus;
    creatorUserId: string;
  },
) {
  const { session } = await requireCampaignMember(campaignId);
  const name = input.name.trim();
  if (!name) return { error: "Name your item before publishing." };
  if (input.crafterType !== "craftsman" && input.crafterType !== "tinker") {
    return { error: "Pick craftsman or tinker." };
  }
  if (input.status !== "in_progress" && input.status !== "finished") {
    return { error: "Pick in progress or finished." };
  }
  if (!(await assertActiveMember(campaignId, input.creatorUserId))) {
    return { error: "Creator must be an active campaign member." };
  }

  const usedCustom = input.customTags.filter((tag) =>
    input.selected.some((row) => row.tagId === tag.id),
  );
  for (const tag of usedCustom) {
    await upsertCampaignTagAction(campaignId, tag);
  }

  const campaignTagDefs = await listCampaignTags(campaignId);
  const repo = mergeTagRepos([...campaignTagDefs, ...input.customTags]);
  const calc = calculateItem({
    profileId: input.profileId,
    totalWear: input.totalWear,
    selected: input.selected,
    tags: repo,
    crafterType: input.crafterType,
  });

  const snapshot: VaultItemSnapshot = {
    marketValue: calc.marketValue,
    craftsmanCost: calc.craftsmanCost,
    load: calc.load,
    tinkerResource: calc.tinkerResource,
    tinkerSegments: calc.tinkerSegments,
    tinkerBp: calc.tinkerBp,
    profileName: calc.profile.name,
    crafterType: calc.crafterType,
  };

  const id = createId("vlt");
  await db.insert(vaultItems).values({
    id,
    campaignId,
    name,
    notes: input.notes?.trim() ?? "",
    profileId: input.profileId,
    totalWear: input.totalWear,
    selectedJson: JSON.stringify(input.selected),
    snapshotJson: JSON.stringify(snapshot),
    crafterType: input.crafterType,
    status: input.status,
    creatorUserId: input.creatorUserId,
    createdBy: session.user.id,
  });

  revalidatePath(`/campaigns/${campaignId}/vault`);
  return { ok: true, id };
}

export async function listVaultItems(campaignId: string, userId: string) {
  await requireCampaignMember(campaignId);

  const items = await db
    .select({
      id: vaultItems.id,
      name: vaultItems.name,
      notes: vaultItems.notes,
      profileId: vaultItems.profileId,
      totalWear: vaultItems.totalWear,
      selectedJson: vaultItems.selectedJson,
      snapshotJson: vaultItems.snapshotJson,
      crafterType: vaultItems.crafterType,
      status: vaultItems.status,
      creatorUserId: vaultItems.creatorUserId,
      copiedFromId: vaultItems.copiedFromId,
      createdAt: vaultItems.createdAt,
      createdBy: vaultItems.createdBy,
      posterName: user.name,
      creatorName: crafterUser.name,
    })
    .from(vaultItems)
    .innerJoin(user, eq(user.id, vaultItems.createdBy))
    .leftJoin(crafterUser, eq(crafterUser.id, vaultItems.creatorUserId))
    .where(eq(vaultItems.campaignId, campaignId))
    .orderBy(desc(vaultItems.createdAt));

  const saves = await db
    .select()
    .from(vaultItemSaves)
    .where(eq(vaultItemSaves.userId, userId));

  const savedIds = new Set(saves.map((row) => row.vaultItemId));

  const campaignTagDefs = await listCampaignTags(campaignId);
  const repo = mergeTagRepos(campaignTagDefs);

  return items.map((item) => {
    const selected = parseJson<SelectedTag[]>(item.selectedJson, []);
    const snapshot = parseJson<VaultItemSnapshot>(item.snapshotJson, {
      marketValue: 0,
      craftsmanCost: 0,
      load: 0,
      tinkerResource: 0,
      tinkerSegments: 0,
      tinkerBp: 0,
      profileName: item.profileId,
      crafterType: item.crafterType,
    });
    return {
      ...item,
      selected,
      tagLabels: selected.map((row) => {
        const tag = repo.find((entry) => entry.id === row.tagId);
        const label = tag?.name ?? row.tagId;
        return row.stacks > 1 ? `${label} ×${row.stacks}` : label;
      }),
      snapshot: {
        ...snapshot,
        craftsmanCost: snapshot.craftsmanCost || snapshot.marketValue * 2,
        crafterType: snapshot.crafterType ?? item.crafterType,
      },
      creatorName: item.creatorName ?? item.posterName,
      savedByMe: savedIds.has(item.id),
    };
  });
}

export async function updateVaultItemStatusAction(
  campaignId: string,
  vaultItemId: string,
  status: VaultItemStatus,
) {
  const { session, membership } = await requireCampaignMember(campaignId);
  if (status !== "in_progress" && status !== "finished") {
    return { error: "Invalid status." };
  }

  const [item] = await db
    .select()
    .from(vaultItems)
    .where(
      and(
        eq(vaultItems.id, vaultItemId),
        eq(vaultItems.campaignId, campaignId),
      ),
    )
    .limit(1);

  if (!item) return { error: "Item not found." };
  const canEdit =
    membership.role === "gm" ||
    item.createdBy === session.user.id ||
    item.creatorUserId === session.user.id;
  if (!canEdit) {
    return { error: "Only the creator, poster, or GM can update status." };
  }

  await db
    .update(vaultItems)
    .set({ status, updatedAt: new Date() })
    .where(eq(vaultItems.id, vaultItemId));

  revalidatePath(`/campaigns/${campaignId}/vault`);
  return { ok: true };
}

export async function saveVaultItemForSelfAction(
  campaignId: string,
  vaultItemId: string,
) {
  const { session } = await requireCampaignMember(campaignId);

  const [item] = await db
    .select()
    .from(vaultItems)
    .where(
      and(
        eq(vaultItems.id, vaultItemId),
        eq(vaultItems.campaignId, campaignId),
      ),
    )
    .limit(1);

  if (!item) return { error: "Item not found." };

  const existingSave = await db
    .select()
    .from(vaultItemSaves)
    .where(
      and(
        eq(vaultItemSaves.vaultItemId, vaultItemId),
        eq(vaultItemSaves.userId, session.user.id),
      ),
    )
    .limit(1);

  if (existingSave[0]) {
    return { ok: true, id: existingSave[0].vaultItemId, alreadySaved: true };
  }

  await db.insert(vaultItemSaves).values({
    id: createId("vsv"),
    vaultItemId,
    userId: session.user.id,
  });

  const copyId = createId("vlt");
  await db.insert(vaultItems).values({
    id: copyId,
    campaignId,
    name: `${item.name} (saved)`,
    notes: item.notes,
    profileId: item.profileId,
    totalWear: item.totalWear,
    selectedJson: item.selectedJson,
    snapshotJson: item.snapshotJson,
    crafterType: item.crafterType,
    status: item.status,
    creatorUserId: item.creatorUserId ?? session.user.id,
    copiedFromId: item.id,
    createdBy: session.user.id,
  });

  revalidatePath(`/campaigns/${campaignId}/vault`);
  return { ok: true, id: copyId };
}

export async function deleteVaultItemAction(
  campaignId: string,
  vaultItemId: string,
) {
  const { session, membership } = await requireCampaignMember(campaignId);
  const [item] = await db
    .select()
    .from(vaultItems)
    .where(
      and(
        eq(vaultItems.id, vaultItemId),
        eq(vaultItems.campaignId, campaignId),
      ),
    )
    .limit(1);

  if (!item) return { error: "Item not found." };
  if (membership.role !== "gm" && item.createdBy !== session.user.id) {
    return { error: "Only the poster or GM can remove this item." };
  }

  await db.delete(vaultItems).where(eq(vaultItems.id, vaultItemId));
  revalidatePath(`/campaigns/${campaignId}/vault`);
  return { ok: true };
}
