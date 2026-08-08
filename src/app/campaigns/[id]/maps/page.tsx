import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignNav } from "@/components/campaign-nav";
import { SiteHeader } from "@/components/site-header";
import { Panel } from "@/components/ui";
import { getCampaignById } from "@/lib/actions";
import { listCampaignMaps } from "@/lib/entity-actions";
import { requireCampaignMember } from "@/lib/session";
import { uploadUrl } from "@/lib/upload-url";

export default async function MapsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await requireCampaignMember(id);
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const maps = await listCampaignMaps(id);

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
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
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep"
          >
            Import map
          </Link>
        </div>

        <CampaignNav campaignId={id} active="maps" />

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
                className="group overflow-hidden rounded-2xl border border-line bg-paper/70 transition hover:-translate-y-0.5 hover:border-accent"
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
    </>
  );
}
