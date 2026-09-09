import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui";
import { listCampaignMaps } from "@/lib/entity-actions";
import { uploadUrl } from "@/lib/upload-url";
import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";

export default async function MapsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);

  const maps = await listCampaignMaps(id);

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="maps"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
              {campaign.name}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
              Maps
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Import a map, then pin ID cards where the party went and who they
              met.
            </p>
          </div>
          <Link
            href={`/campaigns/${id}/maps/new`}
            className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-[13px] py-1.5 text-[12.5px] text-accent transition hover:border-accent-300 hover:bg-[var(--accent-tint-11)]"
          >
            Import map
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {maps.length === 0 ? (
            <Panel className="sm:col-span-2">
              <p className="text-sm text-ink-soft">
                No maps yet. Upload a region, city, or dungeon map to start
                placing pins.
              </p>
            </Panel>
          ) : (
            maps.map((map) => (
              <Link
                key={map.id}
                href={`/campaigns/${id}/maps/${map.id}`}
                className="group overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface/70 transition hover:border-accent-line"
              >
                <div className="aspect-[16/10] overflow-hidden bg-paper-deep/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadUrl(map.imagePath)}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="px-4 py-3">
                  <h2 className="font-[family-name:var(--font-display)] text-xl">
                    {map.name}
                  </h2>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </CampaignChrome>
  );
}
