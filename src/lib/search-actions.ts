"use server";

import { requireCampaignMember } from "@/lib/session";
import {
  rebuildCampaignSearchIndex,
  searchCampaignDocs,
  type SearchDocType,
  type SearchHit,
} from "@/lib/search";

export async function searchCampaignAction(input: {
  campaignId: string;
  query: string;
  types?: SearchDocType[];
}): Promise<{ ok: true; hits: SearchHit[] } | { ok: false; error: string }> {
  await requireCampaignMember(input.campaignId);
  const hits = searchCampaignDocs({
    campaignId: input.campaignId,
    query: input.query,
    types: input.types,
    limit: 48,
  });

  // Cold start: if nothing indexed yet, rebuild once then retry.
  if (hits.length === 0 && input.query.trim().length >= 2) {
    await rebuildCampaignSearchIndex(input.campaignId);
    return {
      ok: true,
      hits: searchCampaignDocs({
        campaignId: input.campaignId,
        query: input.query,
        types: input.types,
        limit: 48,
      }),
    };
  }

  return { ok: true, hits };
}
