"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { createId, createInviteToken } from "./ids";
import {
  campaignInvites,
  campaignMembers,
  campaigns,
  gameSessions,
} from "./schema";
import {
  getActiveMembership,
  requireCampaignGm,
  requireCampaignMember,
  requireSession,
} from "./session";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCampaignAction(formData: FormData) {
  const session = await requireSession();
  const name = formString(formData, "name");
  const description = formString(formData, "description");

  if (!name) {
    redirect("/dashboard");
  }

  const campaignId = createId("cmp");
  const memberId = createId("mem");
  const inviteId = createId("inv");
  const token = createInviteToken();
  const now = new Date();

  await db.insert(campaigns).values({
    id: campaignId,
    name,
    description,
    ownerId: session.user.id,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(campaignMembers).values({
    id: memberId,
    campaignId,
    userId: session.user.id,
    role: "gm",
    status: "active",
    joinedAt: now,
  });

  await db.insert(campaignInvites).values({
    id: inviteId,
    campaignId,
    token,
    createdBy: session.user.id,
    createdAt: now,
  });

  redirect(`/campaigns/${campaignId}`);
}

export async function joinCampaignAction(token: string) {
  const session = await requireSession();
  const [invite] = await db
    .select()
    .from(campaignInvites)
    .where(eq(campaignInvites.token, token))
    .limit(1);

  if (!invite || invite.revokedAt) {
    return { error: "This invite link is invalid or has been revoked." };
  }

  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return { error: "This invite link has expired." };
  }

  const [existing] = await db
    .select()
    .from(campaignMembers)
    .where(
      and(
        eq(campaignMembers.campaignId, invite.campaignId),
        eq(campaignMembers.userId, session.user.id),
      ),
    )
    .limit(1);

  if (existing?.status === "banned") {
    return {
      error: "You are banned from this campaign and cannot rejoin.",
    };
  }

  if (existing?.status === "active") {
    redirect(`/campaigns/${invite.campaignId}`);
  }

  const now = new Date();

  if (existing) {
    await db
      .update(campaignMembers)
      .set({
        status: "active",
        role: "player",
        joinedAt: now,
        removedAt: null,
        removedBy: null,
      })
      .where(eq(campaignMembers.id, existing.id));
  } else {
    await db.insert(campaignMembers).values({
      id: createId("mem"),
      campaignId: invite.campaignId,
      userId: session.user.id,
      role: "player",
      status: "active",
      joinedAt: now,
    });
  }

  redirect(`/campaigns/${invite.campaignId}`);
}

export async function createInviteAction(campaignId: string) {
  const { session } = await requireCampaignGm(campaignId);

  await db
    .update(campaignInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(campaignInvites.campaignId, campaignId),
        isNull(campaignInvites.revokedAt),
      ),
    );

  const token = createInviteToken();
  await db.insert(campaignInvites).values({
    id: createId("inv"),
    campaignId,
    token,
    createdBy: session.user.id,
    createdAt: new Date(),
  });

  revalidatePath(`/campaigns/${campaignId}/members`);
  return { token };
}

export async function revokeInviteAction(campaignId: string, inviteId: string) {
  await requireCampaignGm(campaignId);

  await db
    .update(campaignInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(campaignInvites.id, inviteId),
        eq(campaignInvites.campaignId, campaignId),
      ),
    );

  revalidatePath(`/campaigns/${campaignId}/members`);
}

export async function revokeActiveInviteAction(campaignId: string) {
  await requireCampaignGm(campaignId);

  await db
    .update(campaignInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(campaignInvites.campaignId, campaignId),
        isNull(campaignInvites.revokedAt),
      ),
    );

  revalidatePath(`/campaigns/${campaignId}/members`);
}

export async function kickMemberAction(campaignId: string, memberId: string) {
  const { session } = await requireCampaignGm(campaignId);

  const [member] = await db
    .select()
    .from(campaignMembers)
    .where(
      and(
        eq(campaignMembers.id, memberId),
        eq(campaignMembers.campaignId, campaignId),
      ),
    )
    .limit(1);

  if (!member) {
    return { error: "Member not found." };
  }

  if (member.role === "gm" || member.userId === session.user.id) {
    return { error: "You cannot kick the GM." };
  }

  await db
    .update(campaignMembers)
    .set({
      status: "kicked",
      removedAt: new Date(),
      removedBy: session.user.id,
    })
    .where(eq(campaignMembers.id, memberId));

  revalidatePath(`/campaigns/${campaignId}/members`);
}

export async function banMemberAction(campaignId: string, memberId: string) {
  const { session } = await requireCampaignGm(campaignId);

  const [member] = await db
    .select()
    .from(campaignMembers)
    .where(
      and(
        eq(campaignMembers.id, memberId),
        eq(campaignMembers.campaignId, campaignId),
      ),
    )
    .limit(1);

  if (!member) {
    return { error: "Member not found." };
  }

  if (member.role === "gm" || member.userId === session.user.id) {
    return { error: "You cannot ban the GM." };
  }

  await db
    .update(campaignMembers)
    .set({
      status: "banned",
      removedAt: new Date(),
      removedBy: session.user.id,
    })
    .where(eq(campaignMembers.id, memberId));

  revalidatePath(`/campaigns/${campaignId}/members`);
}

export async function createGameSessionAction(
  campaignId: string,
  formData: FormData,
) {
  const { session } = await requireCampaignMember(campaignId);
  const title = formString(formData, "title");
  const sessionDate = formString(formData, "sessionDate");
  const outline = formString(formData, "outline");

  if (!title) {
    redirect(`/campaigns/${campaignId}/sessions/new`);
  }

  const id = createId("ses");
  await db.insert(gameSessions).values({
    id,
    campaignId,
    title,
    sessionDate: sessionDate || null,
    outline,
    createdBy: session.user.id,
    updatedBy: session.user.id,
  });

  redirect(`/campaigns/${campaignId}/sessions/${id}`);
}

export async function updateGameSessionAction(
  campaignId: string,
  sessionId: string,
  formData: FormData,
) {
  const { session } = await requireCampaignMember(campaignId);
  const title = formString(formData, "title");
  const sessionDate = formString(formData, "sessionDate");
  const outline = formString(formData, "outline");

  if (!title) {
    redirect(`/campaigns/${campaignId}/sessions/${sessionId}`);
  }

  const membership = await getActiveMembership(campaignId, session.user.id);
  if (!membership) {
    redirect("/dashboard");
  }

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
        eq(gameSessions.id, sessionId),
        eq(gameSessions.campaignId, campaignId),
      ),
    );

  revalidatePath(`/campaigns/${campaignId}/sessions/${sessionId}`);
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function listUserCampaigns(userId: string) {
  return db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      description: campaigns.description,
      role: campaignMembers.role,
      updatedAt: campaigns.updatedAt,
    })
    .from(campaignMembers)
    .innerJoin(campaigns, eq(campaigns.id, campaignMembers.campaignId))
    .where(
      and(
        eq(campaignMembers.userId, userId),
        eq(campaignMembers.status, "active"),
      ),
    )
    .orderBy(desc(campaigns.updatedAt));
}

export async function listCampaignGameSessions(campaignId: string) {
  return db
    .select()
    .from(gameSessions)
    .where(eq(gameSessions.campaignId, campaignId))
    .orderBy(desc(gameSessions.updatedAt));
}

export async function getCampaignById(campaignId: string) {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);
  return campaign ?? null;
}

export async function getGameSession(campaignId: string, sessionId: string) {
  const [row] = await db
    .select()
    .from(gameSessions)
    .where(
      and(
        eq(gameSessions.id, sessionId),
        eq(gameSessions.campaignId, campaignId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listCampaignMembers(campaignId: string) {
  return db.query.campaignMembers.findMany({
    where: eq(campaignMembers.campaignId, campaignId),
    with: {
      user: true,
    },
    orderBy: (members, { asc }) => [asc(members.joinedAt)],
  });
}

export async function getActiveInvite(campaignId: string) {
  const invites = await db
    .select()
    .from(campaignInvites)
    .where(eq(campaignInvites.campaignId, campaignId))
    .orderBy(desc(campaignInvites.createdAt));

  return invites.find((invite) => !invite.revokedAt) ?? null;
}
