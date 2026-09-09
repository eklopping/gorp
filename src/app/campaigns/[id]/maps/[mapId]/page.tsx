import Link from "next/link";
import { notFound } from "next/navigation";
import { MapBoard } from "@/components/map-board";
import { listCampaignGameSessions } from "@/lib/actions";
import {
  getCampaignMap,
  listCampaignEntities,
  listMapMarkers,
} from "@/lib/entity-actions";
import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";

export default async function MapDetailPage({
  params,
}: {
  params: Promise<{ id: string; mapId: string }>;
}) {
  const { id, mapId } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);
  const map = await getCampaignMap(id, mapId);
  if (!map) notFound();

  const [markers, entities, sessions] = await Promise.all([
    listMapMarkers(mapId),
    listCampaignEntities(id),
    listCampaignGameSessions(id),
  ]);

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="maps"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 pb-16">
        <Link
          href={`/campaigns/${id}/maps`}
          className="text-sm text-ink-soft hover:text-accent-deep"
        >
          ← Back to maps
        </Link>
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
    </CampaignChrome>
  );
}
