import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { campaignMaps, entities, gameSessions } from "@/lib/schema";
import type { CampaignNavCounts } from "@/lib/campaign-nav";

export async function getCampaignNavCounts(
  campaignId: string,
): Promise<CampaignNavCounts> {
  const [[sessionRow], [entityRow], [mapRow]] = await Promise.all([
    db
      .select({ value: count() })
      .from(gameSessions)
      .where(eq(gameSessions.campaignId, campaignId)),
    db
      .select({ value: count() })
      .from(entities)
      .where(eq(entities.campaignId, campaignId)),
    db
      .select({ value: count() })
      .from(campaignMaps)
      .where(eq(campaignMaps.campaignId, campaignId)),
  ]);

  return {
    sessions: sessionRow?.value ?? 0,
    entities: entityRow?.value ?? 0,
    maps: mapRow?.value ?? 0,
  };
}
