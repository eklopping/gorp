import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGameSession,
  updateGameSessionAction,
} from "@/lib/actions";
import { requireCampaignMember } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { Button, Field, Panel } from "@/components/ui";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const { session } = await requireCampaignMember(id);
  const gameSession = await getGameSession(id, sessionId);
  if (!gameSession) notFound();

  async function action(formData: FormData) {
    "use server";
    await updateGameSessionAction(id, sessionId, formData);
  }

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-16">
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
            Any campaign member can update this outline.
          </p>
          <form action={action} className="mt-5 space-y-4">
            <Field
              label="Title"
              name="title"
              required
              defaultValue={gameSession.title}
            />
            <Field
              label="Session date"
              name="sessionDate"
              type="date"
              defaultValue={gameSession.sessionDate ?? undefined}
            />
            <Field
              label="Outline"
              name="outline"
              as="textarea"
              rows={16}
              defaultValue={gameSession.outline}
            />
            <Button>Save notes</Button>
          </form>
        </Panel>
      </main>
    </>
  );
}
