import Link from "next/link";
import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";
import { MarkdownView } from "@/components/markdown-view";
import { Panel } from "@/components/ui";
import { listCampaignGameSessions } from "@/lib/actions";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);
  const sessions = await listCampaignGameSessions(id);

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="sessions"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">Campaign · {membership.role}</p>
            <h1 className="mt-1 font-[family-name:var(--font-heading)] text-[40px] font-normal tracking-tight text-text">
              {campaign.name}
            </h1>
            {campaign.description ? (
              <p className="mt-2 max-w-2xl text-sm text-text-3">
                {campaign.description}
              </p>
            ) : null}
          </div>
          <Link
            href={`/campaigns/${id}/sessions/new`}
            className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-[13px] py-1.5 text-[12.5px] text-accent transition hover:border-accent-300 hover:bg-[var(--accent-tint-11)]"
          >
            New session
          </Link>
        </div>

        <section className="mt-8">
          <h2 className="font-[family-name:var(--font-heading)] text-[28px] font-normal text-text">
            Session notes
          </h2>
          <p className="mt-1 text-sm text-text-3">
            Everyone in the campaign can create and edit notes. Link people and
            places from ID cards and maps as you go.
          </p>

          <div className="mt-4 space-y-3">
            {sessions.length === 0 ? (
              <Panel>
                <p className="text-sm text-text-3">
                  No sessions yet. Write the first outline for your table.
                </p>
              </Panel>
            ) : (
              sessions.map((gameSession) => (
                <Link
                  key={gameSession.id}
                  href={`/campaigns/${id}/sessions/${gameSession.id}`}
                  className="block rounded-[var(--radius-lg)] border border-line bg-surface/60 px-5 py-4 transition hover:border-accent-line hover:bg-[var(--accent-tint-04)]"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-[family-name:var(--font-heading)] text-[22px] font-normal text-text">
                      {gameSession.title}
                    </h3>
                    {gameSession.sessionDate ? (
                      <span className="tabular text-[11px] text-muted">
                        {gameSession.sessionDate}
                      </span>
                    ) : null}
                  </div>
                  {gameSession.outline ? (
                    <div className="mt-2">
                      <MarkdownView content={gameSession.outline} clamp />
                    </div>
                  ) : null}
                </Link>
              ))
            )}
          </div>
        </section>
      </main>
    </CampaignChrome>
  );
}
