import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignNav } from "@/components/campaign-nav";
import { MapBoard } from "@/components/map-board";
import { SiteHeader } from "@/components/site-header";
import { listCampaignGameSessions } from "@/lib/actions";
import {
  getCampaignMap,
  listCampaignEntities,
  listMapMarkers,
} from "@/lib/entity-actions";
import { requireCampaignMember } from "@/lib/session";

export default async function MapDetailPage({
  params,
}: {
  params: Promise<{ id: string; mapId: string }>;
}) {
  const { id, mapId } = await params;
  const { session } = await requireCampaignMember(id);
  const map = await getCampaignMap(id, mapId);
  if (!map) notFound();

  const [markers, entities, sessions] = await Promise.all([
    listMapMarkers(mapId),
    listCampaignEntities(id),
    listCampaignGameSessions(id),
  ]);

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16">
        <Link
          href={`/campaigns/${id}/maps`}
          className="text-sm text-ink-soft hover:text-accent-deep"
        >
          ← Back to maps
        </Link>
        <CampaignNav campaignId={id} active="maps" />
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          {map.name}
        </h1>
        <div className="mt-6">
          <MapBoard
            campaignId={id}
            mapId={mapId}
            imagePath={map.imagePath}
            markers={markers}
            entities={entities}
            sessions={sessions.map((gameSession) => ({
              id: gameSession.id,
              title: gameSession.title,
              sessionDate: gameSession.sessionDate,
            }))}
          />
        </div>
      </main>
    </>
  );
}
