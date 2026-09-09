import Link from "next/link";
import { BookOpen } from "lucide-react";
import { CampaignChrome, loadCampaignChrome } from "@/components/campaign-chrome";
import { Panel, TitleRule } from "@/components/ui";

export default async function CampaignRulebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="rulebook"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 pb-16">
        <TitleRule
          title="Rule book"
          meta="Shared Savage Root ruleset · across all campaigns"
          action={
            <span className="rounded-[var(--radius-md)] border border-line px-3 py-1.5 text-[12.5px] text-muted">
              Import soon
            </span>
          }
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[236px_1fr_268px]">
          <aside className="rounded-[var(--radius-lg)] border border-line bg-surface px-3 py-4">
            <p className="kicker px-2">Contents</p>
            <p className="mt-4 px-2 text-[12.5px] text-muted">
              No sections yet.
            </p>
            <div className="my-4 h-px bg-[var(--line-soft)]" />
            <p className="kicker px-2">Your marks</p>
            <p className="mt-3 px-2 text-[12.5px] text-muted">None saved.</p>
          </aside>

          <Panel className="min-h-[420px]">
            <div className="flex flex-col items-start gap-4">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] border border-accent-line text-accent">
                <BookOpen className="size-5" strokeWidth={1.5} />
              </div>
              <div>
                <p className="kicker">v0 · empty shell</p>
                <h2 className="mt-2 font-[family-name:var(--font-heading)] text-[28px] font-normal leading-tight text-text">
                  Core Rules
                </h2>
                <p className="mt-3 max-w-[60ch] text-[14.5px] leading-[1.85] text-text-2">
                  The reading view, contents rail, and quick-reference cards
                  land here. Markdown import ships next; PDF import after the
                  corrected Savage Root PDF arrives. Sample rule text from the
                  mockups will not be treated as canonical.
                </p>
              </div>
              <Link
                href={`/campaigns/${id}`}
                className="rounded-[var(--radius-md)] border border-[rgba(225,173,102,0.5)] px-[13px] py-1.5 text-[12.5px] text-accent transition hover:border-accent-300 hover:bg-[var(--accent-tint-11)]"
              >
                Back to sessions
              </Link>
            </div>
          </Panel>

          <aside className="rounded-[var(--radius-lg)] border border-line bg-surface px-3 py-4">
            <p className="kicker px-1">Quick reference</p>
            <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-muted">
              Trait test, Raise, Bennies, Wear — GM-authored cards will sit
              here and in session side panels.
            </p>
            <div className="my-4 h-px bg-[var(--line-soft)]" />
            <p className="kicker px-1">Cited in your notes</p>
            <p className="mt-3 px-1 text-[12.5px] text-muted">
              Two-way citations appear once the book has sections.
            </p>
          </aside>
        </div>
      </main>
    </CampaignChrome>
  );
}
