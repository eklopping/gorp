import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCampaignById,
  listCampaignGameSessions,
} from "@/lib/actions";
import { requireCampaignMember } from "@/lib/session";
import { CampaignNav } from "@/components/campaign-nav";
import { SiteHeader } from "@/components/site-header";
import { Panel } from "@/components/ui";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership } = await requireCampaignMember(id);
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const sessions = await listCampaignGameSessions(id);

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">
              Campaign · {membership.role}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
              {campaign.name}
            </h1>
            {campaign.description ? (
              <p className="mt-2 max-w-2xl text-sm text-ink-soft">
                {campaign.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/campaigns/${id}/sessions/new`}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-paper hover:bg-accent-deep"
            >
              New session
            </Link>
            <Link
              href={`/campaigns/${id}/fate`}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent"
            >
              Fate timeline
            </Link>
            <Link
              href={`/campaigns/${id}/vault`}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent"
            >
              Item vault
            </Link>
            <Link
              href={`/campaigns/${id}/entities/new`}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-accent"
            >
              New ID card
            </Link>
          </div>
        </div>

        <CampaignNav campaignId={id} active="sessions" />

        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Session notes
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Everyone in the campaign can create and edit notes. Link people and
            places from ID cards and maps as you go.
          </p>

          <div className="mt-4 space-y-3">
            {sessions.length === 0 ? (
              <Panel>
                <p className="text-sm text-ink-soft">
                  No sessions yet. Write the first outline for your table.
                </p>
              </Panel>
            ) : (
              sessions.map((gameSession) => (
                <Link
                  key={gameSession.id}
                  href={`/campaigns/${id}/sessions/${gameSession.id}`}
                  className="block rounded-2xl border border-line bg-paper/60 px-5 py-4 transition hover:-translate-y-0.5 hover:border-accent"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-[family-name:var(--font-display)] text-xl">
                      {gameSession.title}
                    </h3>
                    {gameSession.sessionDate ? (
                      <span className="text-xs text-ink-soft">
                        {gameSession.sessionDate}
                      </span>
                    ) : null}
                  </div>
                  {gameSession.outline ? (
                    <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-ink-soft">
                      {gameSession.outline}
                    </p>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
}
