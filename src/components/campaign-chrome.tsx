import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { CampaignShell } from "@/components/campaign-shell";
import { getCampaignNavCounts } from "@/lib/campaign-counts";
import { getCampaignById } from "@/lib/actions";
import { requireCampaignMember } from "@/lib/session";
import type { CampaignNavKey } from "@/lib/campaign-nav";

export async function loadCampaignChrome(campaignId: string) {
  const { session, membership } = await requireCampaignMember(campaignId);
  const campaign = await getCampaignById(campaignId);
  if (!campaign) notFound();
  const counts = await getCampaignNavCounts(campaignId);
  return { session, membership, campaign, counts };
}

export function CampaignChrome({
  campaignId,
  campaignName,
  userName,
  userRole,
  active,
  counts,
  children,
}: {
  campaignId: string;
  campaignName: string;
  userName: string;
  userRole: "gm" | "player";
  active: CampaignNavKey;
  counts: Awaited<ReturnType<typeof getCampaignNavCounts>>;
  children: ReactNode;
}) {
  return (
    <CampaignShell
      campaignId={campaignId}
      campaignName={campaignName}
      userName={userName}
      userRole={userRole}
      active={active}
      counts={counts}
    >
      {children}
    </CampaignShell>
  );
}
