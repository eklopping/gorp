import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignNav } from "@/components/campaign-nav";
import { FateTimeline } from "@/components/fate-timeline";
import { SiteHeader } from "@/components/site-header";
import { getCampaignById } from "@/lib/actions";
import { getFateTimelineData } from "@/lib/fate-timeline";
import { requireCampaignMember } from "@/lib/session";

export default async function FatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await requireCampaignMember(id);
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const { sessions, placements } = await getFateTimelineData(id);

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="w-full flex-1 pb-10">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
                {campaign.name}
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
                Fate timeline
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-soft">
                A living river of golden strands—sessions branch from the
                current, and people and places settle between the moments they
                enter the story.
              </p>
            </div>
            <Link
              href={`/campaigns/${id}/sessions/new`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep"
            >
              New session
            </Link>
          </div>

          <CampaignNav campaignId={id} active="fate" />
        </div>

        <div className="mt-6 w-full">
          <FateTimeline
            campaignId={id}
            sessions={sessions}
            placements={placements}
          />
        </div>
      </main>
    </>
  );
}
