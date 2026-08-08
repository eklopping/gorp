"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "./db";
import { createId } from "./ids";
import { campaignTags, user, vaultItemSaves, vaultItems } from "./schema";
import { requireCampaignMember } from "./session";
import type { SelectedTag, TagDefinition } from "./srr/types";
import { calculateItem, mergeTagRepos } from "./srr/calculator";

export type VaultItemSnapshot = {
  marketValue: number;
  load: number;
  tinkerResource: number;
  tinkerSegments: number;
  tinkerBp: number;
  profileName: string;
};

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

export async function publishVaultItemAction(
  campaignId: string,
  input: {
    name: string;
    notes?: string;
    profileId: string;
    totalWear: number;
    selected: SelectedTag[];
    customTags: TagDefinition[];
  },
) {
  const { session } = await requireCampaignMember(campaignId);
  const name = input.name.trim();
  if (!name) return { error: "Name your item before publishing." };

  // Persist any custom tags used on this build into the campaign repo
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
  });

  const snapshot: VaultItemSnapshot = {
    marketValue: calc.marketValue,
    load: calc.load,
    tinkerResource: calc.tinkerResource,
    tinkerSegments: calc.tinkerSegments,
    tinkerBp: calc.tinkerBp,
    profileName: calc.profile.name,
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
      copiedFromId: vaultItems.copiedFromId,
      createdAt: vaultItems.createdAt,
      createdBy: vaultItems.createdBy,
      creatorName: user.name,
    })
    .from(vaultItems)
    .innerJoin(user, eq(user.id, vaultItems.createdBy))
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
    return {
      ...item,
      selected,
      tagLabels: selected.map((row) => {
        const tag = repo.find((entry) => entry.id === row.tagId);
        const label = tag?.name ?? row.tagId;
        return row.stacks > 1 ? `${label} ×${row.stacks}` : label;
      }),
      snapshot: parseJson<VaultItemSnapshot>(item.snapshotJson, {
        marketValue: 0,
        load: 0,
        tinkerResource: 0,
        tinkerSegments: 0,
        tinkerBp: 0,
        profileName: item.profileId,
      }),
      savedByMe: savedIds.has(item.id),
    };
  });
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

  // Clone a personal copy into the vault under this user
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
