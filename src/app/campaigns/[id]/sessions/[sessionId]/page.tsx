import Link from "next/link";
import { notFound } from "next/navigation";
import { LiveDocEditor } from "@/components/live-doc-editor";
import { Panel } from "@/components/ui";
import { getGameSession } from "@/lib/actions";
import { deleteGameSessionAction } from "@/lib/fate-actions";
import {
  CampaignChrome,
  loadCampaignChrome,
} from "@/components/campaign-chrome";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const { session, membership, campaign, counts } =
    await loadCampaignChrome(id);
  const gameSession = await getGameSession(id, sessionId);
  if (!gameSession) notFound();

  async function deleteAction() {
    "use server";
    await deleteGameSessionAction(id, sessionId);
  }

  return (
    <CampaignChrome
      campaignId={id}
      campaignName={campaign.name}
      userName={session.user.name}
      userRole={membership.role}
      active="sessions"
      counts={counts}
    >
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 pb-16">
        <Link
          href={`/campaigns/${id}`}
          className="text-sm text-ink-soft hover:text-accent-deep"
        >
          ← Back to campaign
        </Link>
        <Panel className="mt-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Edit session notes
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Changes autosave and appear for other members within a couple
            seconds. Use Maps to pin who you met and where.
          </p>
          <div className="mt-5">
            <LiveDocEditor
              campaignId={id}
              docType="session"
              docId={sessionId}
              initialUpdatedAt={gameSession.updatedAt.getTime()}
              initialUpdatedByName={null}
              initialFields={{
                title: gameSession.title,
                sessionDate: gameSession.sessionDate ?? "",
                outline: gameSession.outline,
              }}
              fields={[
                { key: "title", label: "Title", kind: "text", required: true },
                { key: "sessionDate", label: "Session date", kind: "date" },
                {
                  key: "outline",
                  label: "Outline",
                  kind: "markdown",
                  rows: 16,
                },
              ]}
            />
          </div>
          <form action={deleteAction} className="mt-6 border-t border-line pt-4">
            <p className="text-xs text-ink-soft">
              Deleting removes this session from the Fate river and its
              appearance links.
            </p>
            <button
              type="submit"
              className="mt-3 rounded-lg border border-warn/40 px-4 py-2 text-sm text-warn hover:bg-warn/10"
            >
              Delete session
            </button>
          </form>
        </Panel>
      </main>
    </CampaignChrome>
  );
}
