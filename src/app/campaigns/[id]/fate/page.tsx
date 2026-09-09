import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";
import { FateTimeline } from "@/components/fate-timeline";
import { getFateTimelineData } from "@/lib/fate-timeline";

export default async function FatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);
  const { sessions, placements } = await getFateTimelineData(id);

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="fate"
      counts={counts}
    >
      <main className="w-full flex-1 pb-12">
        <div className="mx-auto w-full max-w-6xl px-6 pt-8">
          <p className="kicker">{campaign.name}</p>
          <h1 className="mt-1 font-[family-name:var(--font-heading)] text-[40px] font-normal tracking-tight text-text">
            Fate river
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-3">
            A living river of golden strands—sessions branch from the current,
            and people and places settle between the moments they enter the
            story.
          </p>
        </div>

        <div className="mt-8 w-full">
          <FateTimeline
            campaignId={id}
            sessions={sessions}
            placements={placements}
          />
        </div>
      </main>
    </CampaignChrome>
  );
}
