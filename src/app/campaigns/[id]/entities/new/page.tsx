import Link from "next/link";
import { CampaignNav } from "@/components/campaign-nav";
import { MarkdownField } from "@/components/markdown-field";
import { SiteHeader } from "@/components/site-header";
import { Button, Field, Panel } from "@/components/ui";
import { createEntityAction } from "@/lib/entity-actions";
import { requireCampaignMember } from "@/lib/session";

export default async function NewEntityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session } = await requireCampaignMember(id);

  async function action(formData: FormData) {
    "use server";
    await createEntityAction(id, formData);
  }

  return (
    <>
      <SiteHeader userName={session.user.name} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 pb-16">
        <Link
          href={`/campaigns/${id}/entities`}
          className="text-sm text-ink-soft hover:text-accent-deep"
        >
          ← Back to ID cards
        </Link>
        <CampaignNav campaignId={id} active="entities" />
        <Panel className="mt-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            New ID card
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Capture a person or place. You can pin it on a map later.
          </p>
          <form action={action} className="mt-5 space-y-4" encType="multipart/form-data">
            <label className="block text-sm text-ink-soft">
              <span className="font-medium text-ink">Type</span>
              <select
                name="type"
                required
                defaultValue="person"
                className="mt-1.5 w-full rounded-lg border border-line bg-paper-deep/40 px-3 py-2"
              >
                <option value="person">Person</option>
                <option value="place">Place</option>
              </select>
            </label>
            <Field label="Name" name="name" required placeholder="Mira of the Docks" />
            <Field label="Role" name="role" placeholder="Informant, harbor master, ruined temple…" />
            <Field label="Allegiance" name="allegiance" placeholder="City watch, no banner, the Ash Court…" />
            <MarkdownField
              label="Description"
              name="description"
              rows={5}
              placeholder="What the table should remember at a glance"
            />
            <MarkdownField
              label="Items of interest"
              name="itemsOfInterest"
              rows={3}
              placeholder="Relics, rumors, goods, secrets… (especially useful for places)"
            />
            <label className="block text-sm text-ink-soft">
              <span className="font-medium text-ink">Portrait / image</span>
              <input
                type="file"
                name="image"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="mt-1.5 block w-full text-sm"
              />
            </label>
            <Button>Create ID card</Button>
          </form>
        </Panel>
      </main>
    </>
  );
}
