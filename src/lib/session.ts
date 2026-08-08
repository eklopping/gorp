import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { campaignMembers } from "./schema";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function getActiveMembership(campaignId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(campaignMembers)
    .where(
      and(
        eq(campaignMembers.campaignId, campaignId),
        eq(campaignMembers.userId, userId),
        eq(campaignMembers.status, "active"),
      ),
    )
    .limit(1);

  return membership ?? null;
}

export async function requireCampaignMember(campaignId: string) {
  const session = await requireSession();
  const membership = await getActiveMembership(
    campaignId,
    session.user.id,
  );

  if (!membership) {
    redirect("/dashboard");
  }

  return { session, membership };
}

export async function requireCampaignGm(campaignId: string) {
  const { session, membership } = await requireCampaignMember(campaignId);
  if (membership.role !== "gm") {
    redirect(`/campaigns/${campaignId}`);
  }
  return { session, membership };
}
