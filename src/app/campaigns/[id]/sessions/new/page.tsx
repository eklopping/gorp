import Link from "next/link";
import { createGameSessionAction } from "@/lib/actions";
import { requireCampaignMember } from "@/lib/session";
import { CampaignNav } from "@/components/campaign-nav";
import { SiteHeader } from "@/components/site-header";
import { MarkdownField } from "@/components/markdown-field";
import { Button, Field, Panel } from "@/components/ui";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await requireCampaignMember(id);

  async function action(formData: FormData) {
    "use server";
    await createGameSessionAction(id, formData);
  }

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16">
        <Link
          href={`/campaigns/${id}`}
          className="text-sm text-ink-soft hover:text-accent-deep"
        >
          ← Back to campaign
        </Link>
        <CampaignNav campaignId={id} active="sessions" />
        <Panel className="mt-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            New session notes
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Capture the outline, then pin people and places on a map to record
            where you met them.
          </p>
          <form action={action} className="mt-5 space-y-4">
            <Field
              label="Title"
              name="title"
              required
              placeholder="Session 3 — The drowned market"
            />
            <Field label="Session date" name="sessionDate" type="date" />
            <MarkdownField
              label="Outline"
              name="outline"
              rows={12}
              placeholder="What happened, who they met, where they went…"
            />
            <Button>Create session</Button>
          </form>
        </Panel>
      </main>
    </>
  );
}
